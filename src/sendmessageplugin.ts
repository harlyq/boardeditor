/// <reference path="_dependencies.ts" />

interface SendMessageRule extends Game.BaseRule {
    message: string;
    value: any;
}

interface SendMessageCommand extends Game.BaseCommand {
    message: string;
    value: any;
}

class SendMessagePlugin {
    createRule(board: Game.Board, rule: SendMessageRule): Game.BaseRule {
        return Game.extend({
            message: '',
            value: {}
        }, board.createRule('sendMessage'), rule)
    }

    // use the default performRule, which converts the rule into a single command
    // performRule(client: Client, rule: BaseRule, results: any[]): boolean {

    updateBoard(board: Game.Board, command: Game.BaseCommand, results: any[]): any {

    }

    updateMapping(board: Game.Board, mapping: Game.HTMLMapping, command: Game.BaseCommand) {}
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
