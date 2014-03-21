define(function () {
    var util = {};

    /**
     * 函数节流
     * @param {Function} fn 需要执行的函数
     * @param {number} delay 节流限制时间，即多少时间内最多执行一次，单位ms
     * @return {Function} 返回添加节流后的函数
     */
    util.throttle = function(fn, delay){
        var timer = null;
        return function(){
            var context = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function(){
                fn.apply(context, args);
            }, delay);
        };
    };

    /**
     * html 编码的 map
     * @type {Object}
     */
    var ESCAPE_MAP = {
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
    util.escapeHTML = function (str) {
        return (str + '').replace(ESCAPE_MAP.reg, function ($0) {
            return ESCAPE_MAP[$0];
        });
    };

    return util;
});