var loggingEnabled = false;

process.on
(
    'uncaughtException',
    function (err)
    {
        var log = err.stack;


        // print note to console
        console.log("SERVER CRASHED!");
        console.log(log);


        // save log to timestamped logfile
        var filename = "crash_" + formatDate(new Date) + ".log";
        console.log("LOGGING ERROR TO "+filename);
        var fs = require('fs');
        if (!fs.existsSync("/logs")) {
            fs.mkdirSync("/logs");
        }
        fs.writeFile('/logs/'+filename, log);
    }
);


logIt("Hello Arduino");       // send an intial message on startup

var lastKnownValues = {};

var strings = require('querystring');
var http = require('http');
var shortId = require('shortid');
var fs = require('fs');
var readline = require('readline'); // include the readline module

// create an interface to read lines from the Arduino:
var lineReader = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

// when you get a newline in the stdin (ends with \n),
// send a reply out the stdout:
lineReader.on('line', function (data) {
    if (data.indexOf("|Beat|") > -1) {
        triggerBeatInProgram();
    }
});

http.createServer(function (request, response) {
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
        response.writeHead(204, headers);
        response.end();
    } else if (request.method == 'POST') {
        processPost(request, response, function () {
            logIt(request.post);
            response.writeHead(200, "OK", {
                'Content-Type': 'application/json; charset=UTF-8',
//                'Transfer-Encoding': 'chunked',
//                'Content-Length': "",
                'Access-Control-Allow-Origin': "*",
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
                'Access-Control-Allow-Headers': 'X-Requested-With,content-type',
                "access-control-max-age": 10 // Seconds.
            });
            var returnData = processCommand(request, response, request.post);
            if (returnData) {
                response.write(returnData + '');
            }
            response.end("\r\n");
        });
    } else {
        response.writeHead(200, "OK", {
            'Content-Type': 'application/json; charset=UTF-8',
//            'Transfer-Encoding': 'chunked',
//            'Content-Length': "",
            'Access-Control-Allow-Origin': "*",
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
            'Access-Control-Allow-Headers': 'X-Requested-With,content-type',
            "access-control-max-age": 10 // Seconds.
        });
        var returnData = processCommand(request, response, null);
        if (returnData) {
            response.write(returnData + '');
        }
        response.end();
    }
}).listen(8080);


function processCommand(request, response, data) {
    var urlStrings = strings.parse(request.url);
    var id, newProgram;
    logIt("Received command " + request.url + " with data " + data);
    var command = (request.url.indexOf("?") > -1) ? request.url.split("?")[0] : request.url;
    if (command == "/fade") {
        var startValue = urlStrings.startValue;
        if (!startValue) {
            startValue = lastKnownValues[urlStrings.channel] || 0;
        }
        logIt("calling fade channel=" + urlStrings.channel + " startVal=" + startValue +
            " endVal=" + urlStrings.endValue + " startTime=" + new Date().getTime() + " endTime=" + new Date().getTime() + parseInt(urlStrings.duration));
        fade(urlStrings.channel, startValue, urlStrings.endValue, new Date().getTime(), new Date().getTime() + parseInt(urlStrings.duration));
    } else if (command == "/set") {
        logIt("value = " + urlStrings.value + " and channel = " + urlStrings.channel);
        writeToDmx(urlStrings.channel, urlStrings.value);
    } else if (command == "/runProgram") {
        if (data) {
            logIt("got data");
            try {
                newProgram = JSON.parse(data);
                if (typeof newProgram == "object") {
                    id = storeProgram(newProgram);
                } else {
                    id = data;
                }
                currentProgram = programList[id];
                logIt("loaded new Program");
            } catch (e) {
                logIt("Error Parsing Program" + e);
                currentProgram = defaultProgram;
            }
        }

        var tempo = urlStrings.tempo;
        if (tempo > 0) {
            currentProgram.tempo = tempo;
        }
        var beatDetection = urlStrings.beatDetection;
        if (beatDetection != null && beatDetection != undefined) {
            currentProgram.beatDetectionEnabled = (beatDetection == "true");
        }
        runProgram(currentProgram);
    } else if (command == "/stopProgram") {
        stopProgram();
    } else if (command == "/storeProgram") {
        if (data) {
            newProgram = JSON.parse(data);
            id=storeProgram(newProgram);
            return JSON.stringify({id:id});
        }
    } else if (command == "/getPrograms") {
        return JSON.stringify(programList);
    } else if (command == "/deleteProgram") {
        if (data) {
            var dataObj= JSON.parse(data);
            if (dataObj) {
                id = dataObj.id;
                for (var progId in programList) {
                    if (id == progId) {
                        delete programList[progId];
                        return;
                    }
                }
            }
        }
    } else if (command == "/blackout") {
        blackout();
    } else if (command == "/saveDefaults") {
        saveDefaults();
    } else if (command == "/restoreDefaults") {
        restoreDefaults();
    } else if (command == "/setThreshold") {
        setThreshold(urlStrings.value);
        return JSON.stringify({threshold: threshold});
    } else if (command == "/getThreshold") {
        return JSON.stringify({threshold: threshold});
    }
}

