/// <reference path="_dependencies.ts" />

module BoardSystem {
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

    export function createClient(game: any, screenConfig: ScreenConfig, boardElem: HTMLElement): BaseClient {
        var board = new Board(),
            user = screenConfig.user,
            client = null,
            proxy = null;

        game.setupFunc(board);

        switch (screenConfig.type) {
            case 'human':
                client = new HTMLClient(user, board, boardElem);
                break;

            case 'ai':
                client = new AIClient(user, board);
                break;

            case 'bank':
                client = new BankClient(user, board);
                break;
        }
        if (!client)
            return null; // unable to create client

        switch (screenConfig.transport) {
            case 'REST':
                proxy = createRESTClientTransport(user, client.onHandleMessage.bind(client));
                break;

            case 'local':
                proxy = createLocalClientTransport(user, client.onHandleMessage.bind(client));
                break;

            case 'message':
                proxy = createMessageClientTransport(user, window.parent, client.onHandleMessage.bind(client));
                break;
        }
        client.setTransport(proxy);

        return client;
    }

    export function createServer(game: any, config: GameConfig): GameServer {
        var server = new GameServer();

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
        var bankConfig: ScreenConfig = {
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

    function createTransport(screenConfig: ScreenConfig, handler: (msg: any) => void): BaseTransport {
        var transport: BaseTransport = null,
            user = screenConfig.user;

        switch (screenConfig.transport) {
            case 'REST':
                transport = BoardSystem.createRESTServerTransport(user, handler);
                break;

            case 'local':
                transport = BoardSystem.createLocalServerTransport(user, handler);
                break;

            case 'message':
                var iframe = < HTMLIFrameElement > (document.getElementById(screenConfig.iframe));
                transport = BoardSystem.createMessageServerTransport(user, iframe.contentWindow, handler);

                // for message we tell the iframe which screen to use
                var msg = {
                    type: 'config',
                    config: screenConfig,
                    screen: screenConfig.screen
                }
                iframe.contentWindow.postMessage(JSON.stringify(msg), '*');
                break;
        }

        return transport;
    }

    export function queryServer(setup: any, boardElem: HTMLElement) {
        var screenConfig: ScreenConfig,
            client: BaseClient,
            screen: string;

        // setup for debug server
        window.addEventListener('message', function(e) {
            var msg = JSON.parse(e.data);
            if (!('type' in msg))
                return; // unknown message

            switch (msg.type) {
                case 'config':
                    screenConfig = msg.config;
                    screen = msg.screen;
                    client = createClient(setup, screenConfig, boardElem);
                    break;

                case 'broadcastCommands':
                case 'resolveRule':
                    var proxy = < MessageTransport > (client ? client.getTransport() : null);
                    if (proxy)
                        proxy.sendMessage(msg);
                    break;
            }
        });
    }
}
