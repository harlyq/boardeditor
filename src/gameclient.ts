/// <reference path="board.ts" />

module Game {
    var getRandom = function < T > (list: T[]): T {
        return list[~~(Math.random() * list.length)];
    }

    export class Client {
        board: Board = new Board();
        showMoves: boolean = true;
        setupFunc: (board: Board) => void;
        whereList: any[];

        constructor() {}

        setup() {
            this.setupFunc(this.board);
        }

        // requestMove(cardId: number, fromId: number, toId: number) {
        //     var msg: GameMove = {
        //         cardId: cardId,
        //         fromId: fromId,
        //         toId: toId
        //     };
        // }

        // applyMoves(moves: GameMove[]) {
        //     for (var i = 0; i < moves.length; ++i)
        //         this.applyMove(moves[i]);
        // }

        // applyMove(move: GameMove) {
        //     var from = this.board.findLocation(move.fromId),
        //         to = this.board.findLocation(move.toId),
        //         card = this.board.findCard(move.cardId);

        //     if (!card)
        //         card = from.getCard();

        //     from.removeCard(card);
        //     to.addCard(card);
        // }

        resolveRule(rule: BaseRule): BaseCommand[] {
            return []; // base class does nothing
        }

            isCountComplete(quantity: Quantity, count: number, value: number): boolean {
            switch (quantity) {
                case Quantity.All:
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

            update(commands: BaseCommand[]) {
            this.board.performCommand(commands);
        }
    }


    export class BankClient extends Client {
        resolveRule(rule: BaseRule): BaseCommand[] {
            switch (rule.type) {
                case 'move':
                    return this.resolveMove( < MoveRule > rule);
                case 'pick':
                case 'pickLocation':
                case 'pickCard':
                    return this.resolvePick( < PickRule > rule);
            }

            return [];
        }

        private resolveMove(moveRule: MoveRule): MoveCommand[] {
            var where: any = moveRule.where || function() {
                    return true;
                }
                // note: can only restrict where of 'to' locations, once from is defined
            var fromLocations = this.board.queryLocation(moveRule.from).filter(function(from) {
                return where(from, null);
            });
            var toLocations = this.board.queryLocation(moveRule.to);
            var cards = this.board.queryCard(moveRule.cards);
            var maxCards = this.board.getNumCards();
            var moveCommands: MoveCommand[] = [];
            var cardIndex = 0;

            if (toLocations.length === 0)
                return []; // Invalid too location

            if (fromLocations.length === 0 && cards.length === 0)
                return []; // no from location, and no cards (remaining)

            for (var i = 0; i < maxCards; ++i) {
                var from = getRandom(fromLocations);
                var to = getRandom(toLocations);
                if (!where(from, to))
                    continue; // try another from,to location combination

                var card: Card = null;
                if (from) {
                    card = from.getCard(moveRule.fromPosition);
                } else {
                    var k = ~~(Math.random() * cards.length);
                    card = cards[k];
                    cards.splice(k, 1);
                }
                if (!card)
                    break; // no cards at this location, or no cards remaining

                var index = to.addCard(card, moveRule.toPosition);

                var moveCommand = {
                    type: moveRule.type,
                    id: moveRule.id,
                    cardId: card.id,
                    toId: to.id,
                    index: index
                };
                moveCommands.push(moveCommand);

                if (this.isCountComplete(moveRule.quantity, moveRule.count, moveCommands.length))
                    break; // sufficient cards

                if (fromLocations.length === 0 && cards.length === 0)
                    return []; // no from location, and no cards (remaining)
            }

            return moveCommands;
        }


        private resolvePick(pickRule: PickRule): PickCommand[] {
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
                    list = this.board.queryLocation(rawList.join(','));
                    break;
                case 'pickCard':
                    list = this.board.queryCard(rawList.join(','));
                    break;
            }

            var pickList = list.filter(where);
            var values = [];

            while (pickList.length > 0 && !this.isCountComplete(pickRule.quantity, pickRule.count, values.length)) {
                var k = ~~(Math.random() * pickList.length);
                var pick = pickList[k];
                pickList.splice(k, 1); // if no duplicates

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

            return [{
                type: pickRule.type,
                id: pickRule.id,
                values: values
            }];
        }

    }

    export class AI extends Client {

    }

    export class Human extends Client {

    }

}
