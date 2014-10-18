/// <reference path="board.ts" />
/// <reference path="proxy.ts" />
/// <reference path="platform.js.d.ts" />
/// <reference path="deckcard.ts" />
/// <reference path="decklayout.ts" />
/// <reference path="gameclient.ts" />
/// <reference path="gameserver.ts" />

module Game {
    export interface UserConfig {
        name: string; // player1 (name of this user)
        type: string; // human
        client ? : Client;
        me ? : string; // local alias for this user
    }

    export interface ScreenConfig {
        screen ? : string; // board for this user
        mode: string; // shared | networked | pass-n-play
        proxy: string; // message
        iframe ? : string; // iframe for message proxy
        users: UserConfig[];
    }

    export interface GameConfig {
        type: string; // GameConfig
        screens: ScreenConfig[];
    }

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

    export function createClients(screen: string, boardElem: HTMLElement, game: any, config: GameConfig): GameConfig {
        var screenConfig = getScreenConfig(config, screen);
        if (!screenConfig)
            return null;

        var userNames = getUserNames(screenConfig);
        var users = screenConfig.users;
        var numPlayers = users.length;
        var proxy: BaseClientProxy = null;

        switch (screenConfig.proxy) {
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

        for (var i = 0; i < numPlayers; ++i) {
            var user = users[i];
            var client: Client = null;

            switch (user.type) {
                case 'human':
                    client = new HumanClient(user.name, proxy, proxy.board, boardElem);
                    break;
                case 'ai':
                    client = new AIClient(user.name, proxy, proxy.board);
                    break;
                case 'none':
                    break;
            }

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

            client.setupFunc = game.setupFunc;
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

            switch (screenConfig.proxy) {
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
        bankClient.setupFunc = game.setupFunc;
        bankClient.setup();

        server.setupFunc = game.setupFunc;
        server.newGameGen = game.newGameGen;
        server.rulesGen = game.rulesGen;

        server.setup();
        // server.newGame();

        return server;
    }

    export function getClientProxy(config: GameConfig, screen: string, userNames: string): BaseClientProxy {
        var screenConfig = getScreenConfig(config, screen);
        if (!screenConfig)
            return null;

        if (userNames !== getUserNames(screenConfig))
            return null;

        for (var i = 0; i < screenConfig.users.length; ++i) {
            var user = screenConfig.users[i];
            if (user.client)
                return user.client.getProxy();
        }
        return null;
    }
}
