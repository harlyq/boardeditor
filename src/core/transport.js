var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var BoardSystem;
(function (BoardSystem) {
    // var HTML_DEFINED = typeof window !== 'undefined';
    //--------------------------------------------
    var localTransportList = {};

    BoardSystem.createLocalServerTransport = function (user, handler) {
        var proxy = new LocalTransport(user, handler);
        localTransportList[user] = proxy;
        return proxy;
    };

    BoardSystem.createLocalClientTransport = function (user, handler) {
        var proxy = new LocalTransport(user, handler);
        var serverTransport = localTransportList[user];
        if (serverTransport) {
            proxy.setPair(serverTransport);
            serverTransport.setPair(proxy);
        }
        return proxy;
    };

    BoardSystem.createRESTServerTransport = function (user, handler) {
        return new RESTServerTransport(user, handler);
    };

    BoardSystem.createRESTClientTransport = function (user, handler, uri, pollTimeMS) {
        if (typeof uri === "undefined") { uri = 'message'; }
        if (typeof pollTimeMS === "undefined") { pollTimeMS = 2000; }
        return new RESTClientTransport(user, handler, uri, pollTimeMS);
    };

    BoardSystem.createMessageServerTransport = function (user, window, handler) {
        return new MessageTransport(user, window, handler);
    };

    BoardSystem.createMessageClientTransport = function (user, window, handler) {
        return new MessageTransport(user, window, handler);
    };

    //--------------------------------------------
    var BaseTransport = (function () {
        function BaseTransport(/*protected*/ user, handler) {
            this.user = user;
            this.handler = handler;
            if (typeof handler !== 'function')
                debugger;
        }
        /*protected*/
        BaseTransport.prototype.callHandler = function (msg) {
            this.handler(msg);
        };

        BaseTransport.prototype.sendMessage = function (msg) {
        };
        return BaseTransport;
    })();
    BoardSystem.BaseTransport = BaseTransport;

    //--------------------------------------------
    var LocalTransport = (function (_super) {
        __extends(LocalTransport, _super);
        function LocalTransport(user, handler) {
            _super.call(this, user, handler);
            this.isProcessing = false;
            this.pendingMessages = [];
        }
        LocalTransport.prototype.setPair = function (proxy) {
            this.pair = proxy;
        };

        LocalTransport.prototype.sendMessage = function (msg) {
            if (this.isProcessing) {
                this.pendingMessages.push(msg);
                return;
            }

            if (this.pair) {
                // the client may try to send a reply message while we are calling
                // it's handler, so queue the messages and send them after we've
                // finished with the client
                this.setProcessing(true);
                this.pair.setProcessing(true);
                this.pair.callHandler(msg);
                this.pair.setProcessing(false);
                this.setProcessing(false);
            }
        };

        LocalTransport.prototype.setProcessing = function (value) {
            this.isProcessing = value;
            if (!value)
                setTimeout(this.sendPending.bind(this), 0);
        };

        LocalTransport.prototype.sendPending = function () {
            for (var i = 0; i < this.pendingMessages.length; ++i)
                this.sendMessage(this.pendingMessages[i]);

            this.pendingMessages = [];
        };
        return LocalTransport;
    })(BaseTransport);
    BoardSystem.LocalTransport = LocalTransport;

    

    // needs require('body-parser').json() middleware
    var RESTServerTransport = (function (_super) {
        __extends(RESTServerTransport, _super);
        function RESTServerTransport(user, handler) {
            _super.call(this, user, handler);
            this.packets = [];
            this.lastId = -1;
        }
        RESTServerTransport.prototype.sendMessage = function (msg) {
            var packet = {
                id: ++this.lastId,
                msg: msg
            };
            this.packets.push(packet);
        };

        RESTServerTransport.prototype.onGet = function (req, res) {
            var user = req.param('user');
            var afterId = req.param('afterId');

            if (user !== this.user)
                return [];

            var responses = [];

            for (var i = 0; i < this.packets.length; ++i) {
                var packet = this.packets[i];
                if (packet.id > afterId)
                    responses.push(packet);
            }

            return responses;
        };

        RESTServerTransport.prototype.onPost = function (req, res) {
            var user = req.param('user');

            if (user !== this.user)
                return;

            this.callHandler(req.body);
        };
        return RESTServerTransport;
    })(BaseTransport);
    BoardSystem.RESTServerTransport = RESTServerTransport;

    var RESTClientTransport = (function (_super) {
        __extends(RESTClientTransport, _super);
        function RESTClientTransport(user, handler, uri, pollTimeMS) {
            if (typeof uri === "undefined") { uri = 'message'; }
            if (typeof pollTimeMS === "undefined") { pollTimeMS = 2000; }
            _super.call(this, user, handler);
            this.uri = uri;
            this.pollTimeMS = pollTimeMS;
            this.lastId = -1;

            var self = this;

            this.request = new XMLHttpRequest();
            this.request.onload = function () {
                self.onServerResponse(this.response);
            };

            this.periodicPoll();
        }
        RESTClientTransport.prototype.sendMessage = function (msg) {
            console.log('POST ' + this.uri + '?user=' + this.user);
            this.request.open('POST', this.uri + '?user=' + this.user);
            this.request.setRequestHeader('Content-Type', 'application/json');
            this.request.send(JSON.stringify(msg));

            // there may be some new data after the POST
            this.pollServer();
        };

        RESTClientTransport.prototype.pollServer = function () {
            console.log('GET ' + this.uri + '?user=' + this.user + '&afterId=' + this.lastId);
            this.request.open('GET', this.uri + '?user=' + this.user + '&afterId=' + this.lastId);
            this.request.setRequestHeader('Content-Type', 'application/json');
            this.request.send();
        };

        RESTClientTransport.prototype.onServerResponse = function (resp) {
            var packets = (JSON.parse(resp));

            for (var i = 0; i < packets.length; ++i) {
                var packet = packets[i];
                this.callHandler(packet.msg);
                this.lastId = packet.id;
            }
        };

        RESTClientTransport.prototype.periodicPoll = function () {
            this.pollServer();

            window.setTimeout(this.periodicPoll.bind(this), this.pollTimeMS);
        };
        return RESTClientTransport;
    })(BaseTransport);
    BoardSystem.RESTClientTransport = RESTClientTransport;

    

    var SortedPackets = (function () {
        function SortedPackets() {
            this.packets = [];
        }
        Object.defineProperty(SortedPackets.prototype, "length", {
            get: function () {
                return this.packets.length;
            },
            enumerable: true,
            configurable: true
        });

        SortedPackets.prototype.addSorted = function (packet) {
            this.packets.push(packet);
            this.packets.sort(function (a, b) {
                return a.id - b.id;
            });
        };

        SortedPackets.prototype.get = function (i) {
            if (i < 0 || i > this.packets.length)
                return undefined;

            return this.packets[i];
        };

        SortedPackets.prototype.clearFirst = function (i) {
            this.packets.splice(0, i);
        };
        return SortedPackets;
    })();

    var MessageTransport = (function (_super) {
        __extends(MessageTransport, _super);
        function MessageTransport(user, postWindow, handler) {
            _super.call(this, user, handler);
            this.postWindow = postWindow;
            this.lastSendId = -1;
            this.lastReceiveId = -1;
            this.packets = new SortedPackets();

            window.addEventListener('message', this.onReceiveMessage.bind(this));
        }
        MessageTransport.prototype.sendMessage = function (msg) {
            var packet = {
                id: ++this.lastSendId,
                user: this.user,
                msg: msg
            };
            this.postWindow.postMessage(JSON.stringify(packet), '*');
        };

        MessageTransport.prototype.onReceiveMessage = function (e) {
            var packet = JSON.parse(e.data);
            if (!('id' in packet) || !('msg' in packet) || !('user' in packet))
                return;

            if (packet.user !== this.user)
                return;

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
        };
        return MessageTransport;
    })(BaseTransport);
    BoardSystem.MessageTransport = MessageTransport;
})(BoardSystem || (BoardSystem = {}));
