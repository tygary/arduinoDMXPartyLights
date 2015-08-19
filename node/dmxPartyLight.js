var loggingEnabled = false;

function include(file_) {
    with (global) {
        eval(fs.readFileSync(file_) + '');
    };
};

var fs = require('fs');

var ProgramControl = require('./ProgramControl.js');


global.logIt = function(message) {
    if (loggingEnabled) {
        console.log(message);
    }
}


process.on
(
    'uncaughtException',
    function (err)
    {
        var log = err.stack;


        // print note to console
        console.log("SERVER CRASHED!");
        console.log(log);


        // save log to timestamped logfile
        var filename = "crash_" + Date.now() + ".log";
        console.log("LOGGING ERROR TO "+filename);
        var fs = require('fs');
        if (!fs.existsSync("/logs")) {
            fs.mkdirSync("/logs");
        }
        fs.writeFile('/logs/'+filename, log);
    }
);


global.logIt("Hello Arduino");       // send an intial message on startup

var http = require('http');
var readline = require('readline'); // include the readline module

// create an interface to read lines from the Arduino:
var lineReader = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

var programControl = new ProgramControl();

// when you get a newline in the stdin (ends with \n),
// send a reply out the stdout:
lineReader.on('line', function (data) {
    if (data.indexOf("|Beat|") > -1) {
        programControl.triggerBeatInProgram();
    }
});

http.createServer(function (request, response) {
    if (request.method === 'OPTIONS') {
        console.log('!OPTIONS');
        var headers = {};
        // IE8 does not allow domains to be specified, just the *
        // headers["Access-Control-Allow-Origin"] = req.headers.origin;
        headers["Access-Control-Allow-Origin"] = "*";
        headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
        headers["Access-Control-Allow-Credentials"] = false;
        headers["Access-Control-Max-Age"] = '86400'; // 24 hours
        headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
        response.writeHead(204, headers);
        response.end();
    } else if (request.method == 'POST') {
        processPost(request, response, function () {
            global.logIt(request.post);
            response.writeHead(200, "OK", {
                'Content-Type': 'application/json; charset=UTF-8',
//                'Transfer-Encoding': 'chunked',
//                'Content-Length': "",
                'Access-Control-Allow-Origin': "*",
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
                'Access-Control-Allow-Headers': 'X-Requested-With,content-type',
                "access-control-max-age": 10 // Seconds.
            });
            var returnData = programControl.processCommand(request, response, request.post);
            if (returnData) {
                response.write(returnData + '');
            }
            response.end("\r\n");
        });
    } else {
        response.writeHead(200, "OK", {
            'Content-Type': 'application/json; charset=UTF-8',
//            'Transfer-Encoding': 'chunked',
//            'Content-Length': "",
            'Access-Control-Allow-Origin': "*",
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
            'Access-Control-Allow-Headers': 'X-Requested-With,content-type',
            "access-control-max-age": 10 // Seconds.
        });
        var returnData = programControl.processCommand(request, response, null);
        if (returnData) {
            response.write(returnData + '');
        }
        response.end();
    }
}).listen(8080);



function processPost(request, response, callback) {
    var queryData = "";
    if (typeof callback !== 'function') {
        return null;
    }
    if (request.method == 'POST') {
        request.on('data', function (data) {
            queryData += data;
            if (queryData.length > 1e6) {
                queryData = "";
                response.writeHead(413, {'Content-Type': 'text/plain'}).end();
                request.connection.destroy();
            }
        });

        request.on('end', function () {
            request.post = queryData;
            callback();
        });

    } else {
        response.writeHead(405, {'Content-Type': 'text/plain'});
        response.end();
    }
}
