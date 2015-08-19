/*

Ideas for auto-play:


Click to select each program

Have a selector for the time per program.

It would be cool to say

A x2   B x4   C x1   A x4



Drag and drop programs into an array.  You can place one multiple times to produce a longer length....

Instead of a scroll, is there a way to do a grid?




 */



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