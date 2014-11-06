/// <reference path="_dependencies.ts" />
/// <reference path="htmlmapping.ts" />
/// <reference path="humanclient.ts" />
module PickPlugin {

    export interface PickRule extends Game.BaseRule {
        list: any;
        quantity ? : Game.Quantity;
        count ? : number;
        where ? : number;
        whereIndex ? : number; // internal, use where instead
    }

    export interface PickCommand extends Game.BaseCommand {
        values: any[]; // picked items
    }

    export function createRule(rule: PickRule): Game.BaseRule {
        // this === board
        var type = '',
            list: any = rule.list;

        if (!list)
            Game._error('pickRule has no list');

        if (typeof list === 'string') {
            if (list === '')
                Game._error('pickRule list is an empty string');

            type = 'pick';

        } else if (Array.isArray(list)) {
            if (list.length === 0)
                Game._error('pickRule list is empty');

            var item = list[0];
            if (item instanceof Game.Location) {
                type = 'pickLocation';
                list = this.convertLocationsToString(list);
            } else if (item instanceof Game.Card) {
                type = 'pickCard';
                list = this.convertCardsToString(list);
            } else {
                type = 'pick';
            }
        } else {
            Game._error('pickRule list type is not a string or array - ' + list)
        }

        return Game.extend({
            list: '',
            quantity: Game.Quantity.Exactly,
            count: 1,
            where: null,
            whereIndex: -1
        }, this.createRule(type), rule, {
            list: list
        });
    }

    export function performCommand(board: Game.Board, command: Game.BaseCommand): any {
        var pickCommand = < PickCommand > command;

        switch (command.type) {
            case 'pick':
                return pickCommand.values;

            case 'pickLocation':
                return board.queryLocations(pickCommand.values.join(','));

            case 'pickCard':
                return board.queryCards(pickCommand.values.join(','));
        }

        return undefined; // command not supported by this rule
    }


    export function createPlugin(client: Game.Client): Game.BasePlugin {
        return new Plugin(client);
    }

    export class Plugin extends Game.BasePlugin {
        private pickList: any[] = [];
        private lastRuleId: number = 0;
        private board: Game.Board;
        private highlightElems: HTMLElement[] = [];
        private proxy: Game.BaseClientProxy = null;
        private mapping: HTMLMapping = null;
        private isHTML: boolean;

        CLASS_HIGHLIGHT: string = 'highlight';

        constructor(private client: Game.Client) {
            super();

            this.proxy = client.getProxy();
            this.board = client.getBoard();
            this.isHTML = (client instanceof HumanClient);
            if (this.isHTML) {
                this.mapping = ( < HumanClient > client).mapping;
            }
        }

        // returns an array of valid BatchCommands
        performRule(rule: Game.BaseRule, results: Game.BatchCommand[]): boolean {
            switch (rule.type) {
                case 'pick':
                case 'pickLocation':
                case 'pickCard':
                    if (this.isHTML)
                        this.showHTMLPick( < PickRule > rule, results);
                    else
                        this.findValidPickCommands( < PickRule > rule, results);
                    return true;
            }

            return false;
        }

        private createPickCommand(type: string, values: any): PickCommand {
            return Game.extend({
                values: values
            }, this.createCommand(type));
        }

        private findValidPickCommands(pickRule: PickRule, results: Game.BatchCommand[]) {
            var where: any = pickRule.where || function() {
                return true;
            }

            var pickList = this.getPickList(pickRule),
                numPickList = pickList.length;

            for (var i = 0; i < numPickList; ++i) {
                if (!this.isCountComplete(pickRule.quantity, pickRule.count, i))
                    continue;

                var indices = []
                for (var j = 0; j < i; ++j)
                    indices.push(j);

                do {
                    var values = [];

                    for (var k = 0; k < i; ++k) {
                        var pick = pickList[indices[k]];

                        // use name and id because the location structures on this client will be
                        // different from the location structurs on other clients, or on the server
                        switch (pickRule.type) {
                            case 'pick':
                                values.push(pick);
                                break;
                            case 'pickLocation':
                                values.push(pick.name);
                                break;
                            case 'pickCard':
                                values.push(pick.id);
                                break;
                        }
                    }

                    results.push({
                        ruleId: pickRule.id,
                        commands: [{
                            type: pickRule.type,
                            values: values
                        }]
                    });

                } while (Plugin.nextCombination(indices, numPickList - 1));
            }
        }

