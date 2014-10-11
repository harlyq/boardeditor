/// <reference path="board.ts" />
/// <reference path="proxy.ts" />
module Game {

    // server has perfect knowledge of the game.  validates all moves.
    export class GameServer implements ProxyListener {
        private board: Board = new Board();
        private rulesIter: any;
        private proxies: BaseProxy[] = [];

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
                this.rulesIter = this.newGameGen(this.board);

            this.step(); // don't have user rules in the newGame!!!

            if (typeof this.rulesGen === 'function')
                this.rulesIter = this.rulesGen(this.board);

            this.step();
        }

        step(nextValue ? : any): boolean {
            if (!('next' in this.rulesIter))
                return;

            do {
                var result = this.rulesIter.next(nextValue);
                if (result.done)
                    return true; // this.error('rules completed')

                var nextRule: BaseRule = result.value;
                var userProxy = this.getProxy(nextRule.user);
                if (!userProxy)
                    return false; // this.error('User does not have a proxy')

                console.log(nextRule);
                var commands = userProxy.resolveRule(nextRule);
                nextValue = this.handleCommands(commands);
            } while (commands.length > 0) // while we're not waiting for commands

            return true;
        }

        private handleCommands(commands: BaseCommand[]): any {
            if (commands.length === 0)
                return undefined;

            var nextValue = undefined;
            for (var i = 0; i < commands.length; ++i)
                nextValue = this.board.performCommand(commands[i]);

            for (var i = 0; i < this.proxies.length; ++i)
                this.proxies[i].updateCommands(commands);

            this.board.print();

            return nextValue;
        }

        // server only supports sendCommands
        onSendCommands(commands: BaseCommand[]): any {
            this.step(this.handleCommands(commands));
        }
    }
}
