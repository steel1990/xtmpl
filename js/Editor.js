define(['ace', 'jquery'], function (ace, $) {
    function Editor(opt) {
        this.id = opt.id;
        this.name = opt.name;
        this.title = '';
        this.theme = 'ace/theme/' + (opt.theme || 'chrome');
        this.mode = 'ace/mode/' + (opt.language || 'js');
        this.lsNameContent = opt.lsNameContent;
        this.lsNamePath = opt.lsNamePath;
        this.defaultValueName = opt.defaultValueName;
        this.onchange = opt.onchange;

        this._aceEditor = null;

        this.init();
    }

    Editor.prototype.init = function () {
        this._aceEditor = ace.edit(this.id);
        this._aceEditor.setTheme(this.theme);
        this._aceEditor.getSession().setMode(this.mode);
        var value = localStorage[this.lsNameContent];
        if (value) {
            this.setValue(value);
        } else {
            var that = this;
            require([that.defaultValueName], function (value) {
                that.setValue(value);
            });
        }

        var path = localStorage[this.lsNamePath] || this.name || '';
        this.setTitle(path);

        var that = this;
        this._aceEditor.on('change', function () {
            localStorage[that.lsNameContent] = that.getValue();
            if (that.onchange) {
                that.onchange.apply(that, arguments);
            }
        });
    };

    Editor.prototype.getValue = function () {
        return this._aceEditor.getValue();
    };

    Editor.prototype.setValue = function (value) {
        this._aceEditor.setValue(value, 1);
        if (this.onchange) {
            this.onchange();
        }
    };

    Editor.prototype.setTitle = function(title) {
        this.title = title;
        localStorage[this.lsNamePath] = title;
        $('#' + this.id).parent().find('>header').attr('data-path', title).find('span').html(title);
    };

    return Editor;
});