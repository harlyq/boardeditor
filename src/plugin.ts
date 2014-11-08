/// <reference path="_dependencies.ts" />
module Game {
    // export interface BaseCommand {
    //     type: string;
    // }

    // export interface BaseRule {
    //     id ? : number;
    //     type ? : string;
    //     user ? : string; // maybe this should be an array
    // }

    export interface PluginInfo {
        createRule: (...args: any[]) => BaseRule;
        performRule: (client: Client, rule: BaseRule, results: Game.BatchCommand[]) => boolean;
        updateBoard: (board: Board, command: BaseCommand, results: any[]) => any;
        updateMapping ? : (board: Board, mapping: Game.HTMLMapping, command: BaseCommand) => void;
    };

    export var plugins: {
        [name: string]: PluginInfo;
    } = {};

    export function registerPlugin(name: string, info: PluginInfo) {
        plugins[name] = info;
    }

    export function getPlugin(name: string): PluginInfo {
        return plugins[name];
    }

    export function setPlugin(board: Board, name: string, pluginName: string) {
        if (!(pluginName in plugins))
            Game._error('plugin - ' + pluginName + ' - not loaded.');

        // add the create function to the current board
        board[name] = function(...args: any[]) {
            args.splice(0, 0, this); // board as 1st argument
            return plugins[pluginName].createRule.apply(this, args);
        }
    }
}
