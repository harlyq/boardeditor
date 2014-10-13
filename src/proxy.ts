/// <reference path="board.ts" />

module Game {
    var HTML_DEFINED = typeof window !== 'undefined';

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

    export var createRESTServerProxy = function(user: string, whereList: any[], listener: ProxyListener): RESTServerProxy {
        return new RESTServerProxy(user, whereList, listener);
    }

    export var createRESTClientProxy = function(user: string, whereList: any[], listener: ProxyListener): RESTClientProxy {
        return new RESTClientProxy(user, whereList, listener);
    }

    export class BaseProxy {
        lastRuleId: number = -1;

        constructor(public user: string, public listener: ProxyListener) {}

        resolveRule(rule: BaseRule): BaseCommand[] {
            return [];
        }

            updateCommands(commands: BaseCommand[]) {}

            sendCommands(commands: BaseCommand[]) {}

            pollServer() {}
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

    export interface RESTResponse {
        commands: BaseCommand[];
        rule: BaseRule;
    }

    export class RESTClientProxy extends BaseProxy {
        lastRule = null;
        commands: BaseCommand[] = [];

        constructor(user: string, public whereList: any[], listener: ProxyListener) {
            super(user, listener);
        }

        // server side
        resolveRule(rule: BaseRule): BaseCommand[] {
            // convert a function to an index
            if ('where' in rule)
                rule['whereIndex'] = this.whereList.indexOf(rule['where']);

            this.lastRule = extend({}, rule);

            return [];
        }

        updateCommands(commands: BaseCommand[]) {
            if (commands.length === 0)
                return;

            this.commands = this.commands.concat(commands);

            // if we receive a command for the rule, then consider it satisfied
            if (this.lastRule && commands[0].id === this.lastRule.id)
                this.lastRule = null;
        }

        clientRequest(afterId): RESTResponse {
            var response: RESTResponse = {
                commands: [],
                rule: this.lastRule
            };

            for (var i = 0; i < this.commands.length; ++i) {
                var command = this.commands[i];
                if (command.id > afterId)
                    response.commands.push(command);
            }

            return response;
        }

    }

    export class RESTServerProxy extends BaseProxy {
        request: any = null;
        lastClientId: number = -1;

        constructor(user: string, public whereList: any[], listener: ProxyListener) {
            super(user, listener);

            if (HTML_DEFINED) {
                this.request = new XMLHttpRequest();
                var self = this;
                this.request.onload = function() {
                    self.serverResponse(this.response);
                }
            }
        }

        sendCommands(commands: BaseCommand[]) {
            if (HTML_DEFINED) {
                this.request.open('POST', 'new?user=' + this.user);
                this.request.setRequestHeader('Content-Type', 'application/json');
                this.request.send(JSON.stringify(commands));
            }
        }

        serverResponse(resp) {
            if (HTML_DEFINED) {
                var response = < RESTResponse > (JSON.parse(resp));

                // commands must be processed before rules
                if (Array.isArray(response.commands) && response.commands.length > 0 && typeof this.listener.onUpdateCommands === 'function') {
                    this.listener.onUpdateCommands(response.commands);
                    this.lastClientId = response.commands[response.commands.length - 1].id; // remember the last id
                }

                var rule = response.rule
                if (rule) {
                    if ('whereIndex' in rule)
                        rule['where'] = this.whereList[rule['whereIndex']];

                    if (typeof this.listener.onResolveRule === 'function') {
                        if (rule.user === this.user)
                            this.listener.onResolveRule(rule);
                    }
                }
            }
        }

        pollServer() {
            if (HTML_DEFINED) {
                this.request.open('GET', 'moves?user=' + this.user + '&afterId=' + this.lastClientId);
                this.request.setRequestHeader('Content-Type', 'application/json');
                this.request.send();
            }
        }
    }
}
