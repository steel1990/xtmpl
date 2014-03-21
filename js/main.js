require.config({
    baseUrl: 'js',
    paths: {
        xtmpl: 'http://rawgithub.com/steel1990/xtmpl/master/src/xtmpl.min',
        jquery: 'lib/jquery-2.0.3.min',
        ace: 'lib/ace/ace'
    },
    shim: {
        treeview: {
            deps: ['jquery']
        },
        ace: {
            exports: 'ace'
        }
    }
});

define('defaultJSON', [], function () {
    return JSON.stringify({
        "greeting": "Hi, there are some JScript books you may find interesting:",
        "books": [
            {
                "title": "JavaScript: The Definitive Guide",
                "author": "David Flanagan",
                "price": "31.18"
            },
            {
                "title": "Murach JavaScript and DOM Scripting",
                "author": "Ray Harris"
            },
            {
                "title": "Head First JavaScript",
                "author": "Michael Morrison",
                "price": "29.54"
            },
            {
                "title": "pro JavaScript",
                "author": "NCZ"
            }
        ]
    }, null, 4);
});

define('defaultTpl', [], function () {
    return [
        '<h2>{{greeting}}</h2>',
        '{{#for books}}',
        '    <div style="background-color: {{#if $key % 2}}cyan{{/if}}">',
        '        [{{$key}}] {{title}} by {{author}}',
        '        {{#if price}}',
        '            Price: <span style="color:red">{{price}}</span>',
        '        {{/if}}',
        '    </div>',
        '{{/for}}',
        'Total: {{books.length}}'
    ].join('\n');
});

define('main', ['jquery'], function ($) {
    var jsonEditor = null;
    var tplEditor = null;

    var main = {};

    main.initHeaderPanels = function () {
        $('#panels').click(function (evt) {
            var $target = $(evt.target);
            if (!$target.hasClass('button')) {
                return;
            }
            var $ele = $('#box .container .' + $target.attr('data-name'));
            if ($target.hasClass('active')) {
                $ele.hide();
            } else {
                $ele.show();
            }
            $target.toggleClass('active');
        });
    };

    main.initEditor = function () {
        require(['Editor', 'xtmpl', 'util'], function (Editor, xtmpl, util) {
            var render = util.throttle(function () {
                var renderType = $('#preview-type').val();
                var renderResult = '';

                var data = jsonEditor.getValue();
                var tpl = tplEditor.getValue();

                try {
                    data = JSON.parse(data);
                    tpl = xtmpl.compile(tpl);
                    renderResult = tpl(data);
                    if (renderType === 'html') {
                        renderResult = '<pre>' + util.escapeHTML(renderResult) + '</pre>';
                    }
                } catch (err) {
                    console.log(err);
                    return;
                }

                var doc = $('#preview-iframe')[0].contentDocument;
                doc.open();
                doc.write(renderResult);
                doc.close();
            }, 100);

            jsonEditor = new Editor({
                id: 'json-input',
                name: 'JSON',
                theme: 'chrome',
                language: 'json',
                lsNameContent: 'cache-data-json-input',
                lsNamePath: 'cache-data-json-path',
                defaultValueName: 'defaultJSON',
                onchange: render
            });

            tplEditor = new Editor({
                id: 'tpl-input',
                name: 'TPL',
                theme: 'chrome',
                language: 'html',
                lsNameContent: 'cache-data-tpl-input',
                lsNamePath: 'cache-data-tpl-path',
                defaultValueName: 'defaultTpl',
                onchange: render
            });

            $('#preview-type').bind('change', render);
        });
    };
    return main;
});

require(['main'], function (main) {
    main.initHeaderPanels();
    main.initEditor();
});