var strings = require('querystring');
var shortId = require('shortid');

var Program = require('./Program.js');
var BackupService = require('./BackupService.js');
var Executor = require('./Executor.js');

var executor = new Executor();
var backupService = new BackupService();

var ProgramControl = module.exports = function ProgramControl() {
    var programControl = this;

    backupService.restoreProgramList();

    var progCount = 0;
    for (var id in backupService.programList) {
        if (backupService.programList.hasOwnProperty(id)) {
            progCount++;
        }
    }
    if (progCount == 0) {
        backupService.restoreDefaults();
    }

    programControl.programIsRunning = false;
    programControl.currentProgram = new Program();
    programControl.runningProgramUID = null;
    programControl.nextBeatCallback = null;

    return programControl;
};


ProgramControl.prototype.storeProgram = function(newProgram) {
    if (!newProgram.id) {
        newProgram.id = shortId.generate();
    }
    backupService.programList[newProgram.id] = newProgram;

    setTimeout(backupService.backupProgramList, 10);
    return newProgram.id;
};

ProgramControl.prototype.processCommand = function (request, response, data) {
    var urlStrings = strings.parse(request.url),
        programControl = this,
        id,
        newProgram;
    global.logIt("Received command " + request.url + " with data " + data);
    var command = (request.url.indexOf("?") > -1) ? request.url.split("?")[0] : request.url;
    if (command == "/fade") {
        var startValue = urlStrings.startValue;
        if (!startValue) {
            startValue = executor.lastKnownValues[urlStrings.channel] || 0;
        }
        global.logIt("calling fade channel=" + urlStrings.channel + " startVal=" + startValue +
        " endVal=" + urlStrings.endValue + " startTime=" + new Date().getTime() + " endTime=" + new Date().getTime() + parseInt(urlStrings.duration));
        executor.fade(urlStrings.channel, startValue, urlStrings.endValue, new Date().getTime(), new Date().getTime() + parseInt(urlStrings.duration));
    } else if (command == "/set") {
        global.logIt("value = " + urlStrings.value + " and channel = " + urlStrings.channel);
        executor.writeToDmx(urlStrings.channel, urlStrings.value);
    } else if (command == "/runProgram") {
        if (data) {
            global.logIt("got data");
            try {
                newProgram = JSON.parse(data);
                if (typeof newProgram == "object") {
                    id = backupService.storeProgram(newProgram);
                } else {
                    id = data;
                }
                programControl.currentProgram = backupService.sto[id];
                global.logIt("loaded new Program");
            } catch (e) {
                global.logIt("Error Parsing Program" + e);
                programControl.currentProgram = new Program();
            }
        }

        var tempo = urlStrings.tempo;
        if (tempo > 0) {
            programControl.currentProgram.tempo = tempo;
        }
        var beatDetection = urlStrings.beatDetection;
        if (beatDetection != null && beatDetection != undefined) {
            programControl.currentProgram.beatDetectionEnabled = (beatDetection == "true");
        }
        programControl.runProgram(programControl.currentProgram);
    } else if (command == "/stopProgram") {
        programControl.stopProgram();
    } else if (command == "/storeProgram") {
        if (data) {
            newProgram = JSON.parse(data);
            id = programControl.storeProgram(newProgram);
            return JSON.stringify({id:id});
        }
    } else if (command == "/getPrograms") {
        return JSON.stringify(backupService.programList);
    } else if (command == "/deleteProgram") {
        if (data) {
            var dataObj= JSON.parse(data);
            if (dataObj) {
                id = dataObj.id;
                for (var progId in backupService.programList) {
                    if (backupService.programList.hasOwnProperty(progId) && id == progId) {
                        delete backupService.programList[progId];
                        return;
                    }
                }
            }
        }
    } else if (command == "/blackout") {
        programControl.programIsRunning = false;
        executor.blackout();
    } else if (command == "/saveDefaults") {
        backupService.saveDefaults();
    } else if (command == "/restoreDefaults") {
        backupService.restoreDefaults();
    } else if (command == "/setThreshold") {
        programControl.setThreshold(urlStrings.value);
        return JSON.stringify({threshold: executor.threshold});
    } else if (command == "/getThreshold") {
        return JSON.stringify({threshold: executor.threshold});
    }
};

ProgramControl.prototype.stopProgram = function() {
    this.programIsRunning = false;
};

ProgramControl.prototype.runProgram = function(program) {
    var programControl = this;
    global.logIt("Starting to run the program");
    programControl.programIsRunning = true;
    programControl.currentProgram = program;
    programControl.runningProgramUID = shortId.generate();
    if (program.beatDetectionEnabled) {

    }
    programControl.executeProgram(1, programControl.runningProgramUID);
};

ProgramControl.prototype.executeProgram = function(beat, currentProgramUID) {
    var programControl = this;
    if (programControl.programIsRunning && programControl.currentProgram && currentProgramUID == programControl.runningProgramUID) {
        global.logIt(beat);
        for (var i = 0; i < programControl.currentProgram.lights.length; i++) {
            executor.executeCommand(programControl.currentProgram.lights[i].eventLoop[beat - 1], programControl.currentProgram.lights[i].channel, programControl.currentProgram.tempo);
        }
        if(programControl.currentProgram.beatDetectionEnabled) {
            programControl.nextBeatCallback = function () {
                programControl.executeProgram(((beat) % programControl.currentProgram.lengthInBeats) + 1, currentProgramUID);
            };
        } else {
            setTimeout(function () {
                programControl.executeProgram(((beat) % programControl.currentProgram.lengthInBeats) + 1, currentProgramUID);
            }, executor.getCurrentBeatDuration());
        }
    }
};

ProgramControl.prototype.triggerBeatInProgram = function() {
    var programControl = this;
    if (typeof programControl.nextBeatCallback === "function") {
        programControl.nextBeatCallback.call();
    }
};

