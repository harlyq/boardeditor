/// <reference path="_dependencies.ts" />

module Game {
    var HTML_DEFINED = typeof window !== 'undefined';

    export interface ProxyListener {
        // client listener's support
        onResolveRule ? : (rule: BaseRule) => BatchCommand;
        onBroadcastCommands ? : (batch: BatchCommand) => void;

        // server listener's support
        onSendCommands ? : (batch: BatchCommand) => void;
        getUser: () => string;
    }

    var proxyList: {
        [userNames: string]: LocalServerProxy
    } = {};

    export var createLocalServerProxy = function(userNames: string, listener: ProxyListener): LocalServerProxy {
        var proxy = new LocalServerProxy(userNames, listener);
        proxyList[userNames] = proxy;
        return proxy;
    }

    export var createLocalClientProxy = function(userNames: string): LocalClientProxy {
        var proxy = new LocalClientProxy(userNames);
        var serverProxy = proxyList[userNames];
        if (serverProxy) {
            proxy.setPair(serverProxy);
            serverProxy.setPair(proxy);
        }
        return proxy;
    }

    export var createRESTServerProxy = function(userNames: string, whereList: any[], listener: ProxyListener): RESTServerProxy {
        return new RESTServerProxy(userNames, whereList, listener);
    }

    export var createRESTClientProxy = function(userNames: string, whereList: any[]): RESTClientProxy {
        return new RESTClientProxy(userNames, whereList);
    }

    export var createMessageServerProxy = function(userNames: string, iframeElem: HTMLIFrameElement, whereList: any[], listener: ProxyListener): MessageServerProxy {
        return new MessageServerProxy(userNames, iframeElem, whereList, listener);
    }

    export var createMessageClientProxy = function(userNames: string, whereList: any[]): MessageClientProxy {
        return new MessageClientProxy(userNames, whereList);
    }

    export class BaseClientProxy {
        public lastRuleId: number = -1;
        public listeners: ProxyListener[] = [];

        constructor(public userNames: string) {}

        // setup(setupFunc: (board: Board) => void) {
        //     setupFunc(this.board);
        // }

        registerRule(name: string, pluginName: string) {}

        addListener(listener: ProxyListener) {
            this.listeners.push(listener);
        }

        removeListener(listener: ProxyListener) {
            var i = this.listeners.indexOf(listener);
            if (i !== -1)
                this.listeners.splice(i, 1);
        }

        onResolveRule(rule: BaseRule): BatchCommand {
            var responded = false,
                commands: {
                    [user: string]: BaseCommand[]
                } = {};

            for (var i = 0; i < this.listeners.length; ++i) {
                var listener = this.listeners[i];
                if (listener &&
                    typeof listener.onResolveRule === 'function' &&
                    union(rule.user, listener.getUser()).length > 0) {

                    var batch = listener.onResolveRule(rule);
                    if (batch) {
                        responded = true;
                        extend(commands, batch.commands);
                    }
                }
            }

            if (responded)
                return {
                    ruleId: rule.id,
                    commands: commands
                };
            else
                return null;
        }

        onBroadcastCommands(batch: BatchCommand): void {
            for (var i = 0; i < this.listeners.length; ++i) {
                var listener = this.listeners[i];
                if (listener && typeof listener.onBroadcastCommands === 'function')
                    listener.onBroadcastCommands(batch);
            }
        }

        sendCommands(batch: BatchCommand) {}

        pollServer() {}
    }

    export class BaseServerProxy {
        public lastRuleId: number = -1;

        constructor(public userNames: string, public listener: ProxyListener) {}

        onSendCommands(batch: BatchCommand): void {
            if (this.listener && typeof this.listener.onSendCommands === 'function')
                this.listener.onSendCommands(batch);
        }

        resolveRule(rule: BaseRule): BatchCommand {
            return {
                ruleId: rule.id,
                commands: {}
            };
        }

        broadcastCommands(batch: BatchCommand) {}
    }

    export class LocalClientProxy extends BaseClientProxy {
        public serverPair: LocalServerProxy;

        constructor(userNames: string) {
            super(userNames);
        }

        setPair(proxy: LocalServerProxy) {
            this.serverPair = proxy;
        }

        resolveRule(rule: BaseRule): BatchCommand {
            return this.onResolveRule(rule);
        }

