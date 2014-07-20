var livereloadSnippet = require('grunt-contrib-livereload/lib/utils').livereloadSnippet;
var mountFolder = function (connect, dir) {
  'use strict';

  return connect.static(require('path').resolve(dir));
};

module.exports = function(grunt) {
  'use strict';

  // load all grunt tasks (node_modules/grunt-* packages)
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  // Project configuration.
  grunt.initConfig({

    // load app meta info
    pkg: grunt.file.readJSON('package.json'),

    // js hint Gruntfile & src files
    jshint: {

      gruntfile: {
        src: ['gruntfile.js']
      },

      src: {
        src: ['src/js/**/*.js']
      }
    },

    watch: {
      html: {
        options: {
          livereload: true
        },
        files: [
          'src/index.html'
        ],
        tasks: []
      },
      js: {
        options: {
          livereload: true
        },
        files: [
          'src/js/**/*.js'
        ],
        tasks: ['jshint']
      },
      css: {
        options: {
          livereload: true
        },
        files: [
          '.tmp/css/**/*.css'
        ],
        tasks: []
      },
      sass: {
        files: [
          'src/css/**/*.scss'
        ],
        tasks: ['sass']
      },
    },

    connect: {
      src: {
        options: {
          port: 9000,
          hostname: '*',
          base: 'src/',
          open: true,
          livereload: true,
          middleware: function(connect) {
            return [
              // https://github.com/intesso/connect-livereload#grunt-example
              livereloadSnippet,

              // load assets from tmp folder first, fallback to src
              mountFolder(connect, '.tmp'),
              mountFolder(connect, 'src')
            ];
          }
        }
      },
      build: {
        options: {
          port: 3000,
          hostname: '*',
          base: 'build/',
          open: true,
          keepalive: true
        }
      }
    },

    // remove build folder before new build
    clean: {
      build: { src: ['build'] },
      tmp: { src: ['.tmp', '.sass-cache', '.grunt'] },
    },

    // https://github.com/gruntjs/grunt-contrib-sass
    // compile *.scss files into *.css
    sass: {
      build: {
        options: {
          style: 'expanded',
          compass: true
        },
        files: [{
          expand: true,
          cwd: 'src/',
          src: [
            'css/app.scss'
          ],
          dest: '.tmp/',
          ext: '.css'
        }]
      }
    },

    copy: {
      build: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: [
            'index.html',
            'js/*.js',
            'favicons/*.*',
            'vendor/bootstrap/dist/css/bootstrap.css',
            'vendor/jquery/dist/jquery.js',
            'vendor/underscore/underscore.js',
            'vendor/bootstrap/dist/js/bootstrap.js',
            'vendor/initials/initials.js',
            'vendor/markdown/lib/markdown.js'
          ],
          dest: 'build/'
        }, {
          expand: true,
          cwd: '.tmp/',
          src: [
            'css/**/*.css'
          ],
          dest: 'build/'
        }]
      }
    },

    cssmin: {
      build: {
        expand: true,
        cwd: 'build/css/',
        src: ['*.css', '!*.min.css'],
        dest: 'build/css/',
        ext: '.min.css'
      }
    },

    uglify: {
      build: {
        expand: true,
        cwd: 'build/js/',
        src: ['*.js', '!*.min.js'],
        dest: 'build/js/'
      }
    },

    // https://github.com/vojtajina/grunt-bump
    // bump version of app
    bump: {
      options: {
        files: ['package.json', 'bower.json'],
        updateConfigs: [],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json', 'bower.json'], // '-a' for all files
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: true,
        pushTo: 'origin'
      }
    },

    // https://github.com/tschaub/grunt-gh-pages
    // deploy build/ folder to gh-pages branch
    'gh-pages': {
      options: {
        base: 'build'
      },
      build: {
        src: ['**/*']
      }
    }
  });

  // Default task(s).
  grunt.registerTask('default', ['watch']);
  grunt.registerTask('build', ['jshint', 'clean', 'sass', 'cssmin', 'copy:build', 'uglify']);
  grunt.registerTask('serve', ['sass', 'connect:src', 'watch']);
  grunt.registerTask('deploy', ['build', 'gh-pages', 'clean']);
};
