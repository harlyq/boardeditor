/// <reference path="board.ts" />
/// <reference path="proxy.ts" />
/// <reference path="deckcard.ts" />
/// <reference path="decklayout.ts" />
/// <reference path="gameclient.ts" />
/// <reference path="gameserver.ts" />

module Game {
    export interface UserConfig {
        name: string; // player1
        type: string; // human
        proxy: string; // message
        iframe ? : string; // iframe for message proxy
        client ? : Client;
    }

    export interface GameConfig {
        type: string; // GameConfig
        users: UserConfig[];
    }

    export function createClients(boardElem: HTMLElement, game: any, config: GameConfig) {
        for (var i = 0; i < config.users.length; ++i) {
            var user = config.users[i];
            var client: Client = null;

            switch (user.type) {
                case 'human':
                    client = new HumanClient(boardElem, user.name);
                    break;
                case 'ai':
                    client = new AIClient(); //user.name);
                    break;
            }

            if (!client)
                continue; // client type not supported

            switch (user.proxy) {
                case 'REST':
                    client.setProxy(createRESTClientProxy(user.name, game.whereList, client));
                    break;
                case 'local':
                    client.setProxy(createLocalProxy(user.name, client));
                    break;
                case 'message':
                    client.setProxy(createMessageClientProxy(user.name, game.whereList, client));
                    break;
            }

            client.setupFunc = game.setupFunc;
            client.setup();

            user.client = client;
        }
    }

    export function createServer(game: any, config: GameConfig): GameServer {
        var server = new GameServer();

        for (var i = 0; i < config.users.length; ++i) {
            var user = config.users[i];
            var iframe = < HTMLIFrameElement > (document.getElementById(user.iframe));

            switch (user.proxy) {
                case 'REST':
                    server.addProxy(Game.createRESTServerProxy(user.name, game.whereList, server));
                    break;
                case 'local':
                    server.addProxy(Game.createLocalProxy(user.name, server));
                    break;
                case 'message':
                    server.addProxy(Game.createMessageServerProxy(user.name, iframe, game.whereList, server));
                    break;
            }
        }
        var bankClient = new Game.BankClient();
        server.addProxy(Game.createLocalProxy('BANK', server));

        bankClient.setProxy(Game.createLocalProxy('BANK', bankClient));
        bankClient.setupFunc = game.setupFunc;
        bankClient.setup();

        server.setupFunc = game.setupFunc;
        server.newGameGen = game.newGameGen;
        server.rulesGen = game.rulesGen;

        server.setup();
        // server.newGame();

        return server;
    }
}
