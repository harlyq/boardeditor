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
        var server = new GameServer(),
            bankClient = null;

        for (var i = 0; i < config.screens.length; ++i) {
            var screenConfig = config.screens[i];
            if (!screenConfig)
                continue;

            var user = screenConfig.user;
            var proxy: BaseTransport = null;

            switch (screenConfig.transport) {
                case 'REST':
                    proxy = BoardSystem.createRESTServerTransport(user, server.onHandleMessage.bind(server));
                    break;

                case 'local':
                    proxy = BoardSystem.createLocalServerTransport(user, server.onHandleMessage.bind(server));
                    break;

                case 'message':
                    var iframe = < HTMLIFrameElement > (document.getElementById(screenConfig.iframe));
                    proxy = BoardSystem.createMessageServerTransport(user, iframe.contentWindow, server.onHandleMessage.bind(server));

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

            server.addTransport(proxy);

            // start all local clients
            var client = null;
            if (screenConfig.transport === 'local')
                client = createClient(game, screenConfig, null);

            if (screenConfig.user === 'BANK')
                server.setBankClient(client);
        }

        server.config = config;

        return server;
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
