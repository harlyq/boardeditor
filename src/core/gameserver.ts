/// <reference path="_dependencies.ts" />
module BoardSystem {

    export enum StepStatus {
        Ready, Complete, Error
    }

    // server has perfect knowledge of the game.  validates all moves.
    export class GameServer {
        private board: Board = null;
        private rulesIter: any;
        private proxies: BaseTransport[] = [];
        private ruleUsers: string[] = [];
        private ruleBatch: BatchCommand = {
            ruleId: -1,
            commands: {}
        };
        private inNewGame: boolean = false;
        private bankClient: BankClient = null;
        public config: GameConfig = null;

        rulesGen: (board: Board) => {
            next(...args: any[]): any
        };
        whereList: any[] = [];

        addTransport(proxy: BaseTransport) {
            this.proxies.push(proxy);
        }

        removeTransport(proxy: BaseTransport) {
            var i = this.proxies.indexOf(proxy);
            if (i !== -1)
                this.proxies.splice(i, 1);
        }

        getProxies(userNames: string): BaseTransport[] {
            var inputNames = userNames.split(',');
            var proxies: BaseTransport[] = [];
            for (var i = 0; i < this.proxies.length; ++i) {
                if (union(this.proxies[i].user, inputNames).length > 0)
                    proxies.push(this.proxies[i]); // at least one of the users is in this proxy
            }
            return proxies;
        }

        setBankClient(client: BankClient) {
            this.bankClient = client;
            this.board = client.getBoard();
        }

        getBankClient(): BankClient {
            return this.bankClient;
        }

        newGame() {
            if (typeof this.rulesGen === 'function')
                this.rulesIter = this.rulesGen(this.board);

            // this.inNewGame = true;
            this.step(); // don't have user rules in the newGame!!!
        }

        step(nextValue ? : {
            [user: string]: BaseResult[]
        }): StepStatus {

            if (!('next' in this.rulesIter))
                return StepStatus.Error;

            var result = this.rulesIter.next(nextValue); // step into rules
            if (result.done) {
                console.log('RULES COMPLETE');
                return StepStatus.Complete;
            }

            var nextRule: BaseRule = result.value;
            if (!nextRule) {
                _error('game rules yielded an empty rule');
                return StepStatus.Error;
            }

            console.log(nextRule);

            this.ruleBatch = {
                ruleId: nextRule.id,
                commands: {}
            };
            if (!nextRule.user)
                _error('there is no user in the rule - ' + nextRule);

            this.ruleUsers = nextRule.user.split(',');

            var userProxies = this.getProxies(nextRule.user);
            if (userProxies.length === 0) {
                _error('user does not have proxy - ' + nextRule.user);
                return StepStatus.Error; // this.error('User does not have a proxy')
            }

            for (var i = 0; i < userProxies.length; ++i)
                userProxies[i].sendMessage({
                    command: 'rule',
                    rule: nextRule
                });

            return StepStatus.Ready;
        }

        private handleCommands(batch: BatchCommand, nextValue: {
            [user: string]: BaseResult[]
        }): boolean {
            if (!batch)
                return false;

            if (batch.ruleId !== this.ruleBatch.ruleId) {
                _error('out of sequence rule received, expecting ' + this.ruleBatch.ruleId + ' received ' + batch.ruleId);
                return false;
            }

            if (!batch.commands)
                return false;

            for (var user in batch.commands) {
                if (typeof this.ruleBatch.commands[user] !== 'undefined') {
                    _error('command received twice from user ' + i);
                    return false;
                }
            }

            // add this user's response to the local batch
            extend(this.ruleBatch.commands, batch.commands);

            var responders = Object.keys(this.ruleBatch.commands).join(','); // a big string
            if (union(this.ruleUsers, responders).length !== this.ruleUsers.length)
                return false; // waiting for responses

            // determine the nextValue before we send the batch to each of the proxies and 
            // they update their boards
            for (var user in batch.commands)
                nextValue[user] = this.bankClient.createResults(batch.commands[user]);

            for (var i = 0; i < this.proxies.length; ++i)
                this.proxies[i].sendMessage({
                    command: 'batch',
                    batch: this.ruleBatch
                });

            this.board.print();

            return true;
        }

        // server only supports sendCommands
        onHandleMessage(msg: any) {
            if (!('command' in msg) || !('batch' in msg) || msg.command !== 'batch') {
                debugger; // unknown command
                return;
            }

            var nextValue: {
                [user: string]: BaseResult[]
            } = {};
            if (!this.handleCommands(msg.batch, nextValue))
                return; // commands from other users are pending

            var status = this.step(nextValue);
        }

        getUser(): string {
            return 'SERVER';
        }
    }
}
