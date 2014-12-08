/// <reference path="game.d.ts" />

var LabelPlugin;
(function (LabelPlugin) {
    var Game = require('./game');

    function createRule(board, rule) {
        var info = board.convertToIdString(rule.key);

        return Game.extend({
            key: '',
            labels: {},
            affects: rule.user || ''
        }, board.createRule('label'), rule, {
            key: info.value
        });
    }
    LabelPlugin.createRule = createRule;

    // LabelRule is the command, just pass it through
    // export function performRule(client: Game.Client, rule: Game.BaseRule, results: any[]): boolean
    // Nothing to update in the board
    // updateBoard(board: Game.Board, command: Game.BaseCommand, results: any[]): any
    function updateHTML(mapping, command) {
        if (command.type !== 'label')
            return;

        var labelCommand = command;
        if (Game.union(labelCommand.affects, mapping.getUser()).length === 0)
            return;

        var elems = mapping.getElemsFromIds(labelCommand.key);
        for (var i = 0; i < elems.length; ++i) {
            var elem = elems[i];

            for (var k in labelCommand.labels) {
                if (labelCommand.labels[k])
                    elem.classList.add(k);
                else
                    elem.classList.remove(k);
            }
        }
    }
    LabelPlugin.updateHTML = updateHTML;
})(LabelPlugin || (LabelPlugin = {}));

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.label = LabelPlugin;
