#include <TimerOne.h>

#include <Process.h>
#include <DmxMaster.h>
Process nodejs;    // make a new Process for calling Node

void setup() {
  pinMode(13, OUTPUT);
  digitalWrite(13, LOW);
  Bridge.begin(); // Initialize the Bridge
  Serial.begin(9600);   // Initialize the Serial

  digitalWrite(13, HIGH);

  DmxMaster.write(1, 255);
  delay(1000);
  DmxMaster.write(1, 0);

  Timer1.initialize(40000);
  Timer1.attachInterrupt(handleAsync);
  // launch the echo.js script asynchronously:
  nodejs.runShellCommandAsynchronously("node /dmx/scripts/simpleDMX.js");

}

//volatile unsigned Fade[] currentFades; // use volatile for shared variables

//typedef struct Fade {
//  int channel;
//  int startValue;
//  int endValue;
//  int duration;
//};
//
//void handleAsync() {
//
//}

//long previousMillis = 0;
int timerInterval = 50;

int sensorValue = 0;
float variance = 0.96;

int newHigh = 0;
int counter = 0;
unsigned long lastBeatTime = 0;

volatile int fadeChannels[] = {0, 0, 0, 0};
volatile int fadeCurrentValues[] = {0, 0, 0, 0};
volatile int fadeEndValues[] = {0, 0, 0, 0};
volatile int fadeAmountToChange[] = {0, 0, 0, 0};

volatile int strobeChannels[] = {0, 0, 0, 0};
volatile int strobeStates[] = {0, 0, 0, 0};
volatile int strobeIntervals[] = {0, 0, 0, 0};
volatile int strobeRepetitions[] = {0, 0, 0, 0};

void handleAsync() {
  for (int i = 0; i < 4; i++) {
    if (fadeChannels[i] > 0) {
      int newValue = fadeCurrentValues[i] + fadeAmountToChange[i];
      if (newValue < 0) {
        newValue = 0;
      } else if (newValue > 255) {
        newValue = 255;
      }
      DmxMaster.write(fadeChannels[i], newValue);
      if ((fadeCurrentValues[i] < fadeEndValues[i] && (newValue > fadeEndValues[i] || newValue == fadeEndValues[i])) ||
          (fadeCurrentValues[i] > fadeEndValues[i] && (newValue < fadeEndValues[i] || newValue == fadeEndValues[i])) ) {
        fadeChannels[i] = 0;
      }
      fadeCurrentValues[i] = newValue;
    }

    if (strobeChannels[i] > 0) {
      if (strobeStates[i] == 0 || strobeStates[i] < 0) {
        if (strobeRepetitions[i] > 0) {
          strobeStates[i] = strobeIntervals[i];
          strobeRepetitions[i] = strobeRepetitions[i] - 1;
          DmxMaster.write(strobeChannels[i], 255);
        } else {
          strobeChannels[i] = 0;
        }
      } else {
        if (strobeStates[i] < strobeIntervals[i] - 10){
          DmxMaster.write(strobeChannels[i], 0);
        }
        strobeStates[i] = strobeStates[i] - timerInterval;
      }
    }
  }
}
int incomingAudio;


float historyBuffer[100];
int historyBufferIndex = 0;
float localEnergy = 0;
//float variance = 1.3;

