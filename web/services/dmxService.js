lightingServices.service('dmxService', function($http, $rootScope, $location) {
    delete $http.defaults.headers.common['X-Requested-With'];
    delete $http.defaults.headers.post['Content-type'];
    var dmxService = {
        arduinoUrl: "http://"+$location.host()+":8080",
        currentLights: [1, 2],
        programIsRunning: false
    };

    dmxService.programList = {};

    dmxService.getPrograms = function () {
        postCommand("getPrograms", null, null, function (data){
            dmxService.programList = data;
            if (!$rootScope.currentProgram) {
                for (var id in dmxService.programList) {
                    $rootScope.currentProgram = dmxService.programList[id];
                    break;
                }
            }
        })
    };

    dmxService.saveProgram = function (program) {
        postCommand("storeProgram", null, program, function () {
            dmxService.getPrograms();
        });

    };

    dmxService.deleteProgram = function (programId) {
        postCommand("deleteProgram", null, {id:programId}, function () {
            dmxService.getPrograms();
        });
    };

    dmxService.runProgram = function (program, tempo, beatDetection) {
        if (!program) {
            program = $rootScope.currentProgram;
        }
        var params = [];
        if (tempo) {
            params.push({tempo:tempo});
        }
        if (beatDetection) {
            params.push({beatDetection:beatDetection});
        }
        postCommand("runProgram", null, program);
        dmxService.programIsRunning = true;
    };
    dmxService.stopProgram = function () {
        postCommand("stopProgram");
        dmxService.programIsRunning = false;
    };
    dmxService.turnOffAllLights = function (){
        postCommand("blackout");
        dmxService.programIsRunning = false;
    };
    dmxService.setLight = function(channel, value) {
        postCommand("set", [
            ["channel", channel],
            ["value", value]
        ]);
    };

    dmxService.saveDefaults = function () {
      window.confirm("Save current programs to defaults? THIS WILL ERASE OLD DEFAULTS...")
      postCommand("saveDefaults");
    };

    dmxService.restoreDefaults = function () {
        window.confirm("Restore programs to defaults? THIS WILL ERASE ANY UNSAVE PROGRAMS!")
        postCommand("restoreDefaults", null, null, function(){
            dmxService.getPrograms();
        });
    };


    function postCommand(command, params, data, callback) {
        var paramsString = "";
        if (params && params.length > 0) {
            for (var i = 0; i < params.length; i++) {
                var paramObj = params[i];
                paramsString = paramsString.concat("&" + paramObj[0] + "=" + paramObj[1]);
            }
        }
        var promise = $http.post(dmxService.arduinoUrl + "/" + command + "?" + paramsString, data, {
            'Authorization': 'Basic dGVzdDp0ZXN0',
            contentType: "application/json"
        });
        if (callback) {
            promise.success(callback);
        }
    }

    dmxService.getPrograms();

    return dmxService;
});