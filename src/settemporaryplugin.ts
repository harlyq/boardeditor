/// <reference path='_dependencies.ts' />

interface SetTemporaryRule extends Game.BaseRule {
    key: any;
    value: any;
    timeout: number; // seconds
}

module SetTemporaryPlugin {
    var Game = require('./game');

    export function createRule(board: Game.Board, setTemporaryRule: SetTemporaryRule) {
        var type = 'setTemporaryCard',
            key: any = setTemporaryRule.key,
            keyArray = Array.isArray(key);

        if (keyArray && key.length === 0)
            Game._error('key is an empty array');

        if (key instanceof Game.Card || (keyArray && key[0] instanceof Game.Card)) {
            type = 'setTemporaryCard';
            key = board.convertCardsToString(key);
        } else if (key instanceof Game.Location || (keyArray && key[0] instanceof Game.Location)) {
            type = 'setTemporaryLocation';
            key = board.convertLocationsToString(key);
        } else {
            Game._error('unknown type of key - ' + key);
        }

        return Game.extend({
            timeout: 1.0
        }, board.createRule(type), setTemporaryRule, {
            key: key
        });
    }

    export function performRule(client: Game.Client, rule: Game.BaseRule, results: Game.BatchCommand[]) {
        if (rule.type !== 'setTemporaryCard' && rule.type !== 'setTemporaryLocation')
            return false;

        var nullBatch = Game.createBatchCommand(rule.id, client.getUser());

        // setTemporary does nothing on a non-HumanClient
        if (!(client instanceof Game.HumanClient)) {
            results.push(nullBatch);
            return false;
        }

        var setTemporaryRule = < SetTemporaryRule > rule,
            board = client.getBoard(),
            mapping = ( < Game.HumanClient > client).getMapping(),
            oldVariables = [],
            things = [],
            elems = [];

        switch (rule.type) {
            case 'setTemporaryCard':
                things = board.queryCards(setTemporaryRule.key);
                elems = mapping.getElemsFromCards(things);
                break;

            case 'setTemporaryLocation':
                things = board.queryLocations(setTemporaryRule.key);
                elems = mapping.getElemsFromLocations(things);
                break;
        }

        for (var i = 0; i < elems.length; ++i) {
            oldVariables.push(things[i].copyVariables(setTemporaryRule.value));
            mapping.applyVariables(elems[i], setTemporaryRule.value);
        }

        window.setTimeout(function() {
            for (var i = 0; i < elems.length; ++i)
                mapping.applyVariables(elems[i], oldVariables[i]);

            // tell the server to continue
            client.getProxy().sendCommands(nullBatch);

        }, setTemporaryRule.timeout * 1000);

        return true;
    }
};

declare
var exports: any;
declare
var browserRequire: any;

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.setTemporary = SetTemporaryPlugin;