        broadcastCommands(batch: BatchCommand) {
            if (!batch)
                return;

            this.onBroadcastCommands(batch);
            this.lastRuleId = batch.ruleId;
        }

        sendCommands(batch: BatchCommand) {
            if (!batch)
                return;

            this.serverPair.sendCommands(batch);
        }
    }

    export class LocalServerProxy extends BaseServerProxy {
        public clientPair: LocalClientProxy;

        constructor(userNames: string, listener: ProxyListener) {
            super(userNames, listener);
        }

        setPair(proxy: LocalClientProxy) {
            this.clientPair = proxy;
        }

        resolveRule(rule: BaseRule): BatchCommand {
            return this.clientPair.resolveRule(rule);
        }

        broadcastCommands(batch: BatchCommand) {
            if (!batch)
                return;

            if (this.lastRuleId < batch.ruleId) {
                this.clientPair.broadcastCommands(batch);
                this.lastRuleId = batch.ruleId;
            }
        }

        sendCommands(batch: BatchCommand) {
            if (!batch)
                return;

            this.onSendCommands(batch);
        }
    }

    export interface RESTResponse {
        batches: BatchCommand[];
        rule: BaseRule;
    }

    export class RESTServerProxy extends BaseServerProxy {
        private lastRule = null;
        private batches: BatchCommand[] = [];

        constructor(userNames: string, public whereList: any[], listener: ProxyListener) {
            super(userNames, listener);
        }

        // server side
        resolveRule(rule: BaseRule): BatchCommand {
            // convert a function to an index
            if ('where' in rule)
                rule['whereIndex'] = this.whereList.indexOf(rule['where']);

            this.lastRule = extend({}, rule);

            return {
                ruleId: rule.id,
                commands: {}
            };
        }

