module Game {
    // var HTML_DEFINED = typeof window !== 'undefined';

    //--------------------------------------------
    var localTransportList: {
        [user: string]: LocalTransport
    } = {};

    export var createLocalServerTransport = function(user: string, handler: (msg: any) => void): LocalTransport {
        var proxy = new LocalTransport(user, handler);
        localTransportList[user] = proxy;
        return proxy;
    }

    export var createLocalClientTransport = function(user: string, handler: (msg: any) => void): LocalTransport {
        var proxy = new LocalTransport(user, handler);
        var serverTransport = localTransportList[user];
        if (serverTransport) {
            proxy.setPair(serverTransport);
            serverTransport.setPair(proxy);
        }
        return proxy;
    }

    export var createRESTServerTransport = function(user: string, handler: (msg: any) => void): RESTServerTransport {
        return new RESTServerTransport(user, handler);
    }

    export var createRESTClientTransport = function(user: string, handler: (msg: any) => void, uri: string = 'message', pollTimeMS: number = 2000): RESTClientTransport {
        return new RESTClientTransport(user, handler, uri, pollTimeMS);
    }

    export var createMessageServerTransport = function(user: string, window: any, handler: (msg: any) => void): MessageTransport {
        return new MessageTransport(user, window, handler);
    }

    export var createMessageClientTransport = function(user: string, window: any, handler: (msg: any) => void): MessageTransport {
        return new MessageTransport(user, window, handler);
    }

    //--------------------------------------------
    export class BaseTransport {
        constructor( /*protected*/ public user: string, private handler: (msg: any) => void) {
            if (typeof handler !== 'function')
                debugger;
        }

        /*protected*/
        callHandler(msg: any) {
            this.handler(msg);
        }

        sendMessage(msg: any) {}
    }

    //--------------------------------------------
    export class LocalTransport extends BaseTransport {
        private pair: LocalTransport;
        private isProcessing: boolean = false;
        private pendingMessages: string[] = [];

        constructor(user: string, handler: (msg: any) => void) {
            super(user, handler);
        }

        setPair(proxy: LocalTransport) {
            this.pair = proxy;
        }

        sendMessage(msg: any) {
            if (this.isProcessing) {
                this.pendingMessages.push(msg);
                return;
            }

            if (this.pair) {
                // the client may try to send a reply message while we are calling
                // it's handler, so queue the messages and send them after we've 
                // finished with the client
                this.pair.setProcessing(true);
                this.pair.callHandler(msg);
                this.pair.setProcessing(false);
            }
        }

        private setProcessing(value: boolean) {
            this.isProcessing = value;
            if (!value)
                setTimeout(this.sendPending.bind(this), 0);
        }

        sendPending() {
            for (var i = 0; i < this.pendingMessages.length; ++i)
                this.sendMessage(this.pendingMessages[i])

            this.pendingMessages = [];
        }
    }

    //--------------------------------------------
    export interface RESTPacket {
        id: number;
        msg: any;
    }

    // needs require('body-parser').json() middleware
    export class RESTServerTransport extends BaseTransport {
        private packets: RESTPacket[] = [];
        private lastId: number = -1;

        constructor(user: string, handler: (msg: any) => void) {
            super(user, handler);
        }

        sendMessage(msg: any) {
            var packet: RESTPacket = {
                id: ++this.lastId,
                msg: msg
            };
            this.packets.push(packet);
        }

        onGet(req, res): RESTPacket[] {
            var user = req.param('user');
            var afterId = req.param('afterId');

            if (user !== this.user)
                return [];

            var responses: RESTPacket[] = [];

            for (var i = 0; i < this.packets.length; ++i) {
                var packet = this.packets[i];
                if (packet.id > afterId)
                    responses.push(packet);
            }

            return responses;
        }

        onPost(req, res) {
            var user = req.param('user');

            if (user !== this.user)
                return;

            this.callHandler(req.body);
        }
    }

    export class RESTClientTransport extends BaseTransport {
        private lastId: number = -1;
        private request: XMLHttpRequest;

        constructor(user: string, handler: (msg: any) => void, private uri: string = 'message', private pollTimeMS: number = 2000) {
            super(user, handler);

            var self = this;

            this.request = new XMLHttpRequest();
            this.request.onload = function() {
                self.onServerResponse(this.response)
            }

            this.periodicPoll();
        }

        sendMessage(msg: any) {
            console.log('POST ' + this.uri + '?user=' + this.user);
            this.request.open('POST', this.uri + '?user=' + this.user);
            this.request.setRequestHeader('Content-Type', 'application/json');
            this.request.send(JSON.stringify(msg));

            // there may be some new data after the POST
            this.pollServer();
        }

        pollServer() {
            console.log('GET ' + this.uri + '?user=' + this.user + '&afterId=' + this.lastId);
            this.request.open('GET', this.uri + '?user=' + this.user + '&afterId=' + this.lastId);
            this.request.setRequestHeader('Content-Type', 'application/json');
            this.request.send();
        }

        private onServerResponse(resp: string) {
            var packets = < RESTPacket[] > (JSON.parse(resp));

            for (var i = 0; i < packets.length; ++i) {
                var packet = packets[i];
                this.callHandler(packet.msg);
                this.lastId = packet.id;
            }
        }

        private periodicPoll() {
            this.pollServer();

            window.setTimeout(this.periodicPoll.bind(this), this.pollTimeMS);
        }
    }

    //--------------------------------------------
    interface MessagePacket {
        id: number;
        user: string;
        msg: any;
    }

    class SortedPackets {
        packets: MessagePacket[] = [];

        get length(): number {
            return this.packets.length;
        }

        addSorted(packet: MessagePacket) {
            this.packets.push(packet);
            this.packets.sort(function(a, b) {
                return a.id - b.id
            });
        }

        get(i: number): MessagePacket {
            if (i < 0 || i > this.packets.length)
                return undefined;

            return this.packets[i];
        }

        clearFirst(i: number) {
            this.packets.splice(0, i);
        }
    }

    export class MessageTransport extends BaseTransport {
        private lastSendId: number = -1;
        private lastReceiveId: number = -1;
        private packets: SortedPackets = new SortedPackets();

        constructor(user: string, private postWindow: any, handler: (msg: any) => void) {
            super(user, handler);

            window.addEventListener('message', this.onReceiveMessage.bind(this));
        }

        sendMessage(msg: any) {
            var packet: MessagePacket = {
                id: ++this.lastSendId,
                user: this.user,
                msg: msg
            };
            this.postWindow.postMessage(JSON.stringify(packet), '*')
        }

        private onReceiveMessage(e) {
            var packet: MessagePacket = JSON.parse(e.data);
            if (!('id' in packet) || !('msg' in packet) || !('user' in packet))
                return; // not a packet

            if (packet.user !== this.user)
                return; // not our packet

            // when debugging, packets may be received out of order, but they must
            // be sent to the handlers in order
            this.packets.addSorted(packet);

            for (var i = 0; i < this.packets.length; ++i) {
                var packet = this.packets.get(i);
                if (packet.id === this.lastReceiveId + 1) {
                    this.lastReceiveId = packet.id;
                    this.callHandler(packet.msg);
                }
            }

            this.packets.clearFirst(i);
        }
    }
}