        // return false if no renaming combinations
        static nextCombination(list: number[], max: number): boolean {
            if (list.length === 0)
                return false; // nothing to iterate

            // sequence for 3 entries, max of 4
            // 0,1,2 (original) => 0,1,3 => 0,1,4 => 0,2,3 => 0,2,4 => 0,3,4 => 1,2,3 ...
            var k = 0;
            for (var i = list.length - 1; i >= 0; --i, ++k) {
                if (list[i] === max - k)
                    continue;

                list[i] = list[i] + 1;
                for (var j = i + 1; j < list.length; ++j)
                    list[j] = list[i] + j - i; // will always be <= max - k
                return true;
            }

            return false; // list contains the final iteration
        }

        private onPickLocation(e) {
            if (this.board.getVariable('currentPlayer') !== this.client.getUser())
                return;

            var location = this.mapping.getLocationFromElem(e.currentTarget);
            var i = this.pickList.indexOf(location);
            if (i === -1)
                return;

            // TODO check the number of picks
            this.pickList = [];
            this.clearHighlights();

            this.proxy.sendCommands({
                ruleId: this.lastRuleId,
                commands: [this.createPickCommand('pickLocation', [location.name])] // should this be a Location????
            });
        }

        private getPickList(pickRule: PickRule): any[] {
            var where: any = pickRule.where || function() {
                return true;
            }

            var list = [];
            var rawList: any = pickRule.list;
            if (typeof pickRule.list === 'string')
                rawList = ( < string > pickRule.list).split(',');
            if (!Array.isArray(rawList))
                rawList = [rawList];

            switch (pickRule.type) {
                case 'pick':
                    list = rawList;
                    break;
                case 'pickLocation':
                    list = this.board.queryLocations(rawList.join(','));
                    break;
                case 'pickCard':
                    list = this.board.queryCards(rawList.join(','));
                    break;
            }


            return list.filter(where);
        }

        private showHTMLPick(pickRule: PickRule, results: Game.BatchCommand[]) {
            this.pickList = this.getPickList(pickRule);
            this.clearHighlights();

            if (this.pickList.length === 0) {
                Game._error('no items in ' + pickRule.type + ' list - ' + pickRule.list + ', rule - ' + pickRule.where);
                return;
            }

            for (var i = 0; i < this.pickList.length; ++i) {
                var pick = this.pickList[i];

                switch (pickRule.type) {
                    case 'pick':
                        break;

                    case 'pickLocation':
                        var element = this.mapping.getElemFromLocationId(pick.id);
                        this.highlightElement(element);
                        break;
                    case 'pickCard':
                        var element = this.mapping.getElemFromCardId(pick.id);
                        this.highlightElement(element);
                        break;
                }
            }

            this.lastRuleId = pickRule.id;
        }

        private highlightElement(element: HTMLElement) {
            if (!element)
                return;

            this.highlightElems.push(element);
            element.classList.add(this.CLASS_HIGHLIGHT);
            element.addEventListener("click", this.onPickLocation.bind(this));
        }

        private clearHighlights() {
            for (var i = 0; i < this.highlightElems.length; ++i) {
                var element = this.highlightElems[i];
                element.classList.remove(this.CLASS_HIGHLIGHT);
                element.removeEventListener("click", this.onPickLocation.bind(this));
            }

            this.highlightElems = [];
        }
    }
}

Game.registerPlugin('pick', {
    createRule: PickPlugin.createRule,
    createPlugin: PickPlugin.createPlugin,
    performCommand: PickPlugin.performCommand
});

var list = [0];
while (PickPlugin.Plugin.nextCombination(list, 6))
    console.log(list);

var list = [0, 1];
while (PickPlugin.Plugin.nextCombination(list, 6))
    console.log(list);

var list = [0, 1, 2];
while (PickPlugin.Plugin.nextCombination(list, 6))
    console.log(list);

var list = [0, 1, 2, 3];
while (PickPlugin.Plugin.nextCombination(list, 6))
    console.log(list);
