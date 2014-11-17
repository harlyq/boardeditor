/// <reference path="_dependencies.ts" />
module Game {
    export interface ScreenConfig {
        screen: string; // board for this user
        //mode: string; // shared | networked | pass-n-play
        transport: string; // message, REST, local
        //proxy: BaseClientProxy;
        iframe ? : string; // iframe for message proxy
        user: string;
        type: string; // human, bank, ai, passnplay
    }

    export interface GameConfig {
        type: string; // GameConfig
        screens: ScreenConfig[];
    }
}
