/// <reference path="board.ts" />
/// <reference path="proxy.ts" />
module Game {

    // server has perfect knowledge of the game.  validates all moves.
    export class GameServer {
        private board: Board = new Board();
        private rulesIter: any;
        private proxies: BaseProxy[] = [];
        private lastValue: any;

        rulesGen: (board: Board) => {
            next(...args: any[]): any
        };
        newGameGen: (board: Board) => {
            next(...args: any[]): any
        };
        setupFunc: (board: Board) => void;
        whereList: any[] = [];

        addProxy(proxy: BaseProxy) {
            this.proxies.push(proxy);
        }

        removeProxy(proxy: BaseProxy) {
            var i = this.proxies.indexOf(proxy);
            if (i !== -1)
                this.proxies.splice(i, 1);
        }

        getProxy(user: string): BaseProxy {
            for (var i = 0; i < this.proxies.length; ++i) {
                if (this.proxies[i].user === user)
                    return this.proxies[i];
            }
            return null;
        }

        // moves: GameMove[] = [];

        // newGame() {
        //     this.moves.length = 0;
        // }

        // moveCard(move: GameMove) {
        //     if (!this.validate(move))
        //         return;

        //     this.moves.push(move);
        //     move.id = this.moves.length;

        //     var from = this.game.findLocation(move.fromId),
        //         to = this.game.findLocation(move.toId),
        //         card = this.game.findCard(move.cardId);

        //     if (!card && from) {
        //         card = from.getCard();
        //         move.cardId = card.id;
        //     }

        //     from.removeCard(card);
        //     to.addCard(card);
        // }

        // getMoves(userId: number, lastMove: number): GameMove[] {
        //     var userMoves = [];
        //     for (var i = lastMove + 1; i < this.moves.length; ++i) {
        //         var move = this.moves[i],
        //             from = this.game.findLocation(move.fromId),
        //             to = this.game.findLocation(move.toId),
        //             card = this.game.findCard(move.cardId),
        //             toVisibility = to.getVisibility(userId),
        //             fromVisibility = from.getVisibility(userId),
        //             newMove = extend({}, move);

        //         if (fromVisibility === GameLocation.Visibility.None && toVisibility === GameLocation.Visibility.None)
        //             continue; // user knows nothing about these locations, so hide the move

        //         if (fromVisibility < GameLocation.Visibility.FaceUp && toVisibility < GameLocation.Visibility.FaceUp)
        //             newMove.cardId = -1; // user knows the locations, but not the card, so hide the card

        //         userMoves.push(newMove);
        //     }

        //     return userMoves;
        // }

        // validate(msg: GameMove): boolean {
        //     return this.game.findLocation(msg.fromId) !== null && this.game.findLocation(msg.toId) !== null;
        // }

        setup() {
            if (typeof this.setupFunc === 'function')
                this.setupFunc(this.board);

            this.board.print();
        }

        newGame() {
            if (typeof this.newGameGen === 'function')
                var newGameIter = this.newGameGen(this.board);

            var bankProxy = this.getProxy('BANK');
            var result: any = {
                done: false
            }

            while (!result.done) {
                result = newGameIter.next(this.lastValue);
                var rule = result.value;

                if (!result.done) {
                    console.log(rule);
                    var commands = bankProxy.resolveRule(rule);
                    this.lastValue = this.board.performCommand(commands);

                    for (var i = 0; i < this.proxies.length; ++i)
                        this.proxies[i].update(commands);

                    this.board.print();
                }
            }

            if (typeof this.rulesGen === 'function')
                this.rulesIter = this.rulesGen(this.board);

            delete this.lastValue;
        }

        step(): boolean {
            if (!('next' in this.rulesIter))
                return;

            var result = this.rulesIter.next(this.lastValue);
            if (result.done)
                return false; // this.error('rules completed')

            var nextRule: BaseRule = result.value;
            var userProxy = this.getProxy(nextRule.user);
            if (!userProxy)
                return false; // this.error('User does not have a proxy')

            console.log(nextRule);
            var commands = userProxy.resolveRule(nextRule);
            this.lastValue = this.board.performCommand(commands);

            for (var i = 0; i < this.proxies.length; ++i)
                this.proxies[i].update(commands);

            this.board.print();

            return true;
        }
    }
}
