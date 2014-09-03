

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
        }
    ];

    $scope.trash = [null];
    $scope.clearTrash = function () {
        $scope.trash = [null];
    };

    $scope.onChangeLengthInBeats = function () {
        if ($scope.config && $scope.config.lights) {
            for(var i=0; i<$scope.config.lights.length; i++) {
                var light = $scope.config.lights[i];
                if (light.eventLoop.length > $scope.config.lengthInBeats) {
                    light.eventLoop.splice($scope.config.lengthInBeats, light.eventLoop.length - $scope.config.lengthInBeats);
                } else if (light.eventLoop.length < $scope.config.lengthInBeats) {
                    for (var j=light.eventLoop.length; j< $scope.config.lengthInBeats; j++) {
                        light.eventLoop[j] = null;
                    }
                }
            }
        }
    };

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