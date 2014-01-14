/**
 * @file xtmpl 模板引擎单元测试文件
 * @author lbbsteel@gmail.com
 */
(function(xtmpl) {
    module = QUnit.module;

    // util module test
    (function(util) {
        module('xtmpl.util');
        test('padRight', function() {
            var padRight = util.padRight;
            equal(padRight('test', 8), 'test    ');
            equal(padRight('test', 8, 'x'), 'testxxxx');
            equal(padRight('test', 4, 'x'), 'test');
            equal(padRight('test', 3, 'x'), 'test');
        });

        test('padLeft', function() {
            var padLeft = util.padLeft;
            equal(padLeft('test', 8), '    test');
            equal(padLeft('test', 8, 'x'), 'xxxxtest');
            equal(padLeft('test', 4, 'x'), 'test');
            equal(padLeft('test', 3, 'x'), 'test');
        });

        test('getCuid', function() {
            var getCuid = util.getCuid;
            for (var i = 1; i < 101; i += 1) {
                equal(getCuid().length, 17, 'length check ' + i);
                ok(/^[\dA-F]{11}-[\dA-F]{5}$/.test(getCuid()), 'regexp check ' + i);
                notEqual(getCuid(), getCuid(), 'not same check ' + i);
            }
        });

        test('isNullOrUndefined', function() {
            var isNullOrUndefined = util.isNullOrUndefined;
            equal(isNullOrUndefined(null), true, 'null check');
            equal(isNullOrUndefined(undefined), true, 'undefined check');
            equal(isNullOrUndefined(0), false, '0 check');
            equal(isNullOrUndefined(''), false, 'empty string check');
            equal(isNullOrUndefined(false), false, 'false string check');
            equal(isNullOrUndefined([]), false, '[] string check');
        });

        test('getVal', function() {
            var getVal = util.getVal;
            var data = {
                a: 0,
                b: {
                    c: [1, 2, 3],
                    d: {
                        e: 'string',
                        f: /a/
                    }
                }
            };

            equal(getVal(data, 'a'), 0);
            equal(getVal(data, 'this.a'), 0);
            equal(getVal(data, 'b.c.0'), 1);
            equal(getVal(data, 'b.c.length'), 3);
            equal(getVal(data, 'b.d.e'), 'string');
            equal(getVal(data, 'b.d.e.length'), '6');
            deepEqual(getVal(data, 'b.d.f'), /a/);
            equal(getVal(data, 'b.d.f.source'), 'a');
            equal(getVal(data, 'b.d.g'), undefined);
            equal(getVal('xx', 'this'), 'xx');
        });

        test('resolvePath', function() {
            var resolvePath = util.resolvePath;
            equal(resolvePath('', ''), '');
            equal(resolvePath('/', 'a.b.../x'), 'a.x');
            equal(resolvePath('/', 'a.x'), 'a.x');
            equal(resolvePath('a.b.c.d', './x'), 'a.b.c.d.x');
            equal(resolvePath('a.b.c.d', '../x'), 'a.b.c.x');
            equal(resolvePath('a.b.c.d', '../../x'), 'a.b.x');
            equal(resolvePath('a.b.c.d', '../../../x'), 'a.x');
            equal(resolvePath('a.b.c.d', '../../../../x'), 'x');
            equal(resolvePath('a.b.c.d', '../../.././x'), 'a.x');
            equal(resolvePath('a.b.c.../d', 'x'), 'a.b.d.x');
        });

        test('resolveArgs', function() {
            var resolveArgs = util.resolveArgs;
            var data = {
                a: 0,
                b: {
                    c: [1, 2, 3],
                    d: {
                        e: 'string',
                        f: /a/
                    }
                }
            };
            deepEqual(resolveArgs(data, ['a', 'g']), [0, 'g']);
            deepEqual(resolveArgs(data, ['a', 'b.c']), [0, [1, 2, 3]]);
            deepEqual(resolveArgs(data, ['a', 'b.c.0']), [0, 1]);
            deepEqual(resolveArgs(data, ['a', '3.3']), [0, 3.3]);
            deepEqual(resolveArgs(data, ['a', '3']), [0, 3]);
            deepEqual(resolveArgs(data, ['a', '"a"']), [0, 'a']);
            deepEqual(resolveArgs(data, ['a', '\'a\'']), [0, 'a']);
            deepEqual(resolveArgs(data, ['a', '!a']), [0, true]);
        });

        test('escapeHtml', function() {
            var escapeHtml = util.escapeHtml;
            equal(escapeHtml('xx'), 'xx');
            equal(escapeHtml('<span>'), '&lt;span&gt;');
            equal(escapeHtml('<span>&</span>'), '&lt;span&gt;&amp;&lt;&#x2f;span&gt;');
            equal(escapeHtml('"<'), '&quot;&lt;');
            equal(escapeHtml('\'<'), '&#x27;&lt;');
            equal(escapeHtml('\\<'), '&#x5c;&lt;');
        });
    })(xtmpl._util);

    // 模板编译模块测试
    (function(compile) {
        module('xtmpl.compile');
        var data = {
            a: 0,
            b: {
                c: [1, 2, 3],
                d: {
                    e: 'string',
                    f: /a/
                }
            }
        };
        test('compile simple', function(){
            equal(compile('{{a}}')(data), '0');
            equal(compile('{{b.c}}')(data), '1,2,3');
            equal(compile('{{b.d.e}}')(data), 'string');
            equal(compile('{{b.d.f}}')(data), '&#x2f;a&#x2f;');
            equal(compile('{{b.d.e.length}}')(data), '6');
            equal(compile('{{this}}')(6), '6');
        });

        test('compile if', function() {
            equal(compile('if{{#if a}}xxx{{/if}}')(data), 'if');
            equal(compile('if{{#if !a}}xxx{{/if}}')(data), 'ifxxx');
            equal(compile('if{{#if !a}}xxx{{/if}}')(data), 'ifxxx');
        });

        test('compile with', function() {
            equal(compile('{{#with b}}{{d.e}}{{/with}}')(data), 'string');
            equal(compile('{{#with b}}{{../a}}{{/with}}')(data), '0');
            equal(compile('{{#with b}}x{{d.e}}x{{/with}}')(data), 'xstringx');
            equal(compile('xa{{#with b}}x{{d.e}}x{{/with}}xa')(data), 'xaxstringxxa');
        });

        test('compile each', function() {
            var tmpl = 'each{{#each b.c}}{{this}},{{/each}}';
            equal(compile(tmpl)(data), 'each1,2,3,');
            tmpl = '{{#each b.c}}{{index}}:{{this}};{{/each}}';
            equal(compile(tmpl)(data), '0:1;1:2;2:3;');
            tmpl = '{{#each b.d}}{{key}}:{{value}};{{/each}}';
            equal(compile(tmpl)(data), 'e:string;f:&#x2f;a&#x2f;;');
        });
    })(xtmpl.compile);


    // test registerHelper
    (function(xtmpl) {
        module('xtmpl.registerHelper');
        xtmpl.registerHelper('ac', function(num, accuracy) {
            accuracy = parseInt(accuracy, 10) || 2;
            accuracy = Math.pow(10, accuracy);
            return Math.round(num * accuracy) / accuracy;
        });

        test('xtmpl.registerHelper ac', function() {
            equal(xtmpl.compile('{{ac 3.3}}')({}), '3.3');
            equal(xtmpl.compile('{{ac 3.333}}')({}), '3.33');
            equal(xtmpl.compile('{{ac 3.333 3}}')({}), '3.333');
            equal(xtmpl.compile('{{ac 3.333333 3}}')({}), '3.333');
            equal(xtmpl.compile('{{ac this 3}}')(3.33333), '3.333');
        });
    })(xtmpl);

    (function(xtmpl) {
        module('xtmpl.config', {
            setup: function() {
                xtmpl.config('escapeHtml', false);
            },
            teardown: function() {
                xtmpl.config('escapeHtml', true);
            }
        });
        
        test('', function() {
            equal(xtmpl.compile('{{this}}')('<span>'), '<span>');
        });
    })(xtmpl);

})(this.xtmpl);