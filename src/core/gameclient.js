/// <reference path="_dependencies.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var BoardSystem;
(function (BoardSystem) {
    //-------------------------------
    var BaseClient = (function () {
        function BaseClient(user, board) {
            this.user = user;
            this.board = board;
            this.transport = null;
            this.localVariables = {};
            /*protected*/
            this.mapping = null;
            this.whereList = [];
        }
        BaseClient.prototype.setTransport = function (transport) {
            this.transport = transport;
        };

        BaseClient.prototype.getBoard = function () {
            return this.board;
        };

        BaseClient.prototype.getTransport = function () {
            return this.transport;
        };

        BaseClient.prototype.getMapping = function () {
            return this.mapping;
        };

        BaseClient.prototype.getUser = function () {
            return this.user;
        };

        BaseClient.prototype.setup = function () {
            this.onSetup();
        };

        BaseClient.prototype.onSetup = function () {
        };

        BaseClient.prototype.setLocalVariable = function (name, value) {
            this.localVariables[name] = value;
        };

        BaseClient.prototype.createResults = function (commands) {
            var results = [];
            for (var i = 0; i < commands.length; ++i) {
                var command = commands[i];

                for (var j in BoardSystem.plugins) {
                    var createResult = BoardSystem.plugins[j].createResult;
                    if (typeof createResult === 'function') {
                        var result = createResult(this, command);
                        if (result) {
                            results.push(result);
                            break;
                        }
                    }
                }
            }

            return results;
        };

        BaseClient.prototype.onHandleMessage = function (msg) {
            if (!('command' in msg))
                return;

            switch (msg.command) {
                case 'rule':
                    var commands = this.onResolveRule(msg.rule);
                    if (commands)
                        this.sendUserCommands(msg.rule.id, commands);
                    break;

                case 'batch':
                    this.onBroadcastCommands(msg.batch);
                    break;

                default:
                    BoardSystem._error('client - ' + this.user + ' - received unknown command - ' + msg.command);
            }
        };

        /* protected */
        BaseClient.prototype.onResolveRule = function (rule) {
            // if a rule cannot be resolved, then cast the rule as a single command
            return [rule];
        };

        /* protected */
        BaseClient.prototype.onBroadcastCommands = function (batch) {
            for (var user in batch.commands) {
                var commands = batch.commands[user];

                for (var i = 0; i < commands.length; ++i) {
                    var command = commands[i];
                    if (!command.type)
                        BoardSystem._error('no type specified in command - ' + command);

                    for (var j in BoardSystem.plugins) {
                        var updateClient = BoardSystem.plugins[j].updateClient;
                        if (typeof updateClient === 'function' && updateClient(this, command))
                            break;
                    }
                }
            }
        };

        BaseClient.prototype.sendUserCommands = function (ruleId, commands) {
            this.transport.sendMessage({
                command: 'batch',
                batch: BoardSystem.createBatchCommand(ruleId, this.user, commands)
            });
        };
        return BaseClient;
    })();
    BoardSystem.BaseClient = BaseClient;

    //-------------------------------
    var BankClient = (function (_super) {
        __extends(BankClient, _super);
        function BankClient() {
            _super.apply(this, arguments);
        }
        BankClient.prototype.onResolveRule = function (rule) {
            var results = [];
            for (var i in BoardSystem.plugins) {
                var performRule = BoardSystem.plugins[i].performRule;
                if (typeof performRule === 'function' && performRule(this, rule, results)) {
                    if (results.length > 0) {
                        var commands = results[~~(Math.random() * results.length)];
                        return commands;
                    } else {
                        console.log('user - ' + this.getUser() + ' waiting for plugin - ' + i + ' - for rule - ' + rule.type);
                        return null;
                    }
                }
            }

            return _super.prototype.onResolveRule.call(this, rule);
        };
        return BankClient;
    })(BaseClient);
    BoardSystem.BankClient = BankClient;

    //-------------------------------
    var HTMLClient = (function (_super) {
        __extends(HTMLClient, _super);
        function HTMLClient(user, board, boardElem) {
            _super.call(this, user, board);
            this.boardElem = boardElem;

            // use the board to establish an initial mapping and configuration of the boardElem
            this.mapping = new BoardSystem.HTMLMapping(board, user, boardElem);
        }
        HTMLClient.prototype.getBoardElem = function () {
            return this.boardElem;
        };

        HTMLClient.prototype.onResolveRule = function (rule) {
            if (!rule.type)
                BoardSystem._error('no type specified in rule - ' + rule);

            var results = [];
            for (var i in BoardSystem.plugins) {
                var performRule = BoardSystem.plugins[i].performRule;
                if (typeof performRule === 'function' && performRule(this, rule, results)) {
                    if (results.length > 0) {
                        return results[0];
                    } else {
                        console.log('user - ' + this.getUser() + ' waiting for plugin - ' + i + ' - for rule - ' + rule.type);
                        return null;
                    }
                }
            }

            return _super.prototype.onResolveRule.call(this, rule);
        };
        return HTMLClient;
    })(BaseClient);
    BoardSystem.HTMLClient = HTMLClient;

    //-------------------------------
    var AIClient = (function (_super) {
        __extends(AIClient, _super);
        function AIClient() {
            _super.apply(this, arguments);
        }
        return AIClient;
    })(BaseClient);
    BoardSystem.AIClient = AIClient;
})(BoardSystem || (BoardSystem = {}));