var threshold = 650;
function setThreshold(value) {
    value = parseInt(value);
    if (typeof value === "number" && value > 0) {
        threshold = value;
        console.log("|dmx:thresh:"+ value +"|");
    }
}

function storeProgram(newProgram) {
    if (!newProgram.id) {
        newProgram.id = shortId.generate();
    }
    programList[newProgram.id] = newProgram;

    setTimeout(backupProgramList, 10);
    return newProgram.id;
}

var backupFilePath = "/dmx/storage/programBackup.json";
var defaultsFilePath = "/dmx/storage/defaultPrograms.json";

function backupProgramList() {
    var buffer = new Buffer(JSON.stringify(programList));
    if (fs.existsSync(backupFilePath)) {
        fs.unlinkSync(backupFilePath);
    } else {
        if (!fs.existsSync("/dmx")) {
            fs.mkdirSync("/dmx");
        }
        if (!fs.existsSync("/dmx/storage")) {
            fs.mkdirSync("/dmx/storage");
        }
    }
    fs.open(backupFilePath, 'w', function(err, fd) {
        if (err) {
            console.log("Failed opening file: " + err);
        } else {
            fs.write(fd, buffer, 0, buffer.length, null, function(err) {
                if (err) throw 'error writing file: ' + err;
                fs.close(fd)
            });
        }
    });
}

function restoreProgramList() {
    fs.readFile(backupFilePath, 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        } else {
            programList = JSON.parse(data);
        }
    });
}

function saveDefaults() {
    backupProgramList();
    var buffer = new Buffer(JSON.stringify(programList));
    fs.open(defaultsFilePath, 'w', function(err, fd) {
        if (err) {
            console.log("Failed opening file: " + err);
        } else {
            fs.write(fd, buffer, 0, buffer.length, null, function(err) {
                if (err) throw 'error writing file: ' + err;
                fs.close(fd)
            });
        }
    });
}

function restoreDefaults() {
    fs.readFile(defaultsFilePath, 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        } else {
            programList = JSON.parse(data);
            backupProgramList();
        }
    });
}


var programList = {};

restoreProgramList();
var progCount = 0;
for (var id in programList) {
    if (programList.hasOwnProperty(id)) {
        progCount++;
    }
}
if (progCount == 0) {
    restoreDefaults();
}

