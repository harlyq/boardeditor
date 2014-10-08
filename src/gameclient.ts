/// <reference path="board.ts" />

module Game {
    var getRandom = function < T > (list: T[]): T {
        return list[~~(Math.random() * list.length)];
    }

    export class Client {
        board: Board = new Board();
        showMoves: boolean = true;
        setupFunc: (board: Board) => void;

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
    }


    export class BankClient extends Client {
        resolveRule(rule: BaseRule): BaseCommand[] {
            switch (rule.type) {
                case 'move':
                    return this.resolveMove( < MoveRule > rule);
                case 'pick':
                    return this.resolvePick( < PickRule > rule);
            }

            return [];
        }

        private resolveMove(moveRule: MoveRule): MoveCommand[] {
            var fromLocations = this.board.queryLocations(moveRule.from);
            var toLocations = this.board.queryLocations(moveRule.to);
            var cards = this.board.queryCards(moveRule.cards);
            var maxCards = this.board.getNumCards();
            var moveCommands: MoveCommand[] = [];
            var cardIndex = 0;

            for (var i = 0; i < maxCards; ++i) {
                if (fromLocations.length === 0 && cards.length === 0)
                    break; // no from location, and no cards (remaining)

                if (toLocations.length === 0)
                    break; // Invalid too location

                var from = getRandom(fromLocations);
                var to = getRandom(toLocations);

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
                    type: 'move',
                    id: moveRule.id,
                    cardId: card.id,
                    toId: to.id,
                    index: index
                };
                moveCommands.push(moveCommand);

                if (this.isCountComplete(moveRule.quantity, moveRule.count, moveCommands.length))
                    break; // sufficient cards
            }

            return moveCommands;
        }


        private resolvePick(pickRule: BaseRule): PickCommand[] {
            return [];
        }
    }

    export class AI extends Client {

    }

    export class Human extends Client {

    }

}
