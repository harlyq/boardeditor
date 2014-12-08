/// <reference path="boardsystem.d.ts" />

interface LabelRule extends BoardSystem.BaseRule, BoardSystem.BaseCommand {
    key: any;
    labels: {
        [name: string]: boolean
    };
    affects ? : string;
}

module LabelPlugin {
    var BoardSystem = require('./boardsystem');

    export function createRule(board: BoardSystem.Board, rule: LabelRule): BoardSystem.BaseRule {
        var info = board.convertToIdString(rule.key);

        return BoardSystem.extend({
            key: '',
            labels: {},
            affects: rule.user || '' // by default we affect the user we send the command to
        }, board.createRule('label'), rule, {
            key: info.value
        });
    }

    // LabelRule is the command, just pass it through
    // export function performRule(client: BoardSystem.BaseClient, rule: BoardSystem.BaseRule, results: any[]): boolean

    export function updateClient(client: BoardSystem.BaseClient, command: BoardSystem.BaseCommand): boolean {
        if (command.type !== 'label')
            return false;

        var labelCommand = < LabelRule > command,
            mapping = client.getMapping();

        if (!mapping)
            return true;

        if (BoardSystem.union(labelCommand.affects, mapping.getUser()).length === 0)
            return true; // command correct, but not intended for this user

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
}

if (typeof browserRequire === 'function')
    exports = browserRequire();

if (typeof exports !== 'undefined')
    exports.label = LabelPlugin;