var programIsRunning = false;
var defaultProgram = {
    tempo: 120,
    beatDetectionEnabled: false,
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
var runningProgramUID;

function stopProgram() {
    programIsRunning = false;
}


function runProgram(program) {
    logIt("Starting to run the program");
    programIsRunning = true;
    currentProgram = program;
    runningProgramUID = shortId.generate();
    if (program.beatDetectionEnabled) {

    }
    executeProgram(1, runningProgramUID);
}

var nextBeatCallback;

function executeProgram(beat, currentProgramUID) {
    if (programIsRunning && currentProgram && currentProgramUID == runningProgramUID) {
        logIt(beat);
        for (var i = 0; i < currentProgram.lights.length; i++) {
            executeCommand(currentProgram.lights[i].eventLoop[beat - 1], currentProgram.lights[i].channel);
        }
        if(currentProgram.beatDetectionEnabled) {
            nextBeatCallback = function () {
                executeProgram(((beat) % currentProgram.lengthInBeats) + 1, currentProgramUID);
            };
        } else {
            setTimeout(function () {
                executeProgram(((beat) % currentProgram.lengthInBeats) + 1, currentProgramUID);
            }, getCurrentBeatDuration());
        }
    }
}

function executeCommand(command, channel) {
    if (command != null && typeof command === "object") {
        logIt("executing command " + command.type);
        if (command.type === "set") {
            writeToDmx(channel, command.value);
        } else if (command.type === "fade") {
            fadeInTempo(channel, command.startValue, command.endValue, currentProgram.tempo, command.durationInBeats);
        } else if (command.type === "strobe") {
            strobe(channel, command.intervalInBeats, command.durationInBeats);
        }
    }
}

function triggerBeatInProgram() {
    if (typeof nextBeatCallback === "function") {
        nextBeatCallback.call();
    }
}

function getCurrentBeatDuration() {
    return 1 / (currentProgram.tempo / (60 * 1000));
}

function getTime(millisecondsFromNow) {
    return new Date().getTime() + ((millisecondsFromNow > 0) ? millisecondsFromNow : 0);
}

function strobe(channel, intervalInBeats, durationInBeats) {
    var interval = intervalInBeats * getCurrentBeatDuration();
    var repetitions = durationInBeats / intervalInBeats;
    console.log('|dmx:strobe:' + channel + ":" + interval + ":" + repetitions + "|");

//    writeToDmx(channel, 255);
//    setTimeout(function () {
//        writeToDmx(channel, 0);
//    }, 100);
//
//    if (durationInBeats - intervalInBeats > 0) {
//        setTimeout(function() {
//            strobe(channel, intervalInBeats, durationInBeats - intervalInBeats)
//        }, getCurrentBeatDuration() * intervalInBeats);
//    }
}

function fadeInTempo(channel, startValue, endValue, tempo, numBeats) {
    if (!startValue) {
        startValue = 0;
    }
    var duration = numBeats* getCurrentBeatDuration();
    console.log('|dmx:fade:' + channel + ":" + startValue + ":" + endValue + ":" + duration + "|");
    //fade(channel, startValue, endValue, getTime(), getTime(getCurrentBeatDuration() * numBeats))
}

function fade(channel, startValue, endValue, startTime, endTime) {
    if (!(startValue > 0)) {
        startValue = 0;
    }
    var waitTime = 50;
    var curTime = new Date().getTime();
    var percentDone = (curTime - startTime) / (endTime - startTime);
    var curValue = Math.round(startValue + ((endValue - startValue) * percentDone));
    writeToDmx(channel, curValue);
    if (curTime < endTime) {
        setTimeout(function () {
            fade(channel, startValue, endValue, startTime, endTime);
        }, waitTime);
    }
}

function blackout() {
    stopProgram();
    console.log("|dmx:black|");
}

function writeToDmx(channel, value) {
    lastKnownValues[channel] = value;
    if (value > 255) {
        value = 255;
    } else if (value < 0) {
        value = 0;
    }
    console.log('|dmx:set:' + channel + ":" + value + "|");
}


function processPost(request, response, callback) {
    var queryData = "";
    if (typeof callback !== 'function') {
        return null;
    }
    if (request.method == 'POST') {
        request.on('data', function (data) {
            queryData += data;
            if (queryData.length > 1e6) {
                queryData = "";
                response.writeHead(413, {'Content-Type': 'text/plain'}).end();
                request.connection.destroy();
            }
        });

        request.on('end', function () {
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



