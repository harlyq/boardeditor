/// <reference path="_dependencies.ts" />

module Game {
    //-------------------------------
    export class Client {
        private transport: BaseTransport = null;
        private localVariables: {
            [name: string]: any
        } = {};
        /*protected*/
        mapping: HTMLMapping = null;
        showMoves: boolean = true;
        whereList: any[] = [];

        constructor(public user: string, public board: Board) {}

        setTransport(transport: BaseTransport) {
            this.transport = transport;
        }

        getBoard(): Board {
            return this.board;
        }

        getTransport(): BaseTransport {
            return this.transport;
        }

        getMapping(): HTMLMapping {
            return this.mapping;
        }

        getUser(): string {
            return this.user;
        }

        setup() {
            this.onSetup();
        }

        onSetup() {}

        setLocalVariable(name: string, value: any) {
            this.localVariables[name] = value;
        }

        onHandleMessage(msg: any) {
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
                    _error('client - ' + this.user + ' - received unknown command - ' + msg.command);
            }
        }

        /* protected */
        onResolveRule(rule: BaseRule): BaseCommand[] {
            // if a rule cannot be resolved, then cast the rule as a single command
            return [ < BaseCommand > rule];
        }

        /* protected */
        onBroadcastCommands(batch: BatchCommand) {
            for (var k in batch.commands) {
                var commands = batch.commands[k];

                for (var i = 0; i < commands.length; ++i) {
                    var command = commands[i];
                    if (!command.type)
                        _error('no type specified in command - ' + command);

                    for (var j in plugins) {
                        var updateBoard = plugins[j].updateBoard;
                        if (typeof updateBoard === 'function' && updateBoard(this.board, command, []))
                            break;
                    }
                }
            }
        }

        sendUserCommands(ruleId: number, commands: BaseCommand[]) {
            this.transport.sendMessage({
                command: 'batch',
                batch: createBatchCommand(ruleId, this.user, commands)
            });
        }
    }


    //-------------------------------
    export class BankClient extends Client {

        onResolveRule(rule: BaseRule): BaseCommand[] {
            var results = []
            for (var i in plugins) {
                var performRule = plugins[i].performRule;
                if (typeof performRule === 'function' && performRule(this, rule, results)) {
                    if (results.length > 0) {
                        var commands = results[~~(Math.random() * results.length)]; // pick a random option
                        return commands;
                    } else {
                        console.log('user - ' + this.getUser() + ' waiting for plugin - ' + i + ' - for rule - ' + rule.type);
                        return null;
                    }
                }
            }

            return super.onResolveRule(rule);
        }
    }

    //-------------------------------
    export class HTMLClient extends Client {
        constructor(user: string, board: Board, public boardElem: HTMLElement) {
            super(user, board);

            // use the board to establish an initial mapping and configuration of the boardElem
            this.mapping = new HTMLMapping(board, user, boardElem);
        }

        getBoardElem(): HTMLElement {
            return this.boardElem;
        }

        onResolveRule(rule: BaseRule): BaseCommand[] {
            if (!rule.type)
                _error('no type specified in rule - ' + rule);

            var results = []
            for (var i in plugins) {
                var performRule = plugins[i].performRule;
                if (typeof performRule === 'function' && performRule(this, rule, results)) {
                    if (results.length > 0) {
                        return results[0]; // first option
                    } else {
                        console.log('user - ' + this.getUser() + ' waiting for plugin - ' + i + ' - for rule - ' + rule.type);
                        return null;
                    }
                }
            }

            return super.onResolveRule(rule);
        }

        onBroadcastCommands(batch: BatchCommand) {
            super.onBroadcastCommands(batch);

            // if (this.mapping.lastRuleId >= batch.ruleId)
            //     return;

            for (var k in batch.commands) {
                var commands = batch.commands[k];

                for (var j = 0; j < commands.length; ++j) {
                    var command = commands[j];

                    for (var i in plugins) {
                        var updateHTML = plugins[i].updateHTML;
                        if (typeof updateHTML === 'function')
                            updateHTML(this.mapping, command);
                    }
                }
            }

            // this.mapping.lastRuleId = batch.ruleId;
        }
    }

    //-------------------------------
    export class AIClient extends Client {

    }

}
