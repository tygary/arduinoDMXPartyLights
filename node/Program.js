
var Program = module.exports = function Program() {
    var program = this;

    program.tempo = Program.defaultProgram.tempo;
    program.beatDetectionEnabled = Program.defaultProgram.beatDetectionEnabled;
    program.lengthInBeats = Program.defaultProgram.lengthInBeats;
    program.lights = clone(Program.defaultProgram.lights);

    return program;
};

Program.defaultProgram = {
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

function clone(a) {
    return JSON.parse(JSON.stringify(a));
}
