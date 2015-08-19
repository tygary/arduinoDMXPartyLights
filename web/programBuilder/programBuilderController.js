
/*
Disco Ball DMX Protocol

Ch1
0-70    automatic
71-140  Sound Control
141-210 DMX512 Control  (CH 2-5)
211-255 Start DMX (Ch 6)

Ch2
0-255   Green Light brightness

Ch3
0-255   Blue Light brightness

Ch4
0-255   Red Light Brightness

Ch5
0-255   Rotation Speed adjustment (0->stop)

Ch6
0-255   Flash Speed adjustment



Ideas for the Disco control:

Mode selector:
    Automatic
    Sound control
    Manual


Manual only:

Color selector
    Select X-Y axis of colors, translate to RGB values

Rotation control Slider

Strobe Control Slider




Event:
type: "disco"
mode: "auto|sound|manual"
color: hexCode
rotation: number
strobe: number







Each Light has a base channel and a type

Types: Dimmer, Discoball, RGBDimmer



 */



lightingControllers.controller('programBuilderController', function($scope, $rootScope, $location, dmxService) {

    $scope.saveProgram = function () {
        dmxService.saveProgram($scope.config);
        $rootScope.currentProgram = $scope.config;
        $scope.goHome();
    };

    $scope.deleteProgram = function () {
        if ($scope.config.id) {
            dmxService.deleteProgram($scope.config.id);
        }
        $scope.goHome();
    };

    $scope.runProgram = function () {
        dmxService.saveProgram($scope.config).then(function (id){
            $scope.config.id = id;
            dmxService.runProgram($scope.config);
        });
    };

    $scope.goHome = function () {
        $location.path("/home");
    };

    $scope.lightTypes = [
        {
            name: "Dimmer",
            value: "dimmer"
        },
        {
            name: "Disco Ball",
            value: "disco"
        },
        {
            name: "RGB Dimmer",
            value: "rgb"
        }
    ];

    $scope.discoModes = [
        {
            name: "Auto",
            value: "auto"
        },
        {
            name: "Sound",
            value: "sound"
        },
        {
            name: "Manual",
            value: "manual"
        }
    ];

    $scope.newEvents = [
        {
            type: "set",
            value: 255
        },
        {
            type: "fade",
            startValue: 0,
            endValue: 255,
            durationInBeats: 1
        },
        {
            type: "strobe",
            intervalInBeats: 1,
            durationInBeats: 1
        },
        {
            type: "disco",
            mode: "",
            intervalInBeats: 1,
            durationInBeats: 1
        }
    ];

    $scope.onChangeLightType = function(light) {
        if (light.type === "disco") {
            if (!light.mode) {
                light.mode = "manual";
            }
            if (!light.redLoop) {
                light.redLoop = updateArrayLength([]);
            }
            if (!light.greenLoop) {
                light.greenLoop = updateArrayLength([]);
            }
            if (!light.blueLoop) {
                light.blueLoop = updateArrayLength([]);
            }
        }
    };

    $scope.trash = [null];
    $scope.clearTrash = function () {
        $scope.trash = [null];
    };

    $scope.onChangeLengthInBeats = function () {
        if ($scope.config && $scope.config.lights) {
            for(var i=0; i<$scope.config.lights.length; i++) {
                var light = $scope.config.lights[i];
                
                light.eventLoop = updateArrayLength(light.eventLoop);
                
                if (light.type === "disco" && light.mode === "manual") {
                    light.redLoop = updateArrayLength(light.redLoop);
                    light.greenLoop = updateArrayLength(light.greenLoop);
                    light.blueLoop = updateArrayLength(light.blueLoop);
                }
            }
        }
    };
    
    function updateArrayLength(array) {
        if (array.length > $scope.config.lengthInBeats) {
            array.splice($scope.config.lengthInBeats, array.length - $scope.config.lengthInBeats);
        } else if (array.length < $scope.config.lengthInBeats) {
            for (var j=array.length; j< $scope.config.lengthInBeats; j++) {
                array[j] = null;
            }
        }
        return array;
    }

    $scope.$watch("config.lengthInBeats", $scope.onChangeLengthInBeats);

    $scope.removeChannel = function (lightIndex) {
        $scope.config.lights.splice(lightIndex, 1);
    };

    $scope.addChannel = function () {
        var newChannel = {
            channel: 0,
            eventLoop: []
        };
        for (var i=0; i<$scope.config.lengthInBeats; i++) {
            newChannel.eventLoop.push(null);
        }
        $scope.config.lights.push(newChannel);
    };

    $scope.currentEvent = null;

    $scope.onEventClick = function (event) {
        //var event = $scope.config.lights[lightIndex].eventLoop[eventIndex];
        $scope.currentEvent = event;
    };

    $scope.config = $rootScope.currentProgram;
    var watchDestructor = $rootScope.$watch("currentProgram", function () {
        $scope.config = $rootScope.currentProgram;
    });

    $scope.$on("$destroy", function () {
        watchDestructor();
    });


    $scope.channelOptions = [];
    for (var i=1; i< 255; i++){
        $scope.channelOptions.push({name: i,value:i});
    }
});