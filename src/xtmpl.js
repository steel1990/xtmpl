/**
 * @file xtmpl 模板引擎
 * @description 模板语法：
 * 1. 简单 xtmpl.compile('aa{{b}}cc')({ b: '<span>' }) 结果：aa&lt;span&gt;cc
 * 2. 不编码 xtmpl.compile('aa{{=b}}cc')({ b: '<span>' }) 结果：aa<span>cc
 *     或者使用 xtmpl.config('escapeHtml', false); 修改全局配置
 * 3. 遍历数组
 *     xtmpl.compile('{{#for list}}{{$value}}{{/for}}')({ list: [1, 2, 3] })
 *     结果：123
 *     xtmpl.compile('{{#for list}}{{k}}{{/for}}')({
 *         list: [{
 *             k: 1
 *         }, {
 *             k: 2
 *         }]
 *     });
 *     结果：12
 * 4. 遍历对象
 *     xtmpl.compile('{{#forin obj}}{{$key}}:{{$value}};{{/forin}}')({
 *         obj: {
 *             a: 1,
 *             b: 2,
 *             c: 3
 *         }
 *     });
 *     结果：a:1;b:2;c:3;
 * @author lbbsteel@gmail.com
 */
(function (global, undefined) {
    /**
     * 提供给 xtmpl 的工具库
     * @type {Object}
     */
    var util = {
        /**
         * 清除掉一个字符串两边的空白字符
         * @param {string} str 需要处理的字符串
         * @return {string} 返回处理结果
         */
        trim: function (str) {
            return (str + '').replace(/^\s*/, '').replace(/\s*$/, '');
        }
    };

    /**
     * xtmpl 对象
     * @type {Object}
     */
    var xtmpl = {};
    /**
     * block helper 存储，用于储存 block helper 函数
     * @type {Object}
     */
    var _blockHelper = {};
    /**
     * block helper 存储，用于储存 block helper 函数
     * @type {Object}
     */
    var _inlineHelper = {};
    /**
     * 配置存储
     * @type {Object}
     */
    var _config = {
        /**
         * 配置是否需要对变量进行 HTML 编码
         * @type {boolean}
         */
        escapeHtml: true,
        /**
         * 开始标记
         * @type {string}
         */
        startTag: '{{',
        /**
         * 结束标记
         * @type {string}
         */
        endTag: '}}',
        /**
         * block helper 标记
         * @type {string}
         */
        blockHelperFlag: '#',
        /**
         * 生成的 function 中 html 加的变量名称
         * @type {string}
         */
        resultVarName: '$html'
    };

    /**
     * xtmpl 用于注册 block helper 的接口
     * @public
     * @param {string} name block helper 名称
     * @param {Function} fn block helper 函数
     */
    xtmpl.registerBlockHelper = function (name, fn) {
        _blockHelper[name] = fn;
    };

    /**
     * xtmpl 用于注册 inline helper 的接口
     * @public
     * @param {string} name inline helper 名称
     * @param {Function} fn inline helper 函数
     */
    xtmpl.registerInlineHelper = function (name, fn) {
        _inlineHelper[name] = fn;
    };

    /**
     * xtmpl 用于修改或写入配置的接口
     * @public
     * @param {string|Object} key 配置名称，或配置对象
     * @param {*?} value 配置值
     */
    xtmpl.config = function (key, value) {
        if (typeof key === 'string') {
            _config[key] = value;
        }
        else {
            for (var k in key) {
                _config[k] = key[k];
            }
        }
    };

    /**
     * 生成插入变量值的 js 代码
     * @private
     * @param {string} name 变量名
     * @param {boolean} isEscape 是否要对变量进行 escape
     * @return {string} 返回生产的代码片段
     */
    xtmpl._concatParam = function (name, isEscape) {
        var str = _config.resultVarName + ' += ';
        if (_config.escapeHtml && isEscape) {
            str += '$escape(';
        }
        str += name;
        if (_config.escapeHtml && isEscape) {
            str += ')';
        }
        str += ';\n';
        return str;
    };

    /**
     * 将纯字符串连接上
     * @private
     * @param {string} str 需要连接的字符串
     * @return {string} 返回处理好的字符串
     */
    xtmpl._concat = function (str) {
        str = (str || '')
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\t/g, '\\t')
            .replace(/\n/g, '\\n');
        return _config.resultVarName + ' += "' + str + '";\n';
    };

    /**
     * 生成插入变量名的代码片段
     * @private
     * @param {Array.<string>} variable 变量名列表
     * @param {Array.<Object>} variableStack 当前的变量栈，避免多次重复添加变量
     * @param {Array.<string>} envStack 当前的环境变量栈
     * @return {string} 返回生成的代码片段
     */
    xtmpl._addParam = function (variable, variableStack, envStack) {
        var curVariables = variableStack[variableStack.length - 1];
        var str = '';
        var pathReplacer = function ($, $1) {
            var n = $1.length / 3;
            return envStack[envStack.length - n - 1] + '.';
        };
        for (var i = 0; i < variable.length; i += 1) {
            var varname = variable[i];
            if (curVariables[varname] || /\.this$|\$data$/.test(varname)) {
                continue;
            }
            curVariables[varname] = 1;
            if (/\//.test(varname)) {
                // 变量中包含“斜杠”，需要做环境处理
                varname = varname.replace(/^[^.]+\./, '');
                if (varname.indexOf('/') === 0) {
                    // 表示访问顶级环境（根目录）
                    varname = envStack[0] + '.' + varname.slice(1);
                }
                else {
                    // 表示访问 n 次上一级(../../)
                    varname = varname.replace(/^((?:\.\.\/)+)/, pathReplacer);
                }
            }
            var arr = varname.split('.');
            arr[1] = arr[1].split('.')[0];
            str += 'var ' + arr[1] + ' = ' + arr[0] + '["' + arr[1] + '"];\n';
        }
        return str;
    };

    /**
     * 处理 block helper 的片段
     * 示例：#for list
     * @private
     * @param {string} code 需要处理的代码片段
     * @param {string} env 当前的环境变量名称
     * @return {Object} 返回处理结果，包含新的环境变量名称、变量列表及生产的代码
     */
    xtmpl._resolveBlockHelperCode = function (code, env) {
        var data = {
            env: '',
            variable: [],
            str: ''
        };

        code = code.slice(1);
        var param = code.split(/\s+/);

        var helperfn = _blockHelper[param[0]];
        if (!helperfn) {
            throw new Error('has no block helper named ' + param[0]);
        }
        for (var i = 1; i < param.length; i += 1) {
            if ('this' === param[i]) {
                param[i] = env;
            }
        }
        var d = helperfn.call(null, env, param.slice(1));
        [].push.apply(data.variable, d.variable);
        data.env = d.env;
        data.str = '(function () {\n' + d.str;
        return data;
    };

    /**
     * 处理 inline helper 的片段
     * 示例：test param1 param2
     * @private
     * @param {string} code 需要处理的代码片段
     * @param {string} env 当前的环境变量名称
     * @param {boolean} isEscape 是否对结果进行 escape
     * @return {Object} 返回处理结果，包含新的环境变量名称、变量列表及生产的代码
     */
    xtmpl._resolveInlineHelperCode = function (code, env, isEscape) {
        var data = {
            env: '',
            variable: [],
            str: ''
        };

        var param = util.trim(code).split(/\s+/);
        var helperName = param[0];
        var helperfn = _inlineHelper[helperName];
        if (!helperfn) {
            throw new Error('has no inline helper named ' + param[0]);
        }
        data.variable.push('$helper.' + helperName);
        param = param.slice(1);
        var paramReg = /^(?:(['"])[\S]*\1|[\d.]+|true|false)$/;
        for (var i = 0; i < param.length; i += 1) {
            var p = param[i];
            if ('this' === p) {
                param[i] = env;
            }
            else if (!paramReg.test(p) && /^[$\w_]+$/.test(p)) {
                // p 为变量名
                data.variable.push(env + '.' + p);
            }
        }
        data.str = helperName + '(' + param.join(',') + ')';
        data.str = xtmpl._concatParam(data.str, isEscape);
        return data;
    };

    /**
     * 代码解析
     * @private
     * @param {string} code 需要解析的代码
     * @param {string} env 环境变量，表示当前 code 所处的环境
     * @return {Object} 返回解析结果，包含 新的env、变量列表和解析后的字符串
     */
    xtmpl._resolveCode = function (code, env) {
        var data = {
            env: '',
            variable: [],
            str: ''
        };

        if (code.indexOf(_config.blockHelperFlag) === 0) {
            data = xtmpl._resolveBlockHelperCode(code, env);
        }
        else if (code.indexOf('/') === 0 && _blockHelper[code.slice(1)]) {
            // block helper end
            data.env = '..';
            data.str = '}})();\n';
        }
        else {
            var isEscape = true;
            if (code.indexOf('=') === 0) {
                code = code.slice(1);
                isEscape = false;
            }
            var param = util.trim(code).split(/\s+/);
            if (param.length === 1) {
                // insert param
                if (param[0] === 'this') {
                    param[0] = env;
                }
                else if (param[0].indexOf('$') !== 0) {
                    data.variable.push(env + '.' + param[0]);
                }
                data.str = xtmpl._concatParam(
                    param[0].replace(/^[.\/]*/g, ''),
                    isEscape
                );
            }
            else {
                data = xtmpl._resolveInlineHelperCode(code, env, isEscape);
            }
        }
        return data;
    };

    /**
     * xtmpl 模板编译接口
     * @public
     * @param {string} tmplStr 模板字符串
     * @return {Function} 返回编译后的模板处理函数
     */
    xtmpl.compile = function (tmplStr) {
        var envStack = ['$data'];
        var variableStack = [{}];

        var fnStr = '';
        fnStr += 'var $html = "";\n';

        if (_config.escapeHtml) {
            fnStr += xtmpl._addParam(
                ['$helper.$escape'],
                variableStack,
                envStack
            );
        }

        // 假设为 abcd{{e}}fg{{h}}
        tmplStr = util.trim(tmplStr);

        // 切割后为 ["abcd", "e}}fg", "h}}"]
        var startArr = tmplStr.split(_config.startTag);
        for (var i = 0; i < startArr.length; i += 1) {
            var str = startArr[i];
            if (i === 0) {
                // 第一个结果无需做后续处理
                if ('' !== str) {
                    fnStr += xtmpl._concat(str);
                }
                continue;
            }
            // 第二次切割后为 ["e", "fg"]
            // 第三次切割后为 ["h", ""]
            var endArr = str.split(_config.endTag);
            
            var data = xtmpl._resolveCode(
                endArr[0],
                envStack[envStack.length - 1]
            );
            if (data.env === '..') {
                envStack.pop();
                variableStack.pop();
            }
            else if (data.env) {
                envStack.push(data.env);
                variableStack.push({});
            }

            fnStr += xtmpl._addParam(data.variable, variableStack, envStack);
            fnStr += data.str;

            if ('' !== endArr[1]) {
                fnStr += xtmpl._concat(endArr[1]);
            }
        }

        fnStr += 'return $html;';
        // console.log(fnStr);
        var fn = new Function('$data', '$helper', fnStr);
        /**
         * 生成一个包含闭包的函数，方便传入 inlineHelper
         * @param {Object} $data 模板渲染数据
         * @return {string} 返回渲染结果
         */
        var realFunc = function ($data) {
            return fn($data, _inlineHelper);
        };
        /**
         * 修改返回函数的 toString 方法，让其返回真正的函数内容
         * @return {string} 返回函数内容
         */
        realFunc.toString = function () {
            return fnStr;
        };
        return realFunc;
    };

    /**
     * 将 util 添加到 xtmpl 上
     * @private
     * @type {Object}
     */
    xtmpl._util = util;

    /**
     * 将 xtmpl 暴露到全局接口上
     * @type {Object}
     */
    global.xtmpl = xtmpl;
})(this);

/**
 * 下面部分是注册默认的 helper
 * @param {Object} xtmpl
 */
(function (xtmpl) {
    /**
     * 注册 helperIf 用于简单的逻辑判断
     * @param {*} arg 需要判断的参数
     * @param {Object} options 其他参数，包括内部模板等信息
     * @return {string} 返回解析后的字符串
     */
    xtmpl.registerBlockHelper('if', function helperIf(env, args) {
        var data = {
            env: env,
            variable: [],
            str: ''
        };
        for (var i = 0; i < args.length; i += 1) {
            var arg = args[i];
            var isNegate = false;
            if (arg.indexOf('!') === 0) {
                arg = arg.slice(1);
                isNegate = true;
            }
            if (!/^['"]|^[\d.]$|^\W|true|false/.test(arg)) {
                data.variable.push(env + '.' + arg);
            }
            if (isNegate) {
                args[i] = '!' + arg;
            }
        }
        data.str = 'if (' + args.join('') + ') {\n';
        return data;
    });

    /**
     * 注册 helperWith 用于改变当前的作用域
     * @param {Object} data 需要改变为的作用域对象
     * @param {Object} options 其他参数，包括内部模板及 path 等信息
     * @return {string} 返回解析后的字符串
     */
    xtmpl.registerBlockHelper('with', function helperWith(env, args) {
        return {
            env: args[0],
            variable: [env + '.' + args[0]],
            str: '{'
        };
    });

    /**
     * 注册 helperFor 用于遍历一个数组
     * @param {string} env 当前环境变量名
     * @param {array.<string>} args 传递给当前helper的参数列表
     * @return {Object} 返回 block helper 执行的结果
     */
    xtmpl.registerBlockHelper('for', function helperFor(env, args) {
        var arg = args[0];
        var data = {
            env: '$value',
            variable: [env + '.' + arg],
            str: ''
        };
        data.str = 'for (var $key = 0; $key < ' + arg + '.length; $key++) {\n';
        data.str += 'var $value = ' + arg + '[$key];\n';
        return data;
    });

    /**
     * 注册 helperForin 用于遍历一个对象
     * @param {string} env 当前环境变量名
     * @param {array.<string>} args 传递给当前helper的参数列表
     * @return {Object} 返回 block helper 执行的结果
     */
    xtmpl.registerBlockHelper('forin', function helperFor(env, args) {
        var data = {
            env: '$value',
            variable: [env + '.' + args[0]],
            str: ''
        };
        data.str = 'for (var $key in ' + args[0] + ') {\n';
        data.str += 'var $value = ' + args[0] + '[$key];\n';
        return data;
    });

    /**
     * 注册 helperEach 用于遍历一个对象或者数组
     * 此 helper 会先将数组转换为object，所以不推荐使用此接口
     * @param {string} env 当前环境变量名
     * @param {array.<string>} args 传递给当前helper的参数列表
     * @return {Object} 返回 block helper 执行的结果
     */
    xtmpl.registerBlockHelper('each', function helperEach(env, args) {
        var arg = args[0];
        var data = {
            env: '$value',
            variable: [env + '.' + arg],
            str: ''
        };
        var str = 'var $eachData = ' + arg + ';\n';
        str += 'if (({}).toString.call(' + arg + ') === "[object Array]") {\n';
        str += '$eachData = {};\n';
        str += 'for (var $key = 0; $key < ' + arg + '.length; $key += 1) {\n';
        str += '$eachData[$key]=' + arg + '[$key];\n';
        str += '}\n';
        str += '}\n';
        str += 'for (var $key in $eachData) {\n';
        str += 'var $value = $eachData[$key];\n';
        data.str = str;
        return data;
    });

    /**
     * html 编码的 map
     * @type {Object}
     */
    var escapeMap = {
        '&': '&amp;',
        '"': '&quot;',
        '\'': '&#39;',
        '/': '&#x2f;',
        '<': '&lt;',
        '>': '&gt;',
        'reg': /[&"'<>\/]/g
    };
    /**
     * 注册一个 inline helper 用于处理 html 编码
     * @param {string} str 需要处理的字符串
     * @return {string} 返回编码后的字符串
     */
    xtmpl.registerInlineHelper('$escape', function helperEscape(str) {
        return (str + '').replace(escapeMap.reg, function ($0) {
            return escapeMap[$0];
        });
    });
})(this.xtmpl);

/**
 * 兼容 node.js require.js 等模块加载
 */
(function (xtmpl) {
    if ('object' === typeof module && 'object' === typeof module.exports) {
        // node.js 环境
        module.exports = xtmpl;
    }
    else if ('function' === typeof define && define.amd) {
        // require.js 等环境
        define('xtmpl', [], function () {
            return xtmpl;
        });
    }
})(this.xtmpl);