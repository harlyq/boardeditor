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

gulp.task('typescript', function() {
    run('tsc.cmd --target ES5 --out src/game.js src/game.ts').exec().on('error', gutil.log);
    gulp.src(['src/game.js', 'src/boardx.js'])
        .pipe(concat('finalgame.js'))
        .pipe(gulp.dest('src'));
});

gulp.task('watch', function() {
    gulp.watch('src/*.ts', ['typescript']);
    // gulp.watch('src/*.less', ['less']);
});

gulp.task('default', ['typescript', 'watch']);