        broadcastCommands(batch: BatchCommand) {
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

    export class RESTClientProxy extends BaseClientProxy {
        private request: any = null;
        private lastRespondedRuleId: number = -1;
        private waitingForCommands: boolean = false;

        constructor(userNames: string, private whereList: any[]) {
            super(userNames);

            if (HTML_DEFINED) {
                this.request = new XMLHttpRequest();
                var self = this;
                this.request.onload = function() {
                    self.serverResponse(this.response);
                }

                this.periodicPoll();
            }
        }

        sendCommands(batch: BatchCommand) {
            if (!batch)
                return;

            if (HTML_DEFINED) {
                this.waitingForCommands = false;

                console.log('send commands - ' + this.userNames + ' - rule - ' + batch.ruleId);
                this.request.open('POST', 'new?userNames=' + this.userNames);
                this.request.setRequestHeader('Content-Type', 'application/json');
                this.request.send(JSON.stringify(batch));
                this.pollServer();
            }
        }

        serverResponse(resp) {
            if (HTML_DEFINED) {
                var response = < RESTResponse > (JSON.parse(resp));

                // commands must be processed before rules
                for (var i = 0; i < response.batches.length; ++i) {
                    var batch = response.batches[i];
                    this.onBroadcastCommands(batch);
                    this.lastRuleId = batch.ruleId; // remember the last id
                    console.log('received command - ' + batch.ruleId);
                }

                var rule = response.rule;

                // check the ruleId here, because it is possible that although we
                // have responded to a rule, other players may not yet have responded, hence
                // the rule is still pending and we receive it again on the next poll
                if (rule && rule.id > this.lastRespondedRuleId) {
                    this.lastRespondedRuleId = rule.id;

                    if ('whereIndex' in rule)
                        rule['where'] = this.whereList[rule['whereIndex']];

                    console.log('resolve rule - ' + rule.id);
                    var batch = this.onResolveRule(rule);

                    if (batch)
                        this.sendCommands(batch);
                    else
                        this.waitingForCommands = true;
                }
            }
        }

        pollServer() {
            if (HTML_DEFINED) {
                console.log('poll server after - ' + this.lastRuleId);
                this.request.open('GET', 'moves?userNames=' + this.userNames + '&afterId=' + this.lastRuleId);
                this.request.setRequestHeader('Content-Type', 'application/json');
                this.request.send();
            }
        }

        periodicPoll() {
            if (HTML_DEFINED) {
                if (!this.waitingForCommands)
                    this.pollServer();

                window.setTimeout(this.periodicPoll.bind(this), 2000);
            }
        }
    }

    export class MessageServerProxy extends BaseServerProxy {
        lastRule: BaseRule = null;

        constructor(userNames: string, private iframeElem: HTMLIFrameElement, private whereList: any[], listener: ProxyListener) {
            super(userNames, listener);

            window.addEventListener('message', this.onClientMessage.bind(this));
        }

        resolveRule(rule: BaseRule): BatchCommand {
            if (!rule)
                return;

            var msg = {
                type: 'resolveRule',
                userNames: this.userNames,
                rule: rule
            };

            if ('where' in rule)
                rule['whereIndex'] = this.whereList.indexOf(rule['where']);

            console.log('SEND resolveRule to:' + msg.userNames + ' id:' + msg.rule.id);
            this.iframeElem.contentWindow.postMessage(JSON.stringify(msg), '*');
            return null;
        }

            broadcastCommands(batch: BatchCommand) {
            if (!batch)
                return;

            var msg = {
                type: 'broadcastCommands',
                userNames: this.userNames,
                batch: batch
            };

            console.log('SEND broadcastCommands (' + Object.keys(batch.commands).length + ') to:' + msg.userNames + ' id:' + batch.ruleId);
            this.iframeElem.contentWindow.postMessage(JSON.stringify(msg), '*');
        }

            private onClientMessage(e) {
            var msg: any = JSON.parse(e.data);
            if (!msg || typeof msg !== 'object') {
                _error('server received invalid message');
                return;
            }

            if (msg.userNames !== this.userNames)
                return; // not the correct userNames

            if (msg.type === 'sendCommands')
                this.onSendCommands(msg.batch);
        }
    }

    export class MessageClientProxy extends BaseClientProxy {
        private rule: BaseRule = null;
        private batches: BatchCommand[] = [];

        constructor(userNames: string, private whereList: any[]) {
            super(userNames);
        }

        sendCommands(batch: BatchCommand) {
            if (!batch)
                return;

            var msg = {
                type: 'sendCommands',
                userNames: this.userNames,
                batch: batch
            };
            window.parent.postMessage(JSON.stringify(msg), '*');
        }

        // when debugging, messages from the server can be received out of order
        // so only process the commands once we receive all of them in order 
        onServerMessage(msg: any): boolean {
            if (!msg || typeof msg !== 'object') {
                _error('client (' + this.userNames + ') received invalid message');
                return;
            }

            if (msg.type === 'broadcastCommands')
                console.log('onBroadcastCommands to:' + msg.userNames + ' this:' + this.userNames + ' id:' + msg.batch.ruleId);
            else if (msg.type === 'resolveRule')
                console.log('onResolveRule to:' + msg.userNames + ' this:' + this.userNames + ' id:' + msg.rule.id);

            if (msg.userNames !== this.userNames)
                return; // not the correct userNames

            if (msg.type === 'resolveRule') {
                var rule = msg.rule;
                if ('whereIndex' in rule)
                    rule['where'] = this.whereList[rule['whereIndex']];

                this.rule = msg.rule;
                if (this.rule.id === this.lastRuleId + 1)
                    this.sendMessages();

            } else if (msg.type === 'broadcastCommands') {
                this.batches.push(msg.batch);
                this.batches.sort(function(a, b): number {
                    return a.ruleId - b.ruleId;
                });

                if (msg.batch.ruleId === this.lastRuleId + 1)
                    this.sendMessages();
            } else {
                _error('client (' + this.userNames + ') received unknown message type - ' + msg.type);
            }
        }

        private sendMessages() {
            // commands always sent first, send as many sequential commands as possible
            if (this.batches.length > 0) {
                var allSent = true;
                var i = 0;
                for (; i < this.batches.length; ++i) {
                    if (this.batches[i].ruleId === this.lastRuleId + 1) {
                        this.onBroadcastCommands(this.batches[i]);
                        this.lastRuleId++;
                    } else {
                        break;
                    }
                }

                // remove the processed batches
                this.batches.splice(0, i);
            }

            // then the rule
            if (this.rule && this.rule.id === this.lastRuleId + 1) {
                var batch = this.onResolveRule(this.rule);
                this.rule = null;

                if (batch)
                    this.sendCommands(batch);

                // do not update the lastRuleId, we will get a message from the server to do that
            }

            // TODO - do we need to handle deprecated rules???
        }
    }
}
