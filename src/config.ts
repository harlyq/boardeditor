/// <reference path="_dependencies.ts" />

module Game {
    export function getScreenConfigByScreen(config: GameConfig, screen: string): ScreenConfig {
        for (var i = 0; i < config.screens.length; ++i) {
            if (config.screens[i].screen === screen)
                return config.screens[i];
        }
        return null;
    }

    export function getScreenConfigByUser(config: GameConfig, user: string): ScreenConfig {
        var numUsers = user.split(',').length;
        for (var i = 0; i < config.screens.length; ++i) {
            if (union(user, config.screens[i].user).length === numUsers)
                return config.screens[i];
        }
        return null;
    }

    export function createClient(
        game: any,
        screenConfig: ScreenConfig,
        createClientFunc: (user: string, proxy: BaseClientProxy, board: Board) => Client): Client {

        var user = screenConfig.user;
        var proxy: BaseClientProxy = null;

        switch (screenConfig.transport) {
            case 'REST':
                proxy = createRESTClientProxy(user, game.whereList);
                break;

            case 'local':
                proxy = createLocalClientProxy(user);
                break;

            case 'message':
                proxy = createMessageClientProxy(user, game.whereList);
                break;
        }
        if (!proxy)
            return null;

        var board = new Board();
        game.setupFunc(board);

        var client = createClientFunc(user, proxy, board);
        // screenConfig.client = client;

        return client;

        // proxy.setup(game.setupFunc);
        // screenConfig.proxy = proxy;

        // for (var i = 0; i < numPlayers; ++i) {
        //     var user = users[i],
        //         client: Client = null,
        //         board = new Board();

        //     game.setupFunc(board);

        //     switch (user.type) {
        //         case 'AI':
        //             break;

        //         case 'Human':
        //             break;

        //         case 'BANK':
        //             break;
        //     }

        //     if (user.type in createClientFunc)
        //         client = createClientFunc[user.type](user.name, proxy, board);

        //     user.client = client;

        //     if (!client)
        //         continue; // client type not supported

        //     proxy.addListener(client);

        //     if (screenConfig.mode !== 'shared') {
        //         // every client gets a me value centered around them
        //         client.setLocalVariable('me', user.me);
        //         for (var j = 0; j < numPlayers; ++j) {
        //             if (j === i)
        //                 continue;

        //             if (j > i) {
        //                 client.setLocalVariable('me+' + (j - i), users[j].me);
        //                 client.setLocalVariable('me-' + (i + numPlayers - j), users[j].me);
        //             } else {
        //                 client.setLocalVariable('me+' + (j + numPlayers - i), users[j].me);
        //                 client.setLocalVariable('me-' + (i - j), users[j].me);
        //             }
        //         }
        //     } else {
        //         // every client gets the same me value (that of the first client)
        //         for (var j = 0; j < numPlayers; ++j) {
        //             if (j === 0) {
        //                 client.setLocalVariable('me', users[j].me);
        //             } else {
        //                 client.setLocalVariable('me+' + j, users[j].me);
        //                 client.setLocalVariable('me-' + (numPlayers - j), users[j].me);
        //             }
        //         }
        //     }

        //     client.setup();
        // }
    }

    export function createServer(game: any, config: GameConfig): GameServer {
        var server = new GameServer();

        for (var i = 0; i < config.screens.length; ++i) {
            var screenConfig = config.screens[i];
            if (!screenConfig)
                continue;

            var user = screenConfig.user;
            var proxy: BaseServerProxy = null;

            switch (screenConfig.transport) {
                case 'REST':
                    proxy = Game.createRESTServerProxy(user, game.whereList, server);
                    break;

                case 'local':
                    proxy = Game.createLocalServerProxy(user, server);
                    break;

                case 'message':
                    var iframe = < HTMLIFrameElement > (document.getElementById(screenConfig.iframe));
                    proxy = Game.createMessageServerProxy(user, iframe, game.whereList, server);

                    // for message we tell the iframe which screen to use
                    var msg = {
                        type: 'config',
                        config: screenConfig,
                        screen: screenConfig.screen
                    }
                    iframe.contentWindow.postMessage(JSON.stringify(msg), '*');
                    break;
            }

            if (!proxy)
                continue;

            server.addProxy(proxy);

            if (screenConfig.transport === 'local') {
                var client = createClient(game, screenConfig, function(user, proxy, board) {
                    switch (screenConfig.type) {
                        case 'bank':
                            return new BankClient(user, proxy, board);
                            break;
                        case 'AI':
                            return new AIClient(user, proxy, board);
                            break;
                    }
                    return null;
                });
                // screenConfig.client = client;
            }
        }

        server.config = config;
        server.setupFunc = game.setupFunc;
        server.setup();

        return server;
    }

    export function queryServer(setup: any, boardElem: HTMLElement) {
        var screenConfig: ScreenConfig,
            client: Client,
            screen: string;

        var createHumanFunc = function(user, proxy, board) {
            return new HumanClient(user, proxy, board, boardElem);
        };

        // setup for debug server
        window.addEventListener('message', function(e) {
            var msg = JSON.parse(e.data);
            if (!('type' in msg))
                return; // unknown message

            switch (msg.type) {
                case 'config':
                    screenConfig = msg.config;
                    screen = msg.screen;
                    client = createClient(setup, screenConfig, createHumanFunc);
                    break;

                case 'broadcastCommands':
                case 'resolveRule':
                    var proxy = < MessageClientProxy > (client ? client.getProxy() : null);
                    if (proxy && typeof proxy.onServerMessage === 'function')
                        proxy.onServerMessage(msg);
                    break;
            }
        });

        // // setup for web server
        // var req = new XMLHttpRequest();
        // req.onload = function() {
        //     var msg = JSON.parse(this.response);
        //     if ('type' in msg && msg.type === 'loveletter') {
        //         config = msg.config;
        //         screen = msg.screen;
        //         client = createClient(setup, screen, config, createHumanFunc);
        //     }

        //     var proxy = < RESTClientProxy > (client ? client.getProxy() : null);
        //     if (proxy && typeof proxy.pollServer === 'function')
        //         proxy.pollServer();
        // };
        // req.open('GET', 'config?screen=' + screen); // this board layout
        // req.setRequestHeader('Content-Type', 'application/json');
        // try {
        //     req.send(); // will fail for the iframe (debug server) version
        // } catch (e) {}
    }
}
