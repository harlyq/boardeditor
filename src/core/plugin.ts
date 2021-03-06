/// <reference path="_dependencies.ts" />
module BoardSystem {
    export interface PluginInfo {
        createRule: (...args: any[]) => BoardSystem.BaseRule;
        performRule ? : (client: BoardSystem.BaseClient, rule: BoardSystem.BaseRule, results: any[]) => boolean;
        createResult ? : (client: BoardSystem.BaseClient, command: BoardSystem.BaseCommand) => BoardSystem.BaseResult;
        updateClient ? : (client: BoardSystem.BaseClient, command: BoardSystem.BaseCommand) => boolean;
    };

    export var plugins: {
        [name: string]: PluginInfo;
    } = {};

    export function bindPlugin(board: Board, name: string, info: any, key ? : string) {
        if (!info)
            return;

        if (typeof key === 'undefined')
            key = Object.keys(info)[0]; // get the first entry of info

        if (!key) {
            BoardSystem._error('no key specified in bindPlugin - ' + info);
            return;
        }
        info = info[key]; // PluginInfo

        console.log(name, info, key);

        plugins[key] = info;

        if (!('createRule' in info))
            BoardSystem._error('no createRule for binding - ' + key);

        // bind the createRule function to the current board
        board[name] = function(...args: any[]) {
            args.splice(0, 0, this); // board as 1st argument
            return info.createRule.apply(this, args);
        }
    }
}
