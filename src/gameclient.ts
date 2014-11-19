/// <reference path="_dependencies.ts" />

module Game {
    //-------------------------------
    export class Client implements ProxyListener {
        private localVariables: {
            [name: string]: any
        } = {};
        showMoves: boolean = true;
        whereList: any[] = [];

        constructor(public user: string, public proxy: BaseClientProxy, public board: Board) {
            proxy.addListener(this);
        }

        getBoard(): Board {
            return this.board;
        }

        getProxy(): BaseClientProxy {
            return this.proxy;
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

        onResolveRule(rule: BaseRule): BatchCommand {
            // if a rule cannot be resolved, then cast the rule as a single command
            return createBatchCommand(rule.id, this.user, [ < BaseCommand > rule]);
        }

        onBroadcastCommands(batch: BatchCommand) {
            for (var k in batch.commands) {
                var commands = batch.commands[k];

                for (var i = 0; i < commands.length; ++i) {

                    for (var j in plugins) {
                        var updateBoard = plugins[j].updateBoard;
                        if (typeof updateBoard === 'function' && updateBoard(this.board, commands[i], []))
                            break;
                    }
                }
            }
        }

        sendUserCommands(ruleId: number, commands: BaseCommand[]) {
            this.proxy.sendCommands(createBatchCommand(ruleId, this.user, commands));
        }
    }


    //-------------------------------
    export class HTMLClient extends Client {
        public mapping: HTMLMapping;

        constructor(user: string, proxy: BaseClientProxy, board: Board, public boardElem: HTMLElement) {
            super(user, proxy, board);

            // use the board to establish an initial mapping and configuration of the boardElem
            this.mapping = new HTMLMapping(board, user, boardElem);
        }

        getMapping(): HTMLMapping {
            return this.mapping;
        }

        getBoardElem(): HTMLElement {
            return this.boardElem;
        }
    }

    //-------------------------------
    export class BankClient extends Client {

        onResolveRule(rule: BaseRule): BatchCommand {
            var results = []
            for (var i in plugins) {
                var performRule = plugins[i].performRule;
                if (typeof performRule === 'function' && performRule(this, rule, results)) {
                    if (results.length > 0) {
                        var commands = results[~~(Math.random() * results.length)]; // pick a random option
                        return createBatchCommand(rule.id, this.user, commands);
                    } else {
                        console.log('user - ' + this.getUser() + ' waiting for plugin - ' + i + ' - for rule - ' + rule.type);
                        return null;
                    }
                }
            }

            return super.onResolveRule(rule);
        }
    }

    export class HumanClient extends HTMLClient {

        onResolveRule(rule: BaseRule): BatchCommand {
            var results = []
            for (var i in plugins) {
                var performRule = plugins[i].performRule;
                if (typeof performRule === 'function' && performRule(this, rule, results)) {
                    if (results.length > 0) {
                        return createBatchCommand(rule.id, this.user, results[0]); // first option
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

                    for (var i in plugins) {
                        var updateHTML = plugins[i].updateHTML;
                        if (typeof updateHTML === 'function')
                            updateHTML(this.mapping, commands[j]);
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
