/**
 * @file xtmpl 模板引擎单元测试文件
 * @author lbbsteel@gmail.com
 */
(function (xtmpl) {
    module = QUnit.module;

    // util module test
    (function (util) {
        module('xtmpl.util');
        test('trim', function () {
            var trim = util.trim;
            equal(trim('xx'), 'xx');
            equal(trim(''), '');
            equal(trim(' '), '');
            equal(trim(' xx'), 'xx');
            equal(trim(' xx '), 'xx');
            equal(trim(' xx   '), 'xx');
        });
    })(xtmpl._util);

    (function (xtmpl) {
        module('xtmpl private func');
        test('_concatParam', function () {
            var concatParam = xtmpl._concatParam;
            equal(concatParam('a', true), '$html += $escape(a);\n');
            equal(concatParam('a', false), '$html += a;\n');
            equal(concatParam('$a', false), '$html += $a;\n');
            equal(concatParam('fn(a)', false), '$html += fn(a);\n');
            equal(concatParam('fn(a)', true), '$html += $escape(fn(a));\n');
        });

        test('_concat', function () {
            var concat = xtmpl._concat;
            equal(concat('a'), '$html += "a";\n');
            equal(concat('"a"'), '$html += "\\"a\\"";\n');
            equal(concat('\\a'), '$html += "\\\\a";\n');
            equal(concat('a\n'), '$html += "a\\n";\n');
            equal(concat('a\t'), '$html += "a\\t";\n');
        });

        test('_addParam', function () {
            var addParam = xtmpl._addParam;
            equal(addParam(['a.b'], [{}], ['$d']), 'var b = a["b"];\n');
            equal(addParam(['a.b.c'], [{}], ['$d']), 'var b = a["b"];\n');
            equal(addParam(['a.b.c.d'], [{}], ['$d']), 'var b = a["b"];\n');
            equal(addParam(['a.b'], [{ 'a.b': 1}], ['$d']), '');
            equal(addParam(['a./b'], [{}], ['$d']), 'var b = $d["b"];\n');
            var str = 'var b = $d["b"];\n';
            equal(addParam(['a.../b'], [{}], ['$d', '$e']), str);
            str = 'var b = $d["b"];\n';
            equal(addParam(['a.../../b'], [{}], ['$d', '$e', '$f']), str);
        });

        test('_resolveBlockHelperCode', function () {
            var resolveBlockHelperCode = xtmpl._resolveBlockHelperCode;
            xtmpl.registerBlockHelper('test', function (env) {
                return {
                    env: env,
                    variable: ['a.b'],
                    str: '{'
                };
            });
            deepEqual(resolveBlockHelperCode('#test', '$d'), {
                env: '$d',
                variable: ['a.b'],
                str: '(function () {\n{'
            });
        });

        test('_resolveInlineHelperCode', function () {
            var resolveInlineHelperCode = xtmpl._resolveInlineHelperCode;
            xtmpl.registerInlineHelper('test', function (env, args) {
                return 'test:' + args.join(',');
            });
            deepEqual(resolveInlineHelperCode('test 1', '$d', true), {
                env: '',
                variable: ['$helper.test'],
                str: '$html += $escape(test(1));\n'
            });
            deepEqual(resolveInlineHelperCode('test 1', '$d', false), {
                env: '',
                variable: ['$helper.test'],
                str: '$html += test(1);\n'
            });
            deepEqual(resolveInlineHelperCode('test a', '$d', false), {
                env: '',
                variable: ['$helper.test', '$d.a'],
                str: '$html += test(a);\n'
            });
            deepEqual(resolveInlineHelperCode('test "a"', '$d', false), {
                env: '',
                variable: ['$helper.test'],
                str: '$html += test("a");\n'
            });
        });

        test('_resolveCode', function () {
            var resolveCode = xtmpl._resolveCode;
            deepEqual(resolveCode('a', '$d'), {
                env: '',
                variable: ['$d.a'],
                str: '$html += $escape(a);\n'
            });
            deepEqual(resolveCode('=a', '$d'), {
                env: '',
                variable: ['$d.a'],
                str: '$html += a;\n'
            });
            deepEqual(resolveCode('/if', '$d'), {
                env: '..',
                variable: [],
                str: '}})();\n'
            });
        });
    })(xtmpl);

    // 模板编译模块测试
    (function (compile) {
        module('xtmpl.compile');
        var data = {
            a: 0,
            b: {
                c: [1, 2, 3],
                d: {
                    e: 'string',
                    f: /a/
                },
                g: [
                    {
                        h: 1
                    }, {
                        h: 2
                    }, {
                        h: 3
                    }
                ]
            }
        };

        test('compile simple', function (){
            equal(compile('{{a}}')(data), '0');
            equal(compile('{{b.c}}')(data), '1,2,3');
            equal(compile('{{b.d.e}}')(data), 'string');
            equal(compile('{{b.d.f}}')(data), '&#x2f;a&#x2f;');
            equal(compile('{{b.d.e.length}}')(data), '6');
            equal(compile('{{this}}')(6), '6');
            equal(compile('{{this}}')('sdfs'), 'sdfs');
        });

        test('compile if', function () {
            equal(compile('if{{#if a}}xxx{{/if}}')(data), 'if');
            equal(compile('if{{#if !a}}xxx{{/if}}')(data), 'ifxxx');
            equal(compile('if{{#if !a}}xxx{{/if}}')(data), 'ifxxx');
            equal(compile('if{{#if true}}xxx{{/if}}')(data), 'ifxxx');
            equal(compile('if{{#if false}}xxx{{/if}}')(data), 'if');
            equal(compile('if{{#if this}}xxx{{/if}}')(1), 'ifxxx');
            equal(compile('if{{#if this}}xxx{{/if}}')(0), 'if');
        });

        test('compile with', function () {
            equal(compile('{{#with b}}{{d.e}}{{/with}}')(data), 'string');
            equal(compile('{{#with b}}{{../a}}{{/with}}')(data), '0');
            equal(compile('{{#with b}}x{{d.e}}x{{/with}}')(data), 'xstringx');
            var tmpl = 'xa{{#with b}}x{{d.e}}x{{/with}}xa';
            equal(compile(tmpl)(data), 'xaxstringxxa');
        });

        test('compile for', function () {
            var tmpl = 'for{{#for b.c}}{{#if $key}},{{/if}}{{$key}}:{{$value}}';
            tmpl += '{{/for}}';
            equal(compile(tmpl)(data), 'for0:1,1:2,2:3');
            tmpl = 'for{{#for b.g}}{{h}}{{/for}}';
            equal(compile(tmpl)(data), 'for123');
            tmpl = '{{#for this}}{{h}}{{/for}}';
            equal(compile(tmpl)(data.b.g), '123');
        });

        test('compile forin', function () {
            var tmpl = 'forin{{#forin b.d}}{{$key}}:{{$value}};{{/for}}';
            equal(compile(tmpl)(data), 'forine:string;f:&#x2f;a&#x2f;;');
            tmpl = 'forin{{#forin this}}{{$key}}:{{$value}};{{/for}}';
            equal(compile(tmpl)(data.b.d), 'forine:string;f:&#x2f;a&#x2f;;');
        });

        test('compile each', function () {
            var tmpl = 'each{{#each b.c}}{{$value}},{{/each}}';
            equal(compile(tmpl)(data), 'each1,2,3,');
            tmpl = '{{#each b.c}}{{$key}}:{{$value}};{{/each}}';
            equal(compile(tmpl)(data), '0:1;1:2;2:3;');
            tmpl = '{{#each b.d}}{{$key}}:{{$value}};{{/each}}';
            equal(compile(tmpl)(data), 'e:string;f:&#x2f;a&#x2f;;');
            tmpl = '{{#each this}}{{$key}}:{{this}};{{/each}}';
            equal(compile(tmpl)(data.b.d), 'e:string;f:&#x2f;a&#x2f;;');
        });
    })(xtmpl.compile);


    // test registerInlineHelper
    (function (xtmpl) {
        module('xtmpl.registerInlineHelper');
        xtmpl.registerInlineHelper('ac', function (num, accuracy) {
            accuracy = parseInt(accuracy, 10) || 2;
            accuracy = Math.pow(10, accuracy);
            return Math.round(num * accuracy) / accuracy;
        });

        test('xtmpl.registerInlineHelper ac', function () {
            equal(xtmpl.compile('{{ac 3.3}}')({}), '3.3');
            equal(xtmpl.compile('{{ac 3.333}}')({}), '3.33');
            equal(xtmpl.compile('{{ac 3.333 3}}')({}), '3.333');
            equal(xtmpl.compile('{{ac 3.333333 3}}')({}), '3.333');
            equal(xtmpl.compile('{{ac this 3}}')(3.33333), '3.333');
            equal(xtmpl.compile('{{ac a 3}}')({ a: 3.3333333333 }), '3.333');
        });
    })(xtmpl);

    (function (xtmpl) {
        module('xtmpl.config', {
            setup: function () {
                xtmpl.config('escapeHtml', false);
                xtmpl.config('startTag', '{@');
                xtmpl.config('endTag', '@}');
                xtmpl.config('blockHelperFlag', '%');
            },
            teardown: function () {
                xtmpl.config('escapeHtml', true);
                xtmpl.config('startTag', '{{');
                xtmpl.config('endTag', '}}');
                xtmpl.config('blockHelperFlag', '#');
            }
        });
        
        test('', function () {
            equal(xtmpl.compile('{@this@}')('<span>'), '<span>');
            equal(xtmpl.compile('if{@%if a@}xxx{@/if@}')({ a: 1 }), 'ifxxx');
            var data = {
                a: [1, 2, 3]
            };
            var str = 'for123';
            equal(xtmpl.compile('for{@%for a@}{@$value@}{@/for@}')(data), str);
        });
    })(xtmpl);

    (function (xtmpl) {
        module('xtmpl.config object', {
            setup: function () {
                xtmpl.config({
                    escapeHtml: false,
                    startTag: '{@',
                    endTag: '@}',
                    blockHelperFlag: '%'
                });
            },
            teardown: function () {
                xtmpl.config({
                    escapeHtml: true,
                    startTag: '{{',
                    endTag: '}}',
                    blockHelperFlag: '#'
                });
            }
        });
        
        test('', function () {
            equal(xtmpl.compile('{@this@}')('<span>'), '<span>');
            equal(xtmpl.compile('if{@%if a@}xxx{@/if@}')({ a: 1 }), 'ifxxx');
            var data = {
                a: [1, 2, 3]
            };
            var str = 'for123';
            equal(xtmpl.compile('for{@%for a@}{@$value@}{@/for@}')(data), str);
        });
    })(xtmpl);

})(this.xtmpl);