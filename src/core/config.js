/// <reference path="_dependencies.ts" />
var BoardSystem;
(function (BoardSystem) {
    function getScreenConfigByScreen(config, screen) {
        for (var i = 0; i < config.screens.length; ++i) {
            if (config.screens[i].screen === screen)
                return config.screens[i];
        }
        return null;
    }
    BoardSystem.getScreenConfigByScreen = getScreenConfigByScreen;

    function getScreenConfigByUser(config, user) {
        var numUsers = user.split(',').length;
        for (var i = 0; i < config.screens.length; ++i) {
            if (BoardSystem.union(user, config.screens[i].user).length === numUsers)
                return config.screens[i];
        }
        return null;
    }
    BoardSystem.getScreenConfigByUser = getScreenConfigByUser;

    function createClient(game, screenConfig, boardElem) {
        var board = new BoardSystem.Board(), user = screenConfig.user, client = null, proxy = null;

        game.setupFunc(board);

        switch (screenConfig.type) {
            case 'human':
                client = new BoardSystem.HTMLClient(user, board, boardElem);
                break;

            case 'ai':
                client = new BoardSystem.AIClient(user, board);
                break;

            case 'bank':
                client = new BoardSystem.BankClient(user, board);
                break;
        }
        if (!client)
            return null;

        switch (screenConfig.transport) {
            case 'REST':
                proxy = BoardSystem.createRESTClientTransport(user, client.onHandleMessage.bind(client));
                break;

            case 'local':
                proxy = BoardSystem.createLocalClientTransport(user, client.onHandleMessage.bind(client));
                break;

            case 'message':
                proxy = BoardSystem.createMessageClientTransport(user, window.parent, client.onHandleMessage.bind(client));
                break;
        }
        client.setTransport(proxy);

        return client;
    }
    BoardSystem.createClient = createClient;

    function createServer(game, config) {
        var server = new BoardSystem.GameServer();

        for (var i = 0; i < config.screens.length; ++i) {
            var screenConfig = config.screens[i];
            if (!screenConfig)
                continue;

            var screenTransport = createTransport(screenConfig, server.onHandleMessage.bind(server));
            if (!screenTransport)
                continue;

            server.addTransport(screenTransport);

            // setup all local clients
            if (screenConfig.transport === 'local')
                var client = createClient(game, screenConfig, null);
        }

        // setup special bank client
        var bankConfig = {
            screen: 'bank',
            userKey: '-1',
            transport: 'local',
            user: 'BANK',
            type: 'bank'
        };

        // transport must be first
        var bankTransport = createTransport(bankConfig, server.onHandleMessage.bind(server));
        var bankClient = createClient(game, bankConfig, null);

        server.addTransport(bankTransport);
        server.setBankClient(bankClient);
        server.config = config;

        return server;
    }
    BoardSystem.createServer = createServer;

    function createTransport(screenConfig, handler) {
        var transport = null, user = screenConfig.user;

        switch (screenConfig.transport) {
            case 'REST':
                transport = BoardSystem.createRESTServerTransport(user, handler);
                break;

            case 'local':
                transport = BoardSystem.createLocalServerTransport(user, handler);
                break;

            case 'message':
                var iframe = (document.getElementById(screenConfig.iframe));
                transport = BoardSystem.createMessageServerTransport(user, iframe.contentWindow, handler);

                // for message we tell the iframe which screen to use
                var msg = {
                    type: 'config',
                    config: screenConfig,
                    screen: screenConfig.screen
                };
                iframe.contentWindow.postMessage(JSON.stringify(msg), '*');
                break;
        }

        return transport;
    }

    function queryServer(setup, boardElem) {
        var screenConfig, client, screen;

        // setup for debug server
        window.addEventListener('message', function (e) {
            var msg = JSON.parse(e.data);
            if (!('type' in msg))
                return;

            switch (msg.type) {
                case 'config':
                    screenConfig = msg.config;
                    screen = msg.screen;
                    client = createClient(setup, screenConfig, boardElem);
                    break;

                case 'broadcastCommands':
                case 'resolveRule':
                    var proxy = (client ? client.getTransport() : null);
                    if (proxy)
                        proxy.sendMessage(msg);
                    break;
            }
        });
    }
    BoardSystem.queryServer = queryServer;
})(BoardSystem || (BoardSystem = {}));
