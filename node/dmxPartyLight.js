var loggingEnabled = true;
logIt("Hello Arduino");       // send an intial message on startup

var lastKnownValues = {};

var strings = require('querystring');
var http = require('http');
http.createServer(function(request, response) {
    if (request.method === 'OPTIONS') {
        console.log('!OPTIONS');
        var headers = {};
        // IE8 does not allow domains to be specified, just the *
        // headers["Access-Control-Allow-Origin"] = req.headers.origin;
        headers["Access-Control-Allow-Origin"] = "*";
        headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
        headers["Access-Control-Allow-Credentials"] = false;
        headers["Access-Control-Max-Age"] = '86400'; // 24 hours
        headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
        request.writeHead(204, headers);
        request.end();
    } else if(request.method == 'POST') {
        processPost(request, response, function() {
            logIt(request.post);
            // Use request.post here
            processCommand(request, response, request.post);
            response.writeHead(200, "OK", {
                'Content-Type': 'text/html; charset=UTF-8',
                'Transfer-Encoding': 'chunked',
                'Access-Control-Allow-Origin': "*",
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
                'Access-Control-Allow-Headers': 'X-Requested-With,content-type',
                "access-control-max-age": 10 // Seconds.
            });
            response.end();
        });
    } else {
      processCommand(request, response, null);
      response.writeHead(200, "OK", {
          'Content-Type': 'text/html; charset=UTF-8',
          'Transfer-Encoding': 'chunked',
          'Access-Control-Allow-Origin': "*",
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
          'Access-Control-Allow-Headers': 'X-Requested-With,content-type',
          "access-control-max-age": 10 // Seconds.
      });
      response.end();
    }
}).listen(8080);


function processCommand(request, response, data) {
  var urlStrings = strings.parse(request.url);
  response.write("<html><body>Received Command</body></html>");
  logIt("Received command " + request.url + " with data " + data);
  var command = (request.url.indexOf("?") > -1)?request.url.split("?")[0]:request.url;
  if (command == "/fade") {
    var startValue = urlStrings.startValue;
    if (!startValue) {
      startValue = lastKnownValues[urlStrings.channel] || 0;
    }
    logIt("calling fade channel=" + urlStrings.channel + " startVal="+ startValue +
      " endVal="+ urlStrings.endValue + " startTime="+ new Date().getTime() + " endTime="+ new Date().getTime() + parseInt(urlStrings.duration) );
    fade(urlStrings.channel, startValue, urlStrings.endValue, new Date().getTime(), new Date().getTime() + parseInt(urlStrings.duration));
  } else if (command == "/set"){
    logIt("value = " + urlStrings.value + " and channel = " + urlStrings.channel);
    writeToDmx(urlStrings.channel, urlStrings.value);
  } else if (command == "/runProgram") {
    if (data) {
      logIt("got data")
      try {
        var newProgram = JSON.parse(data);
        currentProgram = newProgram;
        logIt("loaded new Program");
      } catch(e) {
        logIt("Error Parsing Program" + e);
        currentProgram = defaultProgram;
      }
    }

    var tempo = urlStrings.tempo;
    if (tempo > 0) {
      currentProgram.tempo = tempo;
    }
    runProgram(currentProgram);
  } else if (command == "/stopProgram") {
    stopProgram();
  }
}

var programIsRunning = false;
var defaultProgram = {
  tempo: 120,
  lengthInBeats: 8,
  lights: [
    {
      channel: 1,
      eventLoop: [
        {
          type: "fade",
          startValue: 0,
          endValue: 255,
          //duration: 2000
          durationInBeats: 4
        },
        null,
        null,
        null,
        {
          type: "fade",
          startValue: 255,
          endValue: 0,
          //duration: 2000
          durationInBeats: 4
        },
        null,
        null,
        null
      ]
    },
    {
      channel: 2,
      eventLoop: [
        {
          type: "set",
          value: 255
        },
        {
          type: "set",
          value: 0
        },
        null,
        null,
        {
          type: "set",
          value: 255
        },
        {
          type: "set",
          value: 0
        },
        null,
        null
      ]
    }
  ]
};
var currentProgram = defaultProgram;

function stopProgram() {
  programIsRunning = false;
}


function runProgram(program) {
  logIt("Starting to run the program");
  programIsRunning = true;
  currentProgram = program;
  executeProgram(1);
}

function executeProgram(beat) {
  if (programIsRunning && currentProgram) {
    logIt(beat);
    for (var i=0; i< currentProgram.lights.length; i++) {
      executeCommand(currentProgram.lights[i].eventLoop[beat-1], currentProgram.lights[i].channel);
    }
    setTimeout(function() {
      executeProgram(((beat) % currentProgram.lengthInBeats) + 1);
    }, getCurrentBeatDuration());
  }
}

function executeCommand(command, channel) {
  if (command != null && typeof command === "object") {
    logIt("executing command " + command.type);
    if (command.type === "set") {
      writeToDmx(channel, command.value);
    } else if (command.type === "fade") {
      fadeInTempo(channel, command.startValue, command.endValue, currentProgram.tempo, command.durationInBeats);
    }
  }
}

function getCurrentBeatDuration () {
  return 1/(currentProgram.tempo/(60*1000));
}

function getTime(millisecondsFromNow) {
  return new Date().getTime() + ((millisecondsFromNow > 0)?millisecondsFromNow:0);
}

function fadeInTempo(channel, startValue, endValue, tempo, numBeats) {
  fade(channel, startValue, endValue, getTime(), getTime(getCurrentBeatDuration() * numBeats))
}

function fade(channel, startValue, endValue, startTime, endTime) {
  if (!(startValue > 0)) {
    startValue = 0;
  }
  var waitTime = 50;
  var curTime = new Date().getTime();
  var percentDone = (curTime-startTime)/(endTime-startTime);
  var curValue = Math.round(startValue + ((endValue - startValue) * percentDone));
  writeToDmx(channel, curValue);
  if (curTime < endTime) {
      setTimeout(function(){
        fade(channel, startValue, endValue, startTime, endTime);
      }, waitTime);
  }
}

function writeToDmx(channel, value) {
  lastKnownValues[channel] = value;
  if (value > 255) {
    value = 255;
  } else if (value < 0) {
    value = 0;
  }
  console.log('|dmx:' + channel + ":" + value + "|");
}


function processPost(request, response, callback) {
    var queryData = "";
    if(typeof callback !== 'function') {
      return null;
    }
    if(request.method == 'POST') {
        request.on('data', function(data) {
            queryData += data;
            if(queryData.length > 1e6) {
                queryData = "";
                response.writeHead(413, {'Content-Type': 'text/plain'}).end();
                request.connection.destroy();
            }
        });

        request.on('end', function() {
            request.post = queryData;
            callback();
        });

    } else {
        response.writeHead(405, {'Content-Type': 'text/plain'});
        response.end();
    }
}
function logIt(message) {
  if (loggingEnabled) {
    console.log(message);
  }
}



