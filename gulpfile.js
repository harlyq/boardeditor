var gutil = require('gulp-util');
var gulp = require('gulp');
var tsc = require('gulp-typescript-compiler');
var run = require('gulp-run');
// var less = require('gulp-less');
var concat = require('gulp-concat');

// gulp.task('less', function() {
//     return gulp
//         .src('src/*.less')
//         .pipe(less())
//         .pipe(gulp.dest('src'));
// });

gulp.task('typescript', function(cb) {
    run('tsc.cmd --target ES5 --out src/game.js src/game.ts').exec(cb).on('error', gutil.log);
});

gulp.task('plugins', function(cb) {
    run('tsc.cmd --target ES5 --out src/coreplugins.js src/coreplugins.ts').exec(cb).on('error', gutil.log);
});

// gulp.task('merge', ['typescript'], function() {
//     gulp.src(['src/game.js', 'src/gamex.js'])
//         .pipe(concat('finalgame.js'))
//         .pipe(gulp.dest('src'));
// });

gulp.task('watch', function() {
    gulp.watch('src/*.ts', ['typescript', 'plugins']);
    // gulp.watch('src/*.less', ['less']);
});

//gulp.task('typescript', ['compile', 'merge']);

gulp.task('default', ['typescript', 'plugins', 'watch']);
