/// <reference path='boardsystem.d.ts' />

interface SetTemporaryRule extends BoardSystem.BaseRule {
    key: any;
    value: any;
    timeout: number; // seconds
}

module SetTemporaryPlugin {
    var BoardSystem = require('./boardsystem');

    export function createRule(board: BoardSystem.Board, setTemporaryRule: SetTemporaryRule) {
        var type = 'setTemporaryCard',
            key: any = setTemporaryRule.key,
            keyArray = Array.isArray(key);

        if (keyArray && key.length === 0)
            BoardSystem._error('key is an empty array');

        if (key instanceof BoardSystem.Card || (keyArray && key[0] instanceof BoardSystem.Card)) {
            type = 'setTemporaryCard';
            key = board.convertCardsToIdString(key);
        } else if (key instanceof BoardSystem.Location || (keyArray && key[0] instanceof BoardSystem.Location)) {
            type = 'setTemporaryLocation';
            key = board.convertLocationsToIdString(key);
        } else {
            BoardSystem._error('unknown type of key - ' + key);
        }

        return BoardSystem.extend({
            timeout: 1.0
        }, board.createRule(type), setTemporaryRule, {
            key: key
        });
    }

    export function performRule(client: BoardSystem.BaseClient, rule: BoardSystem.BaseRule, results: any[]) {
        if (rule.type !== 'setTemporaryCard' && rule.type !== 'setTemporaryLocation')
            return false;

        // setTemporary does nothing on a non-HumanClient
        if (!(client instanceof BoardSystem.HTMLClient))
            return true;

        var setTemporaryRule = < SetTemporaryRule > rule,
            board = client.getBoard(),
            mapping = ( < BoardSystem.HTMLClient > client).getMapping(),
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
            oldVariables.push(mapping.copyVariables(elems[i], setTemporaryRule.value));
            mapping.applyVariables(elems[i], setTemporaryRule.value);
        }

        window.setTimeout(function() {
            for (var i = 0; i < elems.length; ++i)
                mapping.applyVariables(elems[i], oldVariables[i]);

            // tell the server to continue
            client.sendUserCommands(rule.id, []);

        }, setTemporaryRule.timeout * 1000);

        return true;
    }
};

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.setTemporary = SetTemporaryPlugin;
