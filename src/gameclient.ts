/// <reference path="_dependencies.ts" />

module Game {
    //-------------------------------
    export class Client implements ProxyListener {
        private localVariables: {
            [name: string]: any
        } = {};
        showMoves: boolean = true;
        whereList: any[] = [];

        constructor(public user: string, public proxy: BaseClientProxy, public board: Board) {}

        getProxy(): BaseClientProxy {
            return this.proxy;
        }

        getBoard(): Board {
            return this.board;
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
            return null;
        }

        onBroadcastCommands(batch: BatchCommand) {}
    }


    //-------------------------------
    export class BankClient extends Client {

        onResolveRule(rule: BaseRule): BatchCommand {
            var results = []
            for (var i in plugins) {
                if (plugins[i].performRule(this, rule, results))
                    return results[~~(Math.random() * results.length)]; // return a random option
            }

            return super.onResolveRule(rule);
        }
    }

    export class HumanClient extends Client {
        mapping: HTMLMapping = null;

        constructor(user: string, proxy: BaseClientProxy, board: Board, public boardElem: HTMLElement) {
            super(user, proxy, board);

            // TODO shared mapping for shared screens
            this.mapping = new HTMLMapping(board, user);
        }

        getMapping() {
            return this.mapping;
        }

        onSetup() {
            // bind layouts, decks and cards
            this.mapping.parseElement(this.boardElem);
        }

        onResolveRule(rule: BaseRule): BatchCommand {
            var results = []
            for (var i in plugins) {
                if (plugins[i].performRule(this, rule, results)) {
                    if (results.length > 0)
                        return results[0]; // return the first option
                    else
                        return null;
                }
            }

            return super.onResolveRule(rule);
        }

            onBroadcastCommands(batch: BatchCommand) {
            if (this.mapping.lastRuleId >= batch.ruleId)
                return;

            for (var k in batch.commands) {
                var commands = batch.commands[k];

                for (var j = 0; j < commands.length; ++j) {

                    for (var i in plugins) {
                        var updateMapping = plugins[i].updateMapping;
                        if (typeof updateMapping === 'function')
                            updateMapping(this.board, this.mapping, commands[j]);
                    }
                }
            }

            this.mapping.lastRuleId = batch.ruleId;
        }
    }

    //-------------------------------
    export class AIClient extends Client {

    }

}
