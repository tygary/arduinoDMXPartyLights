lightingServices.service('dmxService', function($http) {
    delete $http.defaults.headers.common['X-Requested-With'];
    delete $http.defaults.headers.post['Content-type'];
    var dmxService = {
        arduinoUrl: "http://127.0.0.1:8080",
        currentLights: [1, 2],
        programIsRunning: false
    };

    dmxService.runProgram = function (program) {
        postCommand("runProgram", null, program);
        dmxService.programIsRunning = true;
    };
    dmxService.stopProgram = function () {
        postCommand("stopProgram");
        dmxService.programIsRunning = false;
    };
    dmxService.turnOffAllLights = function (){
        for (var i=0; i<dmxService.currentLights.length; i++) {
            dmxService.setLight(dmxService.currentLights[i], 0);
        }

    };
    dmxService.setLight = function(channel, value) {
        postCommand("set", [
            ["channel", channel],
            ["value", value]
        ]);
    };


    function postCommand(command, params, data) {
        var paramsString = "";
        if (params && params.length > 0) {
            for (var i = 0; i < params.length; i++) {
                var paramObj = params[i];
                paramsString = paramsString.concat("&" + paramObj[0] + "=" + paramObj[1]);
            }
        }
        $http.post(dmxService.arduinoUrl + "/" + command + "?" + paramsString, data, {
            'Authorization': 'Basic dGVzdDp0ZXN0',
            contentType: "application/json"
        });
    }

    return dmxService;
});