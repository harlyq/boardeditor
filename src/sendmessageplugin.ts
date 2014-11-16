/// <reference path="_dependencies.ts" />

interface SendMessageRule extends Game.BaseRule, Game.BaseCommand {
    message: string;
    detail: any;
    bubbles ? : boolean;
}

class SendMessagePlugin {
    createRule(board: Game.Board, rule: SendMessageRule): Game.BaseRule {
        return Game.extend({
            message: '',
            detail: {},
            bubbles: false
        }, board.createRule('sendMessage'), rule)
    }

    // use the default performRule, which converts the rule into a single command
    // performRule(client: Client, rule: BaseRule, results: any[]): boolean {}

    // nothing to update on the board
    // updateBoard(board: Game.Board, command: Game.BaseCommand, results: any[]): any {}

    updateMapping(board: Game.Board, mapping: Game.HTMLMapping, command: Game.BaseCommand) {
        if (command.type !== 'sendMessage')
            return;

        var sendMessageCommand = < SendMessageRule > command;
        var event = new( < any > CustomEvent)(sendMessageCommand.message, {
            bubbles: sendMessageCommand.bubbles,
            cancelable: sendMessageCommand.bubbles,
            detail: sendMessageCommand.detail
        });

        var boardElem = mapping.getBoardElem();
        boardElem.dispatchEvent(event);
    }
}

declare
var browserRequire: any;
declare
var exports: any

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined') {
    for (var k in SendMessagePlugin)
        exports[k] = SendMessagePlugin[k];
}
