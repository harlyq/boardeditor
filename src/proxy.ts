/// <reference path="board.ts" />

module Game {
    export interface ProxyListener {
        // client listener's support
        onResolveRule ? : (rule: BaseRule) => BaseCommand[];
        onUpdateCommands ? : (commands: BaseCommand[]) => void;

        // server listener's support
        onSendCommands ? : (commands: BaseCommand[]) => any;
    }

    var proxyList: {
        [user: string]: BaseProxy
    } = {};

    export var createLocalProxy = function(user: string, listener: ProxyListener): LocalProxy {
        var proxy = new LocalProxy(user, listener);
        var pairProxy = < LocalProxy > (proxyList[user]);
        if (pairProxy) {
            proxy.setPair(pairProxy);
            pairProxy.setPair(proxy);
        } else {
            proxyList[user] = proxy;
        }
        return proxy;
    }

    export class BaseProxy {
        lastRuleId: number = -1;

        constructor(public user: string, public listener: ProxyListener) {}

        resolveRule(rule: BaseRule): BaseCommand[] {
            return [];
        }

            updateCommands(commands: BaseCommand[]) {}

            sendCommands(commands: BaseCommand[]) {}
    }

    // in general, if the proxy listener supports a function, then send it to the listener,
    // otherwise send it to the pair.
    export class LocalProxy extends BaseProxy {
        pair: LocalProxy;

        constructor(user: string, listener: ProxyListener) {
            super(user, listener);
        }

        setPair(proxy: LocalProxy) {
            this.pair = proxy;
        }

        resolveRule(rule: BaseRule): BaseCommand[] {
            this.lastRuleId = rule.id;

            if (typeof this.listener.onResolveRule === 'function')
                return this.listener.onResolveRule(rule);

            return this.pair.resolveRule(rule);
        }

            updateCommands(commands: BaseCommand[]) {
            if (commands.length === 0)
                return;

            if (typeof this.listener.onUpdateCommands === 'function')
                return this.listener.onUpdateCommands(commands);

            if (this.lastRuleId < commands[0].id) {
                this.pair.updateCommands(commands);
                this.lastRuleId = commands[0].id;
            }
        }

            sendCommands(commands: BaseCommand[]) {
            if (commands.length === 0)
                return;

            if (typeof this.listener.onSendCommands === 'function')
                return this.listener.onSendCommands(commands);

            this.pair.sendCommands(commands);
        }
    }

    export class RESTProxy extends BaseProxy {
        constructor(user: string, public whereList: any[], listener: ProxyListener) {
            super(user, listener);
        }

        resolveRule(rule: BaseRule): BaseCommand[] {
            this.lastRuleId = rule.id;

            // convert a function to an index
            if ('where' in rule)
                rule['whereIndex'] = this.whereList.indexOf(rule['where']);

            // TODO remainder of REST protocol
            return [];
        }
    }

}
