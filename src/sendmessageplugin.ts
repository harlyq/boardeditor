/// <reference path="game.d.ts" />

interface SendMessageRule extends Game.BaseRule, Game.BaseCommand {
    message: string;
    detail: any;
    bubbles ? : boolean;
}

module SendMessagePlugin {
    var Game = require('./game');

    export function createRule(board: Game.Board, rule: SendMessageRule): Game.BaseRule {
        return Game.extend({
            message: '',
            detail: {},
            bubbles: false
        }, board.createRule('sendMessage'), rule)
    }

    // use the default performRule, which converts the rule into a single command
    // performRule(client: BaseClient, rule: BaseRule, results: any[]): boolean {}

    // nothing to update on the board
    export function updateBoard(client: Game.BaseClient, command: Game.BaseCommand, results: any[]): boolean {
        if (command.type !== 'sendMessage')
            return;

        var sendMessageCommand = < SendMessageRule > command,
            mapping = client.getMapping();

        if (!mapping)
            return;

        var event = new( < any > CustomEvent)(sendMessageCommand.message, {
            bubbles: sendMessageCommand.bubbles,
            cancelable: sendMessageCommand.bubbles,
            detail: sendMessageCommand.detail
        });

        var boardElem = mapping.getBoardElem();
        boardElem.dispatchEvent(event);
    }
}

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined') {
    exports.sendMessage = SendMessagePlugin;
}
