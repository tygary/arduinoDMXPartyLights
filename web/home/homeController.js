

lightingControllers.controller('homeController', function($scope, dmxService) {

    $scope.dmx = dmxService;
    $scope.runTheProgram = function () {
        dmxService.runProgram();
    };
    $scope.stopTheProgram = function () {
        dmxService.stopProgram();
    };
    $scope.blackout = function () {
        dmxService.turnOffAllLights();
    };

    $scope.editProgram = function(){
        d
    };


    $scope.currentProgram = JSON.stringify({
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
    });
});