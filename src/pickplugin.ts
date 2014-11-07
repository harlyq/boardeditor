/// <reference path="_dependencies.ts" />
/// <reference path="htmlmapping.ts" />
/// <reference path="humanclient.ts" />

interface PickRule extends Game.BaseRule {
    list: any;
    quantity ? : Game.Quantity;
    count ? : number;
    where ? : number;
    whereIndex ? : number; // internal, use where instead
}

interface PickCommand extends Game.BaseCommand {
    values: any[]; // picked items
}

module PickPlugin {

    export function createRule(board: Game.Board, rule: PickRule): Game.BaseRule {
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
                list = board.convertLocationsToString(list);
            } else if (item instanceof Game.Card) {
                type = 'pickCard';
                list = board.convertCardsToString(list);
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
        }, board.createRule(type), rule, {
            list: list
        });
    }

    export function performCommand(board: Game.Board, command: Game.BaseCommand, results: any[]): boolean {
        var pickCommand = < PickCommand > command;

        switch (command.type) {
            case 'pick':
                results.push(pickCommand.values);
                return true;

            case 'pickLocation':
                results.push(board.queryLocations(pickCommand.values.join(',')));
                return true;

            case 'pickCard':
                results.push(board.queryCards(pickCommand.values.join(',')));
                return true;
        }

        return false;
    }

    // returns an array of valid BatchCommands
    export function performRule(client: Game.Client, rule: Game.BaseRule, results: Game.BatchCommand[]): boolean {
        switch (rule.type) {
            case 'pick':
            case 'pickLocation':
            case 'pickCard':
                if (client instanceof HumanClient)
                // don't build results, they will sent via Proxy.sendCommand()
                    new HTMLPick( < HumanClient > client, < PickRule > rule);
                else
                    findValidPickCommands(client.getBoard(), < PickRule > rule, results);
                return true;
        }

        return false;
    }

    function findValidPickCommands(board: Game.Board, pickRule: PickRule, results: Game.BatchCommand[]) {
        var where: any = pickRule.where || function() {
            return true;
        }

        var pickList = getPickList(board, pickRule),
            numPickList = pickList.length;

        for (var i = 0; i < numPickList; ++i) {
            if (!isCountComplete(pickRule.quantity, pickRule.count, i))
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

            } while (nextCombination(indices, numPickList - 1));
        }
    }

    function getPickList(board: Game.Board, pickRule: PickRule): any[] {
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
                list = board.queryLocations(rawList.join(','));
                break;
            case 'pickCard':
                list = board.queryCards(rawList.join(','));
                break;
        }


        return list.filter(where);
    }

    // return false if no remaining combinations
    export function nextCombination(list: number[], max: number): boolean {
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

    function isCountComplete(quantity: Game.Quantity, count: number, value: number): boolean {
        switch (quantity) {
            case Game.Quantity.All:
                return false; // all must be accounted for elsewhere
            case Game.Quantity.Exactly:
                return value === count;
            case Game.Quantity.AtMost:
                return value <= count;
            case Game.Quantity.AtLeast:
                return value >= count;
            case Game.Quantity.MoreThan:
                return value > count;
            case Game.Quantity.LessThan:
                return value < count;
        }
        return false;
    }

    export class HTMLPick {
        private pickList: any[] = [];
        private lastRuleId: number = 0;
        private board: Game.Board;
        private highlightElems: HTMLElement[] = [];
        private proxy: Game.BaseClientProxy = null;
        private mapping: HTMLMapping = null;
        private pickHandler = this.onPickLocation.bind(this);

        CLASS_HIGHLIGHT: string = 'highlight';

        constructor(private client: HumanClient, pickRule: PickRule) {
            this.proxy = client.getProxy();
            this.board = client.getBoard();
            this.mapping = client.mapping;

            this.showHTMLPick(pickRule);
        }

        private destroy() {
            this.pickList = [];
            this.board = null;
            this.highlightElems = [];
            this.proxy = null;
            this.mapping = null;
        }


        private createPickCommand(type: string, values: any): PickCommand {
            return Game.extend({
                type: type,
                values: values
            });
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

            this.destroy();
        }

        private showHTMLPick(pickRule: PickRule) {
            this.pickList = getPickList(this.board, pickRule);

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
            element.addEventListener("click", this.pickHandler);
        }

        private clearHighlights() {
            for (var i = 0; i < this.highlightElems.length; ++i) {
                var element = this.highlightElems[i];
                element.classList.remove(this.CLASS_HIGHLIGHT);
                element.removeEventListener("click", this.pickHandler);
            }

            this.highlightElems = [];
        }
    }
}

Game.registerPlugin('pick', {
    createRule: PickPlugin.createRule,
    performRule: PickPlugin.performRule,
    performCommand: PickPlugin.performCommand
});

// var list = [0];
// while (PickPlugin.nextCombination(list, 6))
//     console.log(list);

// var list = [0, 1];
// while (PickPlugin.nextCombination(list, 6))
//     console.log(list);

// var list = [0, 1, 2];
// while (PickPlugin.nextCombination(list, 6))
//     console.log(list);

// var list = [0, 1, 2, 3];
// while (PickPlugin.nextCombination(list, 6))
//     console.log(list);
