/// <reference path='game.d.ts' />

interface SetRule extends Game.BaseRule {
    key: any;
    value: any;
    affects: string; // affected users
}

interface SetCommand extends Game.BaseCommand {
    key: string;
    value: any;
    affects: string; // affected users
}

module SetPlugin {
    var Game = require('./game')

    export function createRule(board: Game.Board, setRule: SetRule) {
        var ruleType = 'setVariable',
            key: any = setRule.key,
            keyArray = Array.isArray(key);

        var info = board.convertToIdString(key);
        switch (info.type) {
            case 'card':
                ruleType = 'setCardVariable';
                break;
            case 'location':
                ruleType = 'setLocationVariable';
                break;
            case 'region':
                ruleType = 'setRegionVariable';
                break;
        }

        // note 'affects' is set to the 'user', and 'user' is set to the default
        return Game.extend({
            key: info.value,
            value: setRule.value,
            affects: setRule.user || ''
        }, board.createRule(ruleType));
    }

    // user the default performRuel, which uses the rule as a command
    // export function performRule(client: Game.Client, rule: Game.BaseRule, results: Game.BatchCommand[]) {

    // board is never updated, only the clients
    // export function updateBoard(board: Game.Board, command: Game.BaseCommand, results: any[]) {}

    export function updateHTML(board: Game.Board, mapping: Game.HTMLMapping, command: Game.BaseCommand) {
        if (command.type !== 'setCardVariable' && command.type !== 'setLocationVariable')
            return;

        var setCommand = < SetCommand > command,
            elems = [];

        if (setCommand.affects && setCommand.affects.indexOf(mapping.getUser()) === -1)
            return; // does not affect this user

        switch (command.type) {
            case 'setCardVariable':
                elems = mapping.getElemsFromCardIds(setCommand.key);
                break;

            case 'setLocationVariable':
                elems = mapping.getElemsFromLocationIds(setCommand.key);
                break;

        }

        for (var i = 0; i < elems.length; ++i)
            mapping.applyVariables(elems[i], setCommand.value);
    }
};

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.set = SetPlugin;