void loop() {
  int i;
  float instantaneousEnergy = 0;
  int audioInput = 0;
  for (i=0; i<100; i++) {
    audioInput = analogRead(A0);
    instantaneousEnergy += sq(audioInput);
  }
  
  localEnergy = 0;
  for (i=0; i<100; i++) {
    localEnergy += historyBuffer[i];  
  }
  localEnergy = localEnergy / 100;
  
  variance = 0;
  for (i=0; i<100; i++) {
    long energyDiff = historyBuffer[i] - localEnergy;
    variance += sq(energyDiff);
  }
  variance = variance / 100;
  
  float c = ( -0.0025714 * variance ) + 1.5142857;
  
  unsigned long now = millis();
  if (instantaneousEnergy > localEnergy * 1.3 && now > (lastBeatTime + 100)) {
    Serial.print(localEnergy);
    Serial.print(" | ");
    Serial.print(c);
    Serial.print(" | ");
    Serial.print(variance);
    Serial.print(" | ");
    Serial.println(instantaneousEnergy);
    lastBeatTime = now;

    uint8_t line_buf[15] = "|Beat|";
      //uint8_t line_buf[6] = "|Beat|";
      //char beat[7] = {'|','B','e','a','t','|','\0'};
      for (int i = 0; i < 6; i++) {
        nodejs.write(line_buf[i]);
      }
      nodejs.write('\n');
      digitalWrite(13, HIGH);
  } else {
    digitalWrite(13, LOW);
  }
    
  //historyBufferSum = historyBufferSum - historyBuffer[historyBufferIndex] + instantaneousEnergy;
  historyBuffer[historyBufferIndex] = instantaneousEnergy;
  historyBufferIndex = (historyBufferIndex + 1) % 100;



 
//  unsigned long now = millis();
//  if (sensorValue > newHigh && sensorValue > 500) {
//    newHigh = sensorValue * variance;
//    counter = 0;
//    if (now > (lastBeatTime + 150)) {
//      Serial.println(sensorValue);
//      lastBeatTime = now;
//      uint8_t line_buf[15] = "|Beat|";
//      //uint8_t line_buf[6] = "|Beat|";
//      //char beat[7] = {'|','B','e','a','t','|','\0'};
//      for (int i = 0; i < 6; i++) {
//        nodejs.write(line_buf[i]);
//      }
//      nodejs.write('\n');
//      digitalWrite(13, HIGH);
//    }
//  } else {
//    digitalWrite(13, LOW);
//  }
//
//
//  counter = counter + 1;
//  if (counter > 250) {
//    counter = 0;
//    newHigh = newHigh * variance;
//  }


  // pass any bytes that come in from the serial port
  // to the running node process:
  if (Serial.available()) {
    Serial.println("Process Running");
    if (nodejs.running()) {
      nodejs.write(Serial.read());
    }
  }

  // pass any incoming bytes from the running node process
  // to the serial port:
  i = 0;
  String input = "";
  char character;
  while (nodejs.available()) {
    character = nodejs.read();
    input.concat(character);
  }
  if (input != "") {
    Serial.println("got input " + input);
    while (input.indexOf("|") > -1) {
      input = input.substring(input.indexOf("|") + 1);
      if (input.startsWith("dmx:set:")) {
        input = input.substring(input.indexOf("dmx:set:") + 8);
        int seperator = input.indexOf(":");
        int channel = input.substring(0, seperator).toInt();
        int value = input.substring(seperator + 1, input.length()).toInt();
        DmxMaster.write(channel, value);
        noInterrupts();
        for (int i = 0; i < 4; i++) {
          if (fadeChannels[i] == channel) {
            fadeChannels[i] = 0;
          }
          if (strobeChannels[i] == channel) {
            strobeChannels[i] = 0;
          }
        }
        interrupts();

      } else if (input.startsWith("dmx:fade:")) {
        input = input.substring(input.indexOf("dmx:fade:") + 9);
        int seperator = input.indexOf(":");
        int channel = input.substring(0, seperator).toInt();

        input = input.substring(seperator + 1);
        seperator = input.indexOf(":");
        int startValue = input.substring(0, seperator).toInt();

        input = input.substring(seperator + 1);
        seperator = input.indexOf(":");
        int endValue = input.substring(0, seperator).toInt();

        input = input.substring(seperator + 1);
        seperator = input.indexOf("|");
        int duration = input.substring(0, seperator).toInt();

        DmxMaster.write(channel, startValue);
        boolean written = false;
        noInterrupts();
        for (int i = 0; i < 4; i++) {
          if (fadeChannels[i] == channel) {
            fadeChannels[i] = 0;
          }
          if (strobeChannels[i] == channel) {
            strobeChannels[i] = 0;
          }
          if (!written && fadeChannels[i] == 0) {
            fadeChannels[i] = channel;
            fadeCurrentValues[i] = startValue;
            fadeEndValues[i] = endValue;
            fadeAmountToChange[i] =  (endValue - startValue) / (duration / timerInterval);
            written = true;
            //             Serial.print("wrote strobe:");
            //             Serial.print(strobeChannels[i]);
            //             Serial.print(":");
            //             Serial.print(strobeStates[i]);
            //             Serial.print(":");
            //             Serial.print(strobeIntervals[i]);
            //             Serial.print(":");
            //             Serial.print(strobeRepetitions[i]);
            //             Serial.print(":into:");
            //             Serial.print(i);
          }
        }
        interrupts();
      } else if (input.startsWith("dmx:strobe:")) {
        input = input.substring(input.indexOf("dmx:strobe:") + 11);
        int seperator = input.indexOf(":");
        int channel = input.substring(0, seperator).toInt();

        input = input.substring(seperator + 1);
        seperator = input.indexOf(":");
        int interval = input.substring(0, seperator).toInt();

        input = input.substring(seperator + 1);
        seperator = input.indexOf("|");
        int repetitions = input.substring(0, seperator).toInt();

        DmxMaster.write(channel, 255);
        boolean written = false;
        noInterrupts();
        for (int i = 0; i < 4; i++) {
          if (fadeChannels[i] == channel) {
            fadeChannels[i] = 0;
          }
          if (strobeChannels[i] == channel) {
            strobeChannels[i] = 0;
          }
          if (!written && strobeChannels[i] == 0) {
            strobeChannels[i] = channel;
            strobeStates[i] = 0;
            strobeIntervals[i] = interval;
            strobeRepetitions[i] = repetitions;
            //            Serial.print("wrote strobe:");
            //             Serial.print(strobeChannels[i]);
            //             Serial.print(":");
            //             Serial.print(strobeStates[i]);
            //             Serial.print(":");
            //             Serial.print(strobeIntervals[i]);
            //             Serial.print(":");
            //             Serial.print(strobeRepetitions[i]);
            //             Serial.print(":into:");
            //             Serial.print(i);
            written = true;
          }
        }
        interrupts();
      } else if (input.startsWith("dmx:black")) {
        int i=0;
        noInterrupts();
        for(i=0; i<4; i++) {
          fadeChannels[i] = 0;
          strobeChannels[i] = 0;
        }
        interrupts();
        for(int i=1; i<255; i++) {
          DmxMaster.write(i, 0);       
        }  
      }
      input = input.substring(input.indexOf("|") + 1);
    }
  }
}
