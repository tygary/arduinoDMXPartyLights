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

  // launch the echo.js script asynchronously:
  nodejs.runShellCommandAsynchronously("node /dmx/scripts/simpleDMX.js");

}

void loop() {
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
  int i=0;
  String input = "";
  char character;
  while(nodejs.available()) {
      character = nodejs.read();
      input.concat(character);
  }
  if (input != "") {
    Serial.println("got input " + input);
    while (input.indexOf("|") > -1) {
      input = input.substring(input.indexOf("|") + 1);
      if (input.startsWith("dmx:")) {
        input = input.substring(input.indexOf("dmx:") + 4);
        int seperator = input.indexOf(":");
        int channel = input.substring(0, seperator).toInt();
        int value = input.substring(seperator + 1, input.length()).toInt();
        DmxMaster.write(channel, value);
      }
      input = input.substring(input.indexOf("|")+1);
    }   
  }
}
