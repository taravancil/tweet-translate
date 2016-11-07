const gulp = require('gulp')
const pump = require('pump')
const babel = require('gulp-babel')
const browserify = require('gulp-browserify')
const cleanCSS = require('gulp-clean-css')
const uglify = require('gulp-uglify')

const clientScripts = ['dist/home.js', 'dist/translations.js', 'dist/tweet.js']

gulp.task('transpile-js', (cb) => {
  return pump([
    gulp.src(['index.js', 'lib/*.js', 'lib/**/*.js']),
    babel(),
    gulp.dest('dist')
  ])
})

gulp.task('bundle-js', ['transpile-js'], (cb) => {
  pump([
    gulp.src(clientScripts),
    browserify(),
    uglify(),
    gulp.dest('dist')
  ])
})

gulp.task('build-css', () => {
  pump([
    gulp.src('css/*.css'),
    cleanCSS(),
    gulp.dest('dist/css')
  ])
})

gulp.task('build', ['transpile-js', 'bundle-js', 'build-css'])
