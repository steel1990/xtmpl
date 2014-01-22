xtmpl
=====
[![Build Status](https://travis-ci.org/steel1990/xtmpl.png?branch=master)](https://travis-ci.org/steel1990/xtmpl)

xtmpl 是一个简单的js模板引擎

## 模板语法
### 简单插入

    xtmpl.compile('aa{{b}}cc')({ b: '<span>' }); // aa&lt;span&gt;cc
    // 对 html 不编码
    xtmpl.compile('aa{{=b}}cc')({ b: '<span>' }); // aa<span>cc
    // 也可以使用全局配置，让其不编码
    xtmpl.config('escapeHtml', false);
    xtmpl.compile('aa{{b}}cc')({ b: '<span>' }); // aa<span>cc

    // 可以使用 this
    xtmpl.compile('aa{{=this}}cc')('<span>'); // aa<span>cc

### 逻辑判断
    xtmpl.compile('if{{#if this}}xxx{{/if}}end')(0); // ifend
    xtmpl.compile('if{{#if this}}xxx{{/if}}end')(1); // ifxxxend
    xtmpl.compile('if{{#if !this}}xxx{{/if}}end')(0); // ifxxxend

### 数组遍历
    xtmpl.compile('{{#for list}}{{$value}}{{/for}}')({ list: [1, 2, 3] }); // 123
    xtmpl.compile('{{#for this}}{{$value}}{{/for}}')([1, 2, 3]); // 123
    xtmpl.compile('{{#for this}}{{#if $key}};{{/if}}{{$key}}:{{$value}}{{/for}}')([1, 2, 3]); // 0:1;1:2;2:3

    xtmpl.compile('{{#for list}}{{k}}{{/for}}')({
        list: [{
            k: 1
        }, {
            k: 2
        }]
    }); // 12

### 对象遍历
    xtmpl.compile('{{#forin obj}}{{$key}}:{{$value}};{{/forin}}')({
        obj: {
            a: 1,
            b: 2,
            c: 3
        }
    }); // a:1;b:2;c:3;