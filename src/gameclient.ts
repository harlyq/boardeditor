/// <reference path="_dependencies.ts" />

module Game {
    var getRandom = function < T > (list: T[]): T {
        return list[~~(Math.random() * list.length)];
    }

    //-------------------------------
    export class Client implements ProxyListener {
        showMoves: boolean = true;
        whereList: any[];
        private localVariables: {
            [name: string]: any
        } = {};

        constructor(public user: string, public proxy: BaseClientProxy, public board: Board) {
            this.applyProxyModules();
        }

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

            onUpdateCommands(batch: BatchCommand) {}

            applyProxyModules() {

        }
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

    //-------------------------------
    export class AIClient extends Client {

    }

}
