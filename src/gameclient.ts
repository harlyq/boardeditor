/// <reference path="_dependencies.ts" />

module Game {
    var getRandom = function < T > (list: T[]): T {
        return list[~~(Math.random() * list.length)];
    }

    //-------------------------------
    export class Client implements ProxyListener {
        showMoves: boolean = true;
        whereList: any[];
        private localVariables: {
            [name: string]: any
        } = {};

        constructor(public user: string, public proxy: BaseClientProxy, public board: Board) {
            this.applyProxyModules();
        }

        getProxy(): BaseClientProxy {
            return this.proxy;
        }

            getBoard(): Board {
            return this.board;
        }

            getUser(): string {
            return this.user;
        }

            setup() {
            this.onSetup();
        }

            onSetup() {}

            setLocalVariable(name: string, value: any) {
            this.localVariables[name] = value;
        }

            onResolveRule(rule: BaseRule): BatchCommand {
            switch (rule.type) {
                case 'move':
                    return this.resolveMove( < MoveRule > rule);
            }

            return null;
        }

            resolveMove(rule: MoveRule): BatchCommand {
            return {
                ruleId: rule.id,
                commands: []
            };
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

            applyProxyModules() {

        }
    }


    //-------------------------------
    export class BankClient extends Client {

        onResolveRule(rule: BaseRule): BatchCommand {
            var results = []
            for (var i in plugins) {
                if (plugins[i].performRule(this, rule, results))
                    return results[~~(Math.random() * results.length)]; // return a random option
            }

            return super.onResolveRule(rule);
        }

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


    }

    //-------------------------------
    export class AIClient extends Client {

    }

}
