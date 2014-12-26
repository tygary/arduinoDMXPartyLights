if (!fs) {
    var fs = require('fs');
}

var BackupService = module.exports = function BackupService() {
    var backupService = this;

    backupService.programList = [];

    backupService.backupFilePath = "/dmx/storage/programBackup.json";
    backupService.defaultsFilePath = "/dmx/storage/defaultPrograms.json";

    return backupService;
}

BackupService.prototype.backupProgramList = function() {
    var backupService = this;

    var buffer = new Buffer(JSON.stringify(backupService.programList));
    if (fs.existsSync(backupService.backupFilePath)) {
        fs.unlinkSync(backupService.backupFilePath);
    } else {
        if (!fs.existsSync("/dmx")) {
            fs.mkdirSync("/dmx");
        }
        if (!fs.existsSync("/dmx/storage")) {
            fs.mkdirSync("/dmx/storage");
        }
    }
    fs.open(backupService.backupFilePath, 'w', function(err, fd) {
        if (err) {
            console.log("Failed opening file: " + err);
        } else {
            fs.write(fd, buffer, 0, buffer.length, null, function(err) {
                if (err) throw 'error writing file: ' + err;
                fs.close(fd)
            });
        }
    });
};

BackupService.prototype.restoreProgramList = function() {
    var backupService = this;
    fs.readFile(backupService.backupFilePath, 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        } else {
            backupService.programList = JSON.parse(data);
        }
    });
};

BackupService.prototype.saveDefaults = function() {
    var backupService = this;
    this.backupProgramList();
    var buffer = new Buffer(JSON.stringify(backupService.programList));
    fs.open(backupService.defaultsFilePath, 'w', function(err, fd) {
        if (err) {
            console.log("Failed opening file: " + err);
        } else {
            fs.write(fd, buffer, 0, buffer.length, null, function(err) {
                if (err) throw 'error writing file: ' + err;
                fs.close(fd)
            });
        }
    });
};

BackupService.prototype.restoreDefaults = function () {
    var backupService = this;
    fs.readFile(backupService.defaultsFilePath, 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        } else {
            backupService.programList = JSON.parse(data);
            backupService.backupProgramList();
        }
    });
};