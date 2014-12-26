
var Executor = module.exports = function Executor() {
    var executor = this;

    executor.lastKnownValues = {};
    executor.threshold = 650;

    return executor;
};

Executor.prototype.executeCommand = function (command, channel, tempo) {
    var executor = this;
    if (command != null && typeof command === "object") {
        global.logIt("executing command " + command.type);
        if (command.type === "set") {
            executor.writeToDmx(channel, command.value);
        } else if (command.type === "fade") {
            executor.fadeInTempo(channel, command.startValue, command.endValue, tempo, command.durationInBeats);
        } else if (command.type === "strobe") {
            executor.strobe(channel, command.intervalInBeats, command.durationInBeats, tempo);
        }
    }
};



Executor.prototype.strobe = function(channel, intervalInBeats, durationInBeats, tempo) {
    var executor = this;
    var interval = intervalInBeats * executor.getCurrentBeatDuration(tempo);
    var repetitions = durationInBeats / intervalInBeats;
    console.log('|dmx:strobe:' + channel + ":" + interval + ":" + repetitions + "|");
};

Executor.prototype.fadeInTempo = function(channel, startValue, endValue, tempo, numBeats) {
    var executor = this;
    if (!startValue) {
        startValue = 0;
    }
    var duration = numBeats* executor.getCurrentBeatDuration(tempo);
    console.log('|dmx:fade:' + channel + ":" + startValue + ":" + endValue + ":" + duration + "|");
    //fade(channel, startValue, endValue, getTime(), getTime(getCurrentBeatDuration() * numBeats))
};

Executor.prototype.fade = function(channel, startValue, endValue, startTime, endTime) {
    var executor = this;
    if (!(startValue > 0)) {
        startValue = 0;
    }
    var waitTime = 50;
    var curTime = new Date().getTime();
    var percentDone = (curTime - startTime) / (endTime - startTime);
    var curValue = Math.round(startValue + ((endValue - startValue) * percentDone));
    executor.writeToDmx(channel, curValue);
    if (curTime < endTime) {
        setTimeout(function () {
            fade(channel, startValue, endValue, startTime, endTime);
        }, waitTime);
    }
};

Executor.prototype.blackout = function() {
    console.log("|dmx:black|");
};

Executor.prototype.writeToDmx = function(channel, value) {
    var executor = this;
    executor.lastKnownValues[channel] = value;
    if (value > 255) {
        value = 255;
    } else if (value < 0) {
        value = 0;
    }
    console.log('|dmx:set:' + channel + ":" + value + "|");
};

Executor.prototype.setThreshold = function(value) {
    var executor = this;
    value = parseInt(value);
    if (typeof value === "number" && value > 0) {
        executor.threshold = value;
        console.log("|dmx:thresh:"+ value +"|");
    }
};

Executor.prototype.getCurrentBeatDuration = function(tempo) {
    return 1 / (tempo / (60 * 1000));
};

function getTime(millisecondsFromNow) {
    return new Date().getTime() + ((millisecondsFromNow > 0) ? millisecondsFromNow : 0);
}
