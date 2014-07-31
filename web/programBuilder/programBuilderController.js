

lightingControllers.controller('programBuilderController', function($scope) {

    $scope.config = {
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






});