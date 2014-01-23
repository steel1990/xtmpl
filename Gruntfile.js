/**
 * @file grunt 自动任务配置文件
 * @author lbbsteel@gmail.com
 */

module.exports = function(grunt) {
    grunt.initConfig({
        watch: {
            xtmpl: {
                files: ['src/xtmpl.js', 'Gruntfile.js', 'test/test.xtmpl.js'],
                tasks: ['build']
            },
            html: {
                files: ['src/xtmpl.min.js', 'demo/simple.html'],
                options: {
                    livereload: true
                }
            }
        },
        jshint: {
            options: {
                curly: true,
                eqeqeq: true,
                es3: true,
                immed: true,
                indent: 4,
                latedef: true,
                noarg: true,
                noempty: true,
                quotmark: 'single',
                undef: true,
                unused: true,
                trailing: true,
                maxlen: 100,
                eqnull: true,
                browser: true,
                evil: true,
                globals: {
                    module: true,
                    define: true
                }
            },
            xtmpl: ['src/xtmpl.js', 'Gruntfile.js'],
            qunit: {
                options: {
                    globals: {
                        module: true,
                        QUnit: true,
                        test: true,
                        ok: true,
                        equal: true,
                        deepEqual: true,
                        notEqual: true
                    }
                },
                src: ['test/test.xtmpl.js']
            }
        },
        jscs: {
            src: '<%= watch.xtmpl.files %>',
            options: {
                config: '.jscs.json'
            }
        },
        uglify: {
            options: {
                beautify: false
            },
            xtmpl: {
                files: {
                    'src/xtmpl.min.js': 'src/xtmpl.js'
                }
            }
        },
        qunit: {
            xtmpl: ['test/runner.html']
        }
    });

    /**
     * 注册默认任务为 watch
     */
    grunt.registerTask('default', ['watch']);
    grunt.registerTask('build', ['jshint', 'uglify', 'qunit']);

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-jscs-checker');
};