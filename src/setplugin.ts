/// <reference path='_dependencies.ts' />

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
        var type = 'setVariable',
            key: any = setRule.key,
            keyArray = Array.isArray(key);

        if (keyArray && key.length === 0)
            Game._error('key is an empty array');

        if (key instanceof Game.Card || (keyArray && key[0] instanceof Game.Card)) {
            type = 'setCardVariable';
            key = board.convertCardsToString(key);
        } else if (key instanceof Game.Location || (keyArray && key[0] instanceof Game.Location)) {
            type = 'setLocationVariable';
            key = board.convertLocationsToString(key);
        } else if (typeof key !== 'string')
            Game._error('unknown type of key - ' + key);

        // note 'affects' is set to the 'user', and 'user' is set to the default
        return Game.extend({
            key: key,
            value: setRule.value,
            affects: setRule.user || ''
        }, board.createRule(type));
    }

    // user the default performRuel, which uses the rule as a command
    // export function performRule(client: Game.Client, rule: Game.BaseRule, results: Game.BatchCommand[]) {

    // board is never updated, only the clients
    // export function updateBoard(board: Game.Board, command: Game.BaseCommand, results: any[]) {}

    export function updateMapping(board: Game.Board, mapping: Game.HTMLMapping, command: Game.BaseCommand) {
        if (command.type !== 'setCardVariable' && command.type !== 'setLocationVariable')
            return;

        var setCommand = < SetCommand > command,
            elems = [];

        if (setCommand.affects && setCommand.affects.indexOf(mapping.user) === -1)
            return; // does not affect this user

        switch (command.type) {
            case 'setCardVariable':
                var cards = board.queryCards(setCommand.key);
                elems = mapping.getElemsFromCards(cards);
                break;

            case 'setLocationVariable':
                var locations = board.queryLocations(setCommand.key);
                elems = mapping.getElemsFromLocations(locations);
                break;

        }

        for (var i = 0; i < elems.length; ++i)
            mapping.applyVariables(elems[i], setCommand.value);
    }
};

declare
var exports: any;
declare
var browserRequire: any;

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.set = SetPlugin;
