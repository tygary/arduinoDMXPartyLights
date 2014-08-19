

lightingControllers.controller('homeController', function($scope, $rootScope, dmxService, $location) {
    $scope.root = $rootScope;
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

    $scope.startPerformance = function () {
        $location.path("/perform");
    };

    $scope.editProgram = function(program){
        if (program) {
            $rootScope.currentProgram = program;
        }
        $location.path("/program");
    };

    $scope.createNewProgram = function () {
        $rootScope.currentProgram = {
            id: null,
            tempo: 120,
            lengthInBeats: 8,
            beatDetectionEnabled: false,
            lights: []
        };
        $location.path("/program");
    };

    $scope.setAsCurrentProgram = function (program) {
        $rootScope.currentProgram = program;
    };


    var watchDestructor = $rootScope.$watch("currentProgram", function () {
        $scope.currentProgram = JSON.stringify($rootScope.currentProgram);
    });

    $scope.$on("$destroy", function () {
        watchDestructor();
    });
});