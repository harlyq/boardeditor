/// <reference path="_dependencies.ts" />
var BoardSystem;
(function (BoardSystem) {
    (function (StepStatus) {
        StepStatus[StepStatus["Ready"] = 0] = "Ready";
        StepStatus[StepStatus["Complete"] = 1] = "Complete";
        StepStatus[StepStatus["Error"] = 2] = "Error";
    })(BoardSystem.StepStatus || (BoardSystem.StepStatus = {}));
    var StepStatus = BoardSystem.StepStatus;

    // server has perfect knowledge of the game.  validates all moves.
    var GameServer = (function () {
        function GameServer() {
            this.board = null;
            this.proxies = [];
            this.ruleUsers = [];
            this.ruleBatch = {
                ruleId: -1,
                commands: {}
            };
            this.inNewGame = false;
            this.bankClient = null;
            this.config = null;
            this.whereList = [];
        }
        GameServer.prototype.addTransport = function (proxy) {
            this.proxies.push(proxy);
        };

        GameServer.prototype.removeTransport = function (proxy) {
            var i = this.proxies.indexOf(proxy);
            if (i !== -1)
                this.proxies.splice(i, 1);
        };

        GameServer.prototype.getProxies = function (userNames) {
            var inputNames = userNames.split(',');
            var proxies = [];
            for (var i = 0; i < this.proxies.length; ++i) {
                if (BoardSystem.union(this.proxies[i].user, inputNames).length > 0)
                    proxies.push(this.proxies[i]); // at least one of the users is in this proxy
            }
            return proxies;
        };

        GameServer.prototype.setBankClient = function (client) {
            this.bankClient = client;
            this.board = client.getBoard();
        };

        GameServer.prototype.getBankClient = function () {
            return this.bankClient;
        };

        GameServer.prototype.newGame = function () {
            if (typeof this.rulesGen === 'function')
                this.rulesIter = this.rulesGen(this.board);

            // this.inNewGame = true;
            this.step(); // don't have user rules in the newGame!!!
        };

        GameServer.prototype.step = function (nextValue) {
            if (!('next' in this.rulesIter))
                return 2 /* Error */;

            var result = this.rulesIter.next(nextValue);
            if (result.done) {
                console.log('RULES COMPLETE');
                return 1 /* Complete */;
            }

            var nextRule = result.value;
            if (!nextRule) {
                BoardSystem._error('game rules yielded an empty rule');
                return 2 /* Error */;
            }

            console.log(nextRule);

            this.ruleBatch = {
                ruleId: nextRule.id,
                commands: {}
            };
            if (!nextRule.user)
                BoardSystem._error('there is no user in the rule - ' + nextRule);

            this.ruleUsers = nextRule.user.split(',');

            var userProxies = this.getProxies(nextRule.user);
            if (userProxies.length === 0) {
                BoardSystem._error('user does not have proxy - ' + nextRule.user);
                return 2 /* Error */;
            }

            for (var i = 0; i < userProxies.length; ++i)
                userProxies[i].sendMessage({
                    command: 'rule',
                    rule: nextRule
                });

            return 0 /* Ready */;
        };

        GameServer.prototype.handleCommands = function (batch, nextValue) {
            if (!batch)
                return false;

            if (batch.ruleId !== this.ruleBatch.ruleId) {
                BoardSystem._error('out of sequence rule received, expecting ' + this.ruleBatch.ruleId + ' received ' + batch.ruleId);
                return false;
            }

            if (!batch.commands)
                return false;

            for (var user in batch.commands) {
                if (typeof this.ruleBatch.commands[user] !== 'undefined') {
                    BoardSystem._error('command received twice from user ' + i);
                    return false;
                }
            }

            // add this user's response to the local batch
            BoardSystem.extend(this.ruleBatch.commands, batch.commands);

            var responders = Object.keys(this.ruleBatch.commands).join(',');
            if (BoardSystem.union(this.ruleUsers, responders).length !== this.ruleUsers.length)
                return false;

            for (var user in batch.commands)
                nextValue[user] = this.bankClient.createResults(batch.commands[user]);

            for (var i = 0; i < this.proxies.length; ++i)
                this.proxies[i].sendMessage({
                    command: 'batch',
                    batch: this.ruleBatch
                });

            this.board.print();

            return true;
        };

        // server only supports sendCommands
        GameServer.prototype.onHandleMessage = function (msg) {
            if (!('command' in msg) || !('batch' in msg) || msg.command !== 'batch') {
                debugger;
                return;
            }

            var nextValue = {};
            if (!this.handleCommands(msg.batch, nextValue))
                return;

            var status = this.step(nextValue);
        };

        GameServer.prototype.getUser = function () {
            return 'SERVER';
        };
        return GameServer;
    })();
    BoardSystem.GameServer = GameServer;
})(BoardSystem || (BoardSystem = {}));
