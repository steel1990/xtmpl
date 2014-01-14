/**
 * @file xtmpl 模板引擎
 * @author Liao Binbin(liaobinbin01@baidu.com)
 */

/**
 * xtmpl 模板引擎，自执行
 * @param {Object} global 全局变量，用于挂载 xtmpl 接口
 * @param {undefined} undefined 用于获取 undefined
 */
(function(global, undefined) {
    /**
     * 提供给 xtmpl 的工具函数
     * @type {Object}
     */
    var util = {
        /**
         * 向右边填充字符以达到一定的长度
         * @param {string} str 原始字符串
         * @param {number} len 期望达到的长度
         * @param {string} s 需要填充的字符
         * @return {string} 返回处理好的字符串
         */
        padRight: function(str, len, s) {
            if (str.length >= len) {
                return str;
            }
            s = s || ' ';
            return str + new Array(len - str.length + 1).join(s);
        },
        /**
         * 向左边填充字符以达到一定的长度
         * @param {string} str 原始字符串
         * @param {number} len 期望达到的长度
         * @param {string} s 需要填充的字符
         * @return {string} 返回处理好的字符串
         */
        padLeft: function(str, len, s) {
            if (str.length >= len) {
                return str;
            }
            s = s || ' ';
            return new Array(len - str.length + 1).join(s) + str;
        },
        /**
         * 获取一个随机的 key 用于标识
         * @return {string} 返回一个字符串
         */
        getCuid: function() {
            var time = new Date().getTime().toString(16);
            var rand = Math.random();
            rand = Math.floor(rand * 100000).toString(16);
            var cuid = util.padLeft(time, 11, '0') + '-' + util.padLeft(rand, 5, '0');
            return cuid.toUpperCase();
        },
        /**
         * 判断是否为 null 或者 undefined
         * @param {*} data 需要判断的变量
         * @return {boolean} 返回该变量是否为 null 或者 undefined
         */
        isNullOrUndefined: function(data) {
            return data === null || data === undefined;
        },
        /**
         * 通过字符串来获取当前对象的属性，避免写太多判断
         * @param {Object} context 目标对象
         * @param {string} str 属性层次，如 a.b.c
         * @return {*} 返回获取到的值
         */
        getVal: function(context, str) {
            str = str.replace(/^this\./, '');
            if (/^(?:\s*|this)$/.test(str) || util.isNullOrUndefined(context)) {
                return context;
            }
            var keyArr = str.split('.');
            for (var i = 0; i < keyArr.length; i += 1) {
                context = context[keyArr[i]];
                if (util.isNullOrUndefined(context)) {
                    break;
                }
            }
            return context;
        },
        /**
         * 路径解析，将 '/' 解析成 '.'
         * @param {string} basepath 基础路径
         * @param {string} path 需要添加的路径
         * @return {string} 返回解析的结果路径
         */
        resolvePath: function(basepath, path) {
            // 第一步，将基准路径中的 '.' 替换成 '/'
            basepath = basepath.replace(/(\w+|^|\/)\./g, '$1/');
            // 第二步，在基准路径末尾添加 '/'
            basepath += '/';
            path = path || '';
            // 第三步，将添加路径中的 '.' 替换成 '/'
            path = path.replace(/(\w+)\./g, '$1/');

            path = (basepath + path).split('/');
            var arr = [];
            for (var i = 0; i < path.length; i += 1) {
                if (!path[i]) {
                    continue;
                }
                if (path[i] === '..') {
                    arr.pop();
                }
                else if (!/^(?:\.|this)$/.test(path[i])) {
                    arr.push(path[i]);
                }
                // console.log(path[i], arr);
            }
            return arr.join('.');
        },
        /**
         * 根据当前环境，将变量列表解析成值
         * @param {Object} context 当前环境对象
         * @param {Array.<string>} args 变量列表
         * @return {Array.<*>} 返回解析后的变量列表
         */
        resolveArgs: function(context, args) {
            var ret = [];
            for (var i = 0; i < args.length; i += 1) {
                var arg = args[i];
                if ('this' === arg) {
                    ret.push(context);
                }
                else if (typeof util.getVal(context, arg) !== 'undefined') {
                    ret.push(util.getVal(context, arg));
                }
                else if (/^[\d.]+$/.test(arg)) {
                    ret.push(parseFloat(arg));
                }
                else if (/^['"]/.test(arg) && /['"]$/.test(arg)) {
                    ret.push(arg.replace(/^['"]|['"]$/g, ''));
                }
                else if (/^!/.test(arg)) {
                    ret.push(!context[arg.replace(/^!/, '')]);
                }
                else {
                    ret.push(arg);
                }
            }
            return ret;
        },
        /**
         * html 编码
         * @param {string} str 需要编码的字符串
         * @return {string} 返回编码后的结果
         */
        escapeHtml: function(str) {
            var map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                '\'': '&#x27;',
                '/': '&#x2f;',
                '\\': '&#x5c;',
                'reg': /[&<>"'\\\/]/g
            };
            return (str + '').replace(map.reg, function($0) {
                return map[$0];
            });
        }
    };

    /**
     * xtmpl 对象
     * @type {Object}
     */
    var xtmpl = {};
    /**
     * 数据存储对象，用于储存临时数据
     * @type {Object}
     */
    var _dataStore = {};
    /**
     * helper 存储，用于储存 helper 函数
     * @type {Object}
     */
    var _helper = {};
    /**
     * 配置存储
     * @type {Object}
     */
    var _config = {
        /**
         * 配置是否需要对变量进行 HTML 编码
         * @type {boolean}
         */
        escapeHtml: true
    };

    /**
     * xtmpl 用于注册 helper 的接口
     * @param {string} name helper 名称
     * @param {Function} fn helper 函数
     */
    xtmpl.registerHelper = function(name, fn) {
        _helper[name] = fn;
    };

    /**
     * xtmpl 用于修改或写入配置的接口
     * @param {string|Object} key 配置名称，或配置对象
     * @param {*?} value 配置值
     */
    xtmpl.config = function(key, value) {
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
     * xtmpl 模板编译接口
     * @param {string} tmplStr 模板字符串
     * @return {Function} 返回编译后的模板处理函数
     */
    xtmpl.compile = function(tmplStr) {
        // {{#name arg1 arg2}} xxxxx {{/name}}
        var blockHelperReg = /\{\{#\s*(\w+)(?:\s+([^}]+))?\s*\}\}([\s\S]*)\{\{\/\s*\1\s*\}\}/g;
        tmplStr = tmplStr.replace(blockHelperReg, function($, $1, $2, $3) {
            if (!_helper[$1]) {
                throw new Error('has no helper named ' + $1);
            }
            // helper
            var options = {
                fn: xtmpl.compile($3),
                args: ($2 || 'this').split(/\s+/)
            };

            var id = util.getCuid();
            _dataStore[id] = options;
            return '{{' + $1 + ' ' + id + '}}';
        });
        
        /**
         * xtmpl 模板解析后返回的接口函数
         * @param {Object} context 当前环境对象
         * @param {Object?} options 解析的配置
         * @return {string} 返回解析后的字符串
         */
        return function replacer(context, options) {
            options = options || {};
            if (!options.data) {
                options.data = context;
                options.curpath = './';
            }
            return tmplStr.replace(/\{\{\s*([^}]+)\s*\}\}/g, function($, $1) {
                var arr = $1.split(/\s+/);
                if (arr.length === 1) {
                    var path = util.resolvePath(options.curpath, $1);
                    var ret = util.getVal(options.data, path);
                    if (typeof ret === 'undefined') {
                        ret = util.getVal(options.extendData, $1);
                    }
                    if (_config.escapeHtml) {
                        ret = util.escapeHtml(ret);
                    }
                    return ret;
                }
                else {
                    var fn = _helper[arr[0]];
                    var opt = _dataStore[arr[1]] || {};
                    opt.data = options.data;
                    opt.curpath = options.curpath;
                    if (!opt.fn) {
                        opt.args = arr.slice(1);
                    }
                    var args = util.resolveArgs(context, opt.args);
                    return fn.apply(context, args.concat(opt));
                }
            });
        };
    };

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
(function(xtmpl){
    /**
     * 注册 helper_if 用于简单的逻辑判断
     * @param {*} arg 需要判断的参数
     * @param {Object} options 其他参数，包括内部模板等信息
     * @return {string} 返回解析后的字符串
     */
    xtmpl.registerHelper('if', function helper_if(arg, options) {
        if (!arg) {
            return '';
        }
        return options.fn(this);
    });

    /**
     * 注册 helper_each 用于遍历操作
     * @param {Object} data 需要处理的对象或数组
     * @param {Object} options 其他参数，包括内部模板及 path 等信息
     * @return {string} 返回解析后的字符串
     */
    xtmpl.registerHelper('each', function helper_each(data, options) {
        var arg = options.args[0];
        // var data = this[arg];
        var path = options.curpath + '.' + arg;
        var str = '';
        var i;
        if (data.push && data.length) {
            for (i = 0; i < data.length; i += 1) {
                options.curpath = path + '.' + i;
                options.extendData = {
                    key: i,
                    index: i,
                    value: data[i],
                    first: i === 0
                };
                str += options.fn(data[i], options);
            }
        }
        else {
            for (i in data) {
                if (!data.hasOwnProperty(i)) {
                    continue;
                }
                options.curpath = path + '.' + i;
                options.extendData = {
                    key: i,
                    index: i,
                    value: data[i]
                };
                str += options.fn(data[i], options);
            }
        }
        return str;
    });

    /**
     * 注册 helper_with 用于改变当前的作用域
     * @param {Object} data 需要改变为的作用域对象
     * @param {Object} options 其他参数，包括内部模板及 path 等信息
     * @return {string} 返回解析后的字符串
     */
    xtmpl.registerHelper('with', function helper_with(context, options){
        var argName = options.args[0];
        options.curpath = options.curpath + '.' + argName;
        return options.fn(context, options);
    });
})(this.xtmpl);

/**
 * 兼容 cmd 模块化代码
 */
(function(xtmpl) {
    if ('object' === typeof module && module && 'object' === typeof module.exports) {
        // node.js 环境
        module.exports= xtmpl;
    }
    else if ('function' === typeof define && define.amd) {
        // cmd 环境
        define('xtmpl', [], function() {
            return xtmpl;
        });
    }
})(this.xtmpl);