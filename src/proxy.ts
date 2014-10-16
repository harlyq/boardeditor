/// <reference path="_dependencies.ts" />

module Game {
    var HTML_DEFINED = typeof window !== 'undefined';

    export interface ProxyListener {
        // client listener's support
        onResolveRule ? : (rule: BaseRule) => BatchCommand;
        onUpdateCommands ? : (commands: BatchCommand) => void;

        // server listener's support
        onSendCommands ? : (commands: BatchCommand) => any;
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

    export var createMessageServerProxy = function(user: string, iframeElem: HTMLIFrameElement, whereList: any[], listener: ProxyListener): MessageServerProxy {
        return new MessageServerProxy(user, iframeElem, whereList, listener);
    }

    export var createMessageClientProxy = function(user: string, whereList: any[], listener: ProxyListener): MessageClientProxy {
        return new MessageClientProxy(user, whereList, listener);
    }

    export class BaseProxy {
        lastRuleId: number = -1;

        constructor(public user: string, public listener: ProxyListener) {}

        resolveRule(rule: BaseRule): BatchCommand {
            return {
                ruleId: rule.id,
                commands: []
            };
        }

            updateCommands(batch: BatchCommand) {}

            sendCommands(batch: BatchCommand) {}

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

        resolveRule(rule: BaseRule): BatchCommand {
            this.lastRuleId = rule.id;

            if (typeof this.listener.onResolveRule === 'function')
                return this.listener.onResolveRule(rule);

            return this.pair.resolveRule(rule);
        }

            updateCommands(batch: BatchCommand) {
            if (!batch)
                return;

            if (typeof this.listener.onUpdateCommands === 'function')
                return this.listener.onUpdateCommands(batch);

            if (this.lastRuleId < batch.ruleId) {
                this.pair.updateCommands(batch);
                this.lastRuleId = batch.ruleId;
            }
        }

            sendCommands(batch: BatchCommand) {
            if (!batch)
                return;

            if (typeof this.listener.onSendCommands === 'function')
                return this.listener.onSendCommands(batch);

            this.pair.sendCommands(batch);
        }
    }

    export interface RESTResponse {
        batches: BatchCommand[];
        rule: BaseRule;
    }

    export class RESTServerProxy extends BaseProxy {
        lastRule = null;
        batches: BatchCommand[] = [];

        constructor(user: string, public whereList: any[], listener: ProxyListener) {
            super(user, listener);
        }

        // server side
        resolveRule(rule: BaseRule): BatchCommand {
            // convert a function to an index
            if ('where' in rule)
                rule['whereIndex'] = this.whereList.indexOf(rule['where']);

            this.lastRule = extend({}, rule);

            return {
                ruleId: rule.id,
                commands: []
            };
        }

        updateCommands(batch: BatchCommand) {
            if (!batch)
                return;

            this.batches.push(batch);

            // if we receive a command for the last rule, then consider it satisfied
            if (this.lastRule && batch.ruleId === this.lastRule.id)
                this.lastRule = null;
        }

        clientRequest(afterId): RESTResponse {
            var response: RESTResponse = {
                batches: [],
                rule: this.lastRule
            };

            for (var i = 0; i < this.batches.length; ++i) {
                var batch = this.batches[i];
                if (batch.ruleId > afterId)
                    response.batches.push(batch);
            }

            return response;
        }

    }

    export class RESTClientProxy extends BaseProxy {
        request: any = null;

        constructor(user: string, private whereList: any[], listener: ProxyListener) {
            super(user, listener);

            if (HTML_DEFINED) {
                this.request = new XMLHttpRequest();
                var self = this;
                this.request.onload = function() {
                    self.serverResponse(this.response);
                }
            }
        }

        sendCommands(batch: BatchCommand) {
            if (HTML_DEFINED) {
                this.request.open('POST', 'new?user=' + this.user);
                this.request.setRequestHeader('Content-Type', 'application/json');
                this.request.send(JSON.stringify(batch));
            }
        }

        serverResponse(resp) {
            if (HTML_DEFINED) {
                var response = < RESTResponse > (JSON.parse(resp));

                // commands must be processed before rules
                if (response.batches.length > 0 && typeof this.listener.onUpdateCommands === 'function') {
                    for (var i = 0; i < response.batches.length; ++i) {
                        var batch = response.batches[i];
                        this.listener.onUpdateCommands(batch);
                        this.lastRuleId = batch.ruleId; // remember the last id
                    }
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
                this.request.open('GET', 'moves?user=' + this.user + '&afterId=' + this.lastRuleId);
                this.request.setRequestHeader('Content-Type', 'application/json');
                this.request.send();
            }
        }
    }

    export class MessageServerProxy extends BaseProxy {
        constructor(user: string, private iframeElem: HTMLIFrameElement, private whereList: any[], listener: ProxyListener) {
            super(user, listener);

            window.addEventListener('message', this.onClientMessage.bind(this));
        }

        resolveRule(rule: BaseRule): BatchCommand {
            var msg = {
                type: 'resolveRule',
                user: this.user,
                rule: rule
            };

            if ('where' in rule)
                rule['whereIndex'] = this.whereList.indexOf(rule['where']);

            console.log('SEND resolveRule to:' + msg.user + ' id:' + msg.rule.id);
            this.iframeElem.contentWindow.postMessage(JSON.stringify(msg), '*');
            return {
                ruleId: rule.id,
                commands: []
            };
        }

        updateCommands(batch: BatchCommand) {
            if (!batch)
                return;

            var msg = {
                type: 'updateCommands',
                user: this.user,
                batch: batch
            };

            console.log('SEND updateCommands to:' + msg.user + ' id:' + msg.batch.ruleId);
            this.iframeElem.contentWindow.postMessage(JSON.stringify(msg), '*');
            return [];
        }

        private onClientMessage(e) {
            var msg: any = JSON.parse(e.data);
            if (!msg || typeof msg !== 'object') {
                _error('server received invalid message');
                return;
            }

            if (msg.user !== this.user || !this.listener)
                return; // not the correct user

            if (msg.type === 'sendCommands' && typeof this.listener.onSendCommands === 'function') {
                this.listener.onSendCommands(msg.batch);
            }
        }
    }

    export class MessageClientProxy extends BaseProxy {
        rule: BaseRule = null;
        batches: BatchCommand[] = [];

        constructor(user: string, private whereList: any[], listener: ProxyListener) {
            super(user, listener);
        }

        sendCommands(batch: BatchCommand) {
            if (!batch)
                return;

            var msg = {
                type: 'sendCommands',
                user: this.user,
                batch: batch
            };
            window.parent.postMessage(JSON.stringify(msg), '*');
        }

        // when debugging, messages from the server can be received out of order
        // so only process the commands once we receive all of them in order 
        private onServerMessage(msg: any): boolean {
            if (!msg || typeof msg !== 'object') {
                _error('client (' + this.user + ') received invalid message');
                return;
            }

            if (msg.type === 'updateCommands')
                console.log('onUpdateCommands to:' + msg.user + ' this:' + this.user + ' id:' + msg.batch.ruleId);
            else if (msg.type === 'resolveRule')
                console.log('onResolveRule to:' + msg.user + ' this:' + this.user + ' id:' + msg.rule.id);

            if (msg.user !== this.user || !this.listener)
                return; // not the correct user

            if (msg.type === 'resolveRule') {
                var rule = msg.rule;
                if ('whereIndex' in rule)
                    rule['where'] = this.whereList[rule['whereIndex']];

                this.rule = msg.rule;
                if (this.rule.id === this.lastRuleId + 1)
                    this.sendMessages();

            } else if (msg.type === 'updateCommands' && typeof this.listener.onUpdateCommands === 'function') {
                this.batches.push(msg.batch);
                this.batches.sort(function(a, b): number {
                    return a.ruleId - b.ruleId;
                });
                if (msg.batch.ruleId === this.lastRuleId + 1)
                    this.sendMessages();
            } else {
                _error('client (' + this.user + ') received unknown message type - ' + msg.type);
            }
        }

            private sendMessages() {
            // commands always sent first, send as many sequential commands as possible
            if (this.batches.length > 0 && typeof this.listener.onUpdateCommands === 'function') {
                var allSent = true;
                var i = 0;
                for (; i < this.batches.length; ++i) {
                    if (this.batches[i].ruleId === this.lastRuleId + 1) {
                        this.listener.onUpdateCommands(this.batches[i]);
                        this.lastRuleId++;
                    } else {
                        break;
                    }
                }

                // remove the processed batches
                this.batches.splice(0, i);
            }

            // then the rule
            if (this.rule && this.rule.id === this.lastRuleId + 1 && typeof this.listener.onResolveRule === 'function') {
                this.listener.onResolveRule(this.rule);
                this.rule = null;
                // do not update the lastRuleId, as we expect an updateCommand for this rule
            }

            // TODO - do we need to handle deprecated rules???
        }
    }
}
