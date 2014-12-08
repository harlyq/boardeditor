/// <reference path="_dependencies.ts" />
var BoardSystem;
(function (BoardSystem) {
    ;

    BoardSystem.plugins = {};

    function bindPlugin(board, name, info, key) {
        if (!info)
            return;

        if (typeof key === 'undefined')
            key = Object.keys(info)[0]; // get the first entry of info

        if (!key) {
            BoardSystem._error('no key specified in bindPlugin - ' + info);
            return;
        }
        info = info[key]; // PluginInfo

        console.log(name, info, key);

        BoardSystem.plugins[key] = info;

        if (!('createRule' in info))
            BoardSystem._error('no createRule for binding - ' + key);

        // bind the createRule function to the current board
        board[name] = function () {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                args[_i] = arguments[_i + 0];
            }
            args.splice(0, 0, this); // board as 1st argument
            return info.createRule.apply(this, args);
        };
    }
    BoardSystem.bindPlugin = bindPlugin;
})(BoardSystem || (BoardSystem = {}));
