/// <reference path="_dependencies.ts" />

module Game {
    export function getScreenConfig(config: GameConfig, screen: string): ScreenConfig {
        for (var i = 0; i < config.screens.length; ++i) {
            if (config.screens[i].screen === screen)
                return config.screens[i];
        }
        return null;
    }

    export function getUserNames(screenConfig: ScreenConfig) {
        var userNames = [];
        for (var i = 0; i < screenConfig.users.length; ++i) {
            if (screenConfig.users[i])
                userNames.push(screenConfig.users[i].name);
        }
        return userNames.join(',');
    }

    var createClientFunc: {
        [key: string]: (userName: string, proxy: BaseClientProxy, board: Board) => Client
    } = {};

    export function registerClient(clientName: string, createFunc: (userName: string, proxy: BaseClientProxy, board: Board) => Client) {
        createClientFunc[clientName] = createFunc;
    }

    export function createClients(screen: string, game: any, config: GameConfig): GameConfig {
        var screenConfig = getScreenConfig(config, screen);
        if (!screenConfig)
            return null;

        var userNames = getUserNames(screenConfig);
        var users = screenConfig.users;
        var numPlayers = users.length;
        var proxy: BaseClientProxy = null;

        switch (screenConfig.transport) {
            case 'REST':
                proxy = createRESTClientProxy(userNames, game.whereList);
                break;
            case 'local':
                proxy = createLocalClientProxy(userNames);
                break;
            case 'message':
                proxy = createMessageClientProxy(userNames, game.whereList);
                break;
        }
        if (!proxy)
            return config;

        proxy.setup(game.setupFunc);
        screenConfig.proxy = proxy;

        for (var i = 0; i < numPlayers; ++i) {
            var user = users[i];
            var client: Client = null;

            if (user.type in createClientFunc)
                client = createClientFunc[user.type](user.name, proxy, proxy.board);

            user.client = client;

            if (!client)
                continue; // client type not supported

            proxy.addListener(client);

            if (screenConfig.mode !== 'shared') {
                // every client gets a me value centered around them
                client.setLocalVariable('me', user.me);
                for (var j = 0; j < numPlayers; ++j) {
                    if (j === i)
                        continue;

                    if (j > i) {
                        client.setLocalVariable('me+' + (j - i), users[j].me);
                        client.setLocalVariable('me-' + (i + numPlayers - j), users[j].me);
                    } else {
                        client.setLocalVariable('me+' + (j + numPlayers - i), users[j].me);
                        client.setLocalVariable('me-' + (i - j), users[j].me);
                    }
                }
            } else {
                // every client gets the same me value (that of the first client)
                for (var j = 0; j < numPlayers; ++j) {
                    if (j === 0) {
                        client.setLocalVariable('me', users[j].me);
                    } else {
                        client.setLocalVariable('me+' + j, users[j].me);
                        client.setLocalVariable('me-' + (numPlayers - j), users[j].me);
                    }
                }
            }

            client.setup();
        }

        return config;
    }

    export function createServer(game: any, config: GameConfig): GameServer {
        var server = new GameServer();

        for (var i = 0; i < config.screens.length; ++i) {
            var screenConfig = config.screens[i];
            if (!screenConfig)
                continue;

            var userNames = getUserNames(screenConfig);
            var proxy: BaseServerProxy = null;

            switch (screenConfig.transport) {
                case 'REST':
                    proxy = Game.createRESTServerProxy(userNames, game.whereList, server);
                    break;
                case 'local':
                    proxy = Game.createLocalServerProxy(userNames, server);
                    break;
                case 'message':
                    var iframe = < HTMLIFrameElement > (document.getElementById(screenConfig.iframe));
                    proxy = Game.createMessageServerProxy(userNames, iframe, game.whereList, server);
                    break;
            }

            if (!proxy)
                continue;

            server.addProxy(proxy);
        }
        var bankServerProxy = Game.createLocalServerProxy('BANK', server);
        var bankClientProxy = Game.createLocalClientProxy('BANK');
        var bankClient = new Game.BankClient('BANK', bankClientProxy, bankClientProxy.board);
        bankClientProxy.addListener(bankClient);
        server.addProxy(bankServerProxy);
        bankClientProxy.setup(game.setupFunc);
        bankClient.setup(); // must occur after the proxy is setup

        server.config = config;
        server.setupFunc = game.setupFunc;

        server.setup();

        return server;
    }

    export function getClientProxy(config: GameConfig, screen: string): BaseClientProxy {
        var screenConfig = getScreenConfig(config, screen);
        if (!screenConfig)
            return null;

        return screenConfig.proxy;
    }

    export function queryServer(setup: any, screen: string) {
        var config: any;

        registerClient('AI', function(userName: string, proxy: BaseClientProxy, board: Board) {
            return new AIClient(userName, proxy, board);
        });

        // setup for debug server
        window.addEventListener('message', function(e) {
            var msg = JSON.parse(e.data);
            if (!('type' in msg))
                return; // unknown message

            switch (msg.type) {
                case 'config':
                    config = msg;
                    createClients(screen, setup, config);
                    break;

                case 'broadcastCommands':
                case 'resolveRule':
                    var proxy = < MessageClientProxy > getClientProxy(config, screen);
                    if (proxy && typeof proxy.onServerMessage === 'function')
                        proxy.onServerMessage(msg);
                    break;
            }
        });

        // setup for web server
        var req = new XMLHttpRequest();
        req.onload = function() {
            var msg = JSON.parse(this.response);
            if ('type' in msg && msg.type === 'loveletter') {
                config = msg;
                createClients(screen, setup, config);
            }

            var proxy = < RESTClientProxy > getClientProxy(config, screen);
            if (proxy && typeof proxy.pollServer === 'function')
                proxy.pollServer();
        };
        req.open('GET', 'config?screen=' + screen); // this board layout
        req.setRequestHeader('Content-Type', 'application/json');
        try {
            req.send(); // will fail for the iframe (debug server) version
        } catch (e) {}
    }
}
