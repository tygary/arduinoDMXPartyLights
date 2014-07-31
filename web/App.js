/**
 * Created by tyler.gary on 7/27/14.
 */

var lightingApp = angular.module('LightingApp', [
    'LightingApp.services',
    'LightingApp.controllers',
    'ngRoute',
    'ngDragDrop'
]);


lightingApp.config(['$routeProvider', function($routeProvider) {
        $routeProvider.
            when("/home", {templateUrl: "home/home.html", controller: "homeController"}).
            when("/program", {templateUrl: "programBuilder/programBuilder.html", controller: "programBuilderController"}).
            otherwise({redirectTo: '/home'});
    }]);

var lightingServices = angular.module('LightingApp.services', []);
var lightingControllers = angular.module('LightingApp.controllers', ["LightingApp.services"]);


function touchHandler(event) {
    var touch = event.changedTouches[0];

    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent({
            touchstart: "mousedown",
            touchmove: "mousemove",
            touchend: "mouseup"
        }[event.type], true, true, window, 1,
        touch.screenX, touch.screenY,
        touch.clientX, touch.clientY, false,
        false, false, false, 0, null);

    touch.target.dispatchEvent(simulatedEvent);
    event.preventDefault();
}

function init() {
    document.addEventListener("touchstart", touchHandler, true);
    document.addEventListener("touchmove", touchHandler, true);
    document.addEventListener("touchend", touchHandler, true);
    document.addEventListener("touchcancel", touchHandler, true);
}
