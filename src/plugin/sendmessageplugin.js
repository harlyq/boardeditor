/// <reference path="game.d.ts" />

var SendMessagePlugin;
(function (SendMessagePlugin) {
    var Game = require('./game');

    function createRule(board, rule) {
        return Game.extend({
            message: '',
            detail: {},
            bubbles: false
        }, board.createRule('sendMessage'), rule);
    }
    SendMessagePlugin.createRule = createRule;

    // use the default performRule, which converts the rule into a single command
    // performRule(client: Client, rule: BaseRule, results: any[]): boolean {}
    // nothing to update on the board
    // updateBoard(board: Game.Board, command: Game.BaseCommand, results: any[]): any {}
    function updateHTML(mapping, command) {
        if (command.type !== 'sendMessage')
            return;

        var sendMessageCommand = command;
        var event = new CustomEvent(sendMessageCommand.message, {
            bubbles: sendMessageCommand.bubbles,
            cancelable: sendMessageCommand.bubbles,
            detail: sendMessageCommand.detail
        });

        var boardElem = mapping.getBoardElem();
        boardElem.dispatchEvent(event);
    }
    SendMessagePlugin.updateHTML = updateHTML;
})(SendMessagePlugin || (SendMessagePlugin = {}));

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined') {
    exports.sendMessage = SendMessagePlugin;
}
