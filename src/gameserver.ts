/// <reference path="_dependencies.ts" />
module Game {

    // server has perfect knowledge of the game.  validates all moves.
    export class GameServer implements ProxyListener {
        private board: Board = new Board();
        private rulesIter: any;
        private proxies: BaseServerProxy[] = [];
        private ruleUsers: string[] = [];
        private ruleBatch: BatchCommand = {
            ruleId: -1,
            commands: {}
        };
        public config: GameConfig = null;
        public gameId: number = -1;

        rulesGen: (board: Board) => {
            next(...args: any[]): any
        };
        newGameGen: (board: Board) => {
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

                this.ruleBatch = {
                    ruleId: nextRule.id,
                    commands: {}
                };
                this.ruleUsers = nextRule.user.split(',');

                var userProxies = this.getProxies(nextRule.user);
                if (userProxies.length === 0) {
                    _error('user does not have proxy - ' + nextRule.user);
                    return false; // this.error('User does not have a proxy')
                }

                // concatenate all commands, there may be multiple commands from multiple proxies
                var commands: {
                    [user: string]: BaseCommand[]
                } = {};

                for (var i = 0; i < userProxies.length; ++i) {
                    var localBatch = userProxies[i].resolveRule(nextRule);
                    if (localBatch)
                        extend(commands, localBatch.commands);
                }

                nextValue = {};
                var allResponded = this.handleCommands({
                    ruleId: nextRule.id,
                    commands: commands
                }, nextValue);

            } while (allResponded) // while we're not waiting for commands

            return true;
        }

        private handleCommands(batch: BatchCommand, nextValue): boolean {
            if (!batch)
                return false;

            if (batch.ruleId !== this.ruleBatch.ruleId) {
                _error('out of sequence rule received, expecting ' + this.ruleBatch.ruleId + ' received ' + batch);
                return false;
            }

            if (!batch.commands)
                return;

            for (var k in batch.commands) {
                if (typeof this.ruleBatch.commands[k] !== 'undefined') {
                    _error('command received twice from user ' + i);
                    return false;
                }
            }

            extend(this.ruleBatch.commands, batch.commands);

            var allUsers = true;
            for (var i = 0; allUsers && i < this.ruleUsers.length; ++i)
                allUsers = (typeof this.ruleBatch.commands[this.ruleUsers[i]] !== 'undefined');

            if (!allUsers)
                return false; // waiting for responses

            for (var k in batch.commands) {
                var commands = batch.commands[k];

                for (var i = 0; i < commands.length; ++i) {

                    for (var j in plugins) {
                        var updateBoard = plugins[j].updateBoard;
                        var results = [];
                        if (typeof updateBoard === 'function' && updateBoard(this.board, commands[i], results)) {
                            if (results.length > 0) {
                                if (!(k in nextValue))
                                    nextValue[k] = [];

                                [].push.apply(nextValue[k], results);
                            }
                            break;
                        }
                    }
                }
            }

            for (var i = 0; i < this.proxies.length; ++i)
                this.proxies[i].broadcastCommands(batch);

            this.board.print();

            return true;
        }

        // server only supports sendCommands
        onSendCommands(batch: BatchCommand) {
            var nextValue = {};
            if (this.handleCommands(batch, nextValue))
                this.step(nextValue);
        }

        getUser(): string {
            return 'SERVER';
        }
    }
}
