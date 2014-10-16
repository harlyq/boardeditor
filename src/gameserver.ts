/// <reference path="_dependencies.ts" />
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
                if (result.done) {
                    console.log('RULES COMPLETE');
                    return true;
                }

                var nextRule: BaseRule = result.value;
                console.log(nextRule);

                var userProxy = this.getProxy(nextRule.user);
                if (!userProxy) {
                    _error('user does not have proxy - ' + nextRule.user);
                    return false; // this.error('User does not have a proxy')
                }

                var batch = userProxy.resolveRule(nextRule);
                nextValue = this.handleCommands(batch);
            } while (batch && batch.commands.length > 0) // while we're not waiting for commands

            return true;
        }

        private handleCommands(batch: BatchCommand): any {
            if (!batch || batch.commands.length === 0)
                return undefined;

            var commands = batch.commands;
            var nextValue = undefined;
            for (var i = 0; i < commands.length; ++i)
                nextValue = this.board.performCommand(commands[i]);

            for (var i = 0; i < this.proxies.length; ++i)
                this.proxies[i].updateCommands(batch);

            this.board.print();

            return nextValue;
        }

        // server only supports sendCommands
        onSendCommands(batch: BatchCommand): any {
            this.step(this.handleCommands(batch));
        }
    }
}
