/// <reference path="_dependencies.ts" />
module Game {
    export interface PluginInfo {
        createRule: (...args: any[]) => Game.BaseRule;
        performRule: (client: Game.Client, rule: Game.BaseRule, results: any[]) => boolean;
        updateBoard ? : (board: Game.Board, command: BaseCommand, results: any[]) => any;
        updateMapping ? : (board: Game.Board, mapping: Game.HTMLMapping, command: Game.BaseCommand) => void;
    };

    export var plugins: {
        [name: string]: PluginInfo;
    } = {};

    export function bindPlugin(board: Board, name: string, info: any) {
        if (!info)
            return;

        var key = Object.keys(info)[0];
        if (!key) {
            Game._error('no key specified in bindPlugin - ' + info);
            return;
        }
        info = info[key]; // PluginInfo

        console.log(name, info, key);

        plugins[key] = info;

        // bind the createRule function to the current board
        board[name] = function(...args: any[]) {
            args.splice(0, 0, this); // board as 1st argument
            return info.createRule.apply(this, args);
        }
    }
}
