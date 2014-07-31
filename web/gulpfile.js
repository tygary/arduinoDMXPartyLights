var gulp = require('gulp');
var webserver = require('gulp-webserver');
gulp.task('default', function() {
  gulp.src("./").pipe(webserver({
      livereload: true,
      port: 9090
    }));
});
