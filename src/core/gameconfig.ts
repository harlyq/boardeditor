/// <reference path="_dependencies.ts" />
module BoardSystem {
    export interface ScreenConfig {
        userKey: string; // the user owning this screen
        screen: string; // board for this user (html name)
        //mode: string; // shared | networked | pass-n-play
        transport: string; // message, REST, local
        //proxy: BaseTransport;
        iframe ? : string; // iframe for message transport
        user: string; // comma separated list of users that will use this screen
        type: string; // type of user using this board - human, bank, ai, passnplay
    }

    export interface GameConfig {
        type: string; // GameConfig
        server: GameServer; // pointer to the game server to use
        gameKey: string;
        name: string;
        players: {
            [user: string]: string
        }; // name for each player
        screens: ScreenConfig[];
    }

    export interface GameInstance {
        type: string; // GameInstance
        name: string;
        key: string; // unique key for this instance
        numPlayers: number; // number of players in this game (although they may not all have joined)
        userKeys: {
            [user: string]: string
        }; // authentication keys for each user
        userType: {
            [user: string]: string
        }; // human, bank, ai
    }

    var configs = [];

    export function addGameConfig(config: GameConfig) {
        configs.push(config);
    }

    export function getGameConfig(gameKey): GameConfig {
        for (var i = 0; i < configs.length; ++i) {
            if (configs[i].gameKey === gameKey)
                return configs[i];
        }
        return null;
    }
}
