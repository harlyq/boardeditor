/// <reference path="boardsystem.d.ts" />

interface SendMessageRule extends BoardSystem.BaseRule, BoardSystem.BaseCommand {
    message: string;
    detail: any;
    bubbles ? : boolean;
}

module SendMessagePlugin {
    var BoardSystem = require('./boardsystem');

    export function createRule(board: BoardSystem.Board, rule: SendMessageRule): BoardSystem.BaseRule {
        return BoardSystem.extend({
            message: '',
            detail: {},
            bubbles: false
        }, board.createRule('sendMessage'), rule)
    }

    // use the default performRule, which converts the rule into a single command
    // performRule(client: BaseClient, rule: BaseRule, results: any[]): boolean {}

    // nothing to update on the board
    export function updateClient(client: BoardSystem.BaseClient, command: BoardSystem.BaseCommand): boolean {
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
