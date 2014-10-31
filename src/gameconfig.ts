/// <reference path="_dependencies.ts" />
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
}
