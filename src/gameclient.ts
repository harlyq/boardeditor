/// <reference path="_dependencies.ts" />

module Game {
    var getRandom = function < T > (list: T[]): T {
        return list[~~(Math.random() * list.length)];
    }

    //-------------------------------
    export class Client implements ProxyListener {
        showMoves: boolean = true;
        whereList: any[];
        localVariables: {
            [name: string]: any
        } = {};

        constructor(public user: string, public proxy: BaseClientProxy, public board: Board) {}

        getProxy(): BaseClientProxy {
            return this.proxy;
        }

            setup() {}

            setLocalVariable(name: string, value: any) {
            this.localVariables[name] = value;
        }

            onResolveRule(rule: BaseRule): BatchCommand {
            var batch = {
                ruleId: rule.id,
                commands: []
            };
            switch (rule.type) {
                case 'move':
                    return this.resolveMove( < MoveRule > rule);

                case 'pick':
                case 'pickLocation':
                case 'pickCard':
                    return this.resolvePick( < PickRule > rule);

                case 'setVariable':
                    var setRule = < SetRule > rule;
                    batch.commands.push({
                        type: 'setVariable',
                        name: setRule.name,
                        value: setRule.value
                    });
                    return batch;

                case 'shuffle':
                    var shuffleRule = < ShuffleRule > rule;
                    var location = this.board.queryFirstLocation(shuffleRule.location);
                    batch.commands.push({
                        type: 'shuffle',
                        locationId: (location ? location.id : -1),
                        seed: shuffleRule.seed
                    });
            }

            return batch;
        }

            resolveMove(rule: MoveRule): BatchCommand {
            return {
                ruleId: rule.id,
                commands: []
            };;
        }

            resolvePick(rule: PickRule): BatchCommand {
            return {
                ruleId: rule.id,
                commands: []
            };;
        }

            isCountComplete(quantity: Quantity, count: number, value: number): boolean {
            switch (quantity) {
                case Quantity.All:
                    return false; // all must be accounted for elsewhere
                case Quantity.Exactly:
                    return value === count;
                case Quantity.AtMost:
                    return value <= count;
                case Quantity.AtLeast:
                    return value >= count;
                case Quantity.MoreThan:
                    return value > count;
                case Quantity.LessThan:
                    return value < count;
            }
            return false;
        }

            onUpdateCommands(batch: BatchCommand) {}

            getUser(): string {
            return this.user;
        }
    }


    //-------------------------------
    export class BankClient extends Client {

        resolveMove(moveRule: MoveRule): BatchCommand {
            var where: any = moveRule.where || function() {
                    return true;
                }
                // note: can only restrict where of 'to' locations, once from is defined
            var fromLocations = this.board.queryLocations(moveRule.from).filter(function(from) {
                return where(from, null);
            });
            var toLocations = this.board.queryLocations(moveRule.to);
            var cards = this.board.queryCards(moveRule.cards);
            var maxCards = this.board.getNumCards();
            var batch = {
                ruleId: moveRule.id,
                commands: []
            };
            var cardIndex = 0;

            if (toLocations.length === 0) {
                _error('invlaid too location - ' + moveRule.to);
                return batch;
            }

            if (fromLocations.length === 0 && cards.length === 0) {
                _error('invlaid from location, and no cards - ' + moveRule.from);
                return batch;
            }

            for (var i = 0; i < maxCards; ++i) {
                var from = getRandom(fromLocations);
                var to = getRandom(toLocations);
                if (!where(from, to))
                    continue; // try another from,to location combination

                var card: Card = null;
                if (from) {
                    card = from.getCard(moveRule.fromPosition);
                } else {
                    var k = 0; // in order ~~(Math.random() * cards.length);
                    card = cards[k];
                    cards.splice(k, 1);
                }
                if (!card)
                    break; // no cards at this location, or no cards remaining

                // in case from was null, get the position from the card
                from = card.location;

                var index = to.addCard(card, moveRule.toPosition);

                var moveCommand = {
                    type: moveRule.type,
                    id: moveRule.id,
                    cardId: card.id,
                    toId: to.id,
                    fromId: (from ? from.id : -1),
                    index: index
                };
                batch.commands.push(moveCommand);

                if (this.isCountComplete(moveRule.quantity, moveRule.count, batch.commands.length))
                    break; // sufficient cards

                if (fromLocations.length === 0 && cards.length === 0)
                    break; // used all of the cards
            }

            return batch;
        }


        resolvePick(pickRule: PickRule): BatchCommand {
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

            var pickList = list.filter(where);
            var values = [];

            while (pickList.length > 0 && !this.isCountComplete(pickRule.quantity, pickRule.count, values.length)) {
                var k = ~~(Math.random() * pickList.length);
                var pick = pickList[k];
                pickList.splice(k, 1); // if no duplicates

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

            return {
                ruleId: pickRule.id,
                commands: [{
                    type: pickRule.type,
                    values: values
                }]
            };
        }

    }

    //-------------------------------
    export class AIClient extends Client {

    }

}
