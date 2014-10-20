/// <reference path="_dependencies.ts" />
module Game {

    // server has perfect knowledge of the game.  validates all moves.
    export class GameServer implements ProxyListener {
        private board: Board = new Board();
        private rulesIter: any;
        private proxies: BaseServerProxy[] = [];

        rulesGen: (game: any, board: Board) => {
            next(...args: any[]): any
        };
        newGameGen: (game: any, board: Board) => {
            next(...args: any[]): any
        };
        setupFunc: (board: Board) => void;
        whereList: any[] = [];

        addProxy(proxy: BaseServerProxy) {
            this.proxies.push(proxy);
        }

        removeProxy(proxy: BaseServerProxy) {
            var i = this.proxies.indexOf(proxy);
            if (i !== -1)
                this.proxies.splice(i, 1);
        }

        getProxies(userNames: string): BaseServerProxy[] {
            var inputNames = userNames.split(',');
            var proxies: BaseServerProxy[] = [];
            for (var i = 0; i < this.proxies.length; ++i) {
                for (var j = 0; j < inputNames.length; ++j) {
                    if (this.proxies[i].userNames.indexOf(inputNames[j]) !== -1) {
                        proxies.push(this.proxies[i]); // at least one of the users is in this proxy
                        break;
                    }
                }
            }
            return proxies;
        }

        setup() {
            if (typeof this.setupFunc === 'function')
                this.setupFunc(this.board);

            this.board.print();
        }

        newGame() {
            if (typeof this.newGameGen === 'function')
                this.rulesIter = this.newGameGen(Game, this.board);

            this.step(); // don't have user rules in the newGame!!!

            if (typeof this.rulesGen === 'function')
                this.rulesIter = this.rulesGen(Game, this.board);

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

                var userProxies = this.getProxies(nextRule.user);
                if (userProxies.length === 0) {
                    _error('user does not have proxy - ' + nextRule.user);
                    return false; // this.error('User does not have a proxy')
                }

                // concatenate all commands, there may be multiple commands from multiple proxies
                var batch = {
                    ruleId: nextRule.id,
                    commands: []
                };
                for (var i = 0; i < userProxies.length; ++i) {
                    var localBatch = userProxies[i].resolveRule(nextRule);
                    [].push.apply(batch.commands, localBatch.commands);
                }

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
        onSendCommands(batch: BatchCommand) {
            this.step(this.handleCommands(batch));
        }

        getUser(): string {
            return 'SERVER';
        }
    }
}
