
lightingControllers.controller('performanceController', function($scope, $rootScope, $location, dmxService) {
    $scope.dmx = dmxService;


    $scope.tempo = 120;
    $scope.beatDetection = true;


    $scope.activateProgram = function(program) {
        $rootScope.currentProgram = program;
        dmxService.runProgram(program, $scope.tempo, $scope.beatDetection);
    };

    $scope.start = function () {
      dmxService.runProgram();
    };

    $scope.stop = function () {
        dmxService.stopProgram();
    };

    $scope.blackout = function() {
        dmxService.turnOffAllLights();
    };

    $scope.goHome = function () {
        $location.path("/home");
    };
});