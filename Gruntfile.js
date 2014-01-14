/**
 * @file grunt 自动任务配置文件
 * @author liaobinbin01@baidu.com
 */

module.exports = function(grunt) {
    grunt.initConfig({
        watch: {
            files: ['bin/xtmpl.js', 'Gruntfile.js', 'test/test.xtmpl.js'],
            tasks: ['build']
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
                globals: {
                    module: true,
                    define: true
                }
            },
            xtmpl: ['bin/xtmpl.js', 'Gruntfile.js'],
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
        uglify: {
            xtmpl: {
                files: {
                    'bin/xtmpl.min.js': 'bin/xtmpl.js'
                }
            }
        },
        qunit: {
            xtmpl: ['test/runner.html']
        }
    });

    /**
     * 注册默认任务
     */
    grunt.registerTask('default', ['watch']);
    grunt.registerTask('build', ['jshint', 'uglify', 'qunit']);

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-qunit');
};