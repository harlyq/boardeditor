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
        createPlugin: (client: Client) => BasePlugin;
        performCommand: (board: Board, command: BaseCommand) => any;
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

    export class BasePlugin {

        // returns true if the rule is accepted by this plugin and all valid
        // BatchCommands are placed into the results list
        performRule(rule: BaseRule, results: BatchCommand[]): boolean {
            return false;
        }

        // returns any valid result if this command is recognized by the 
        // plugin, or undefined if the command is not recognized.
        performCommand(command: BaseCommand): any {
            return undefined;
        }

        createCommand(type: string): BaseCommand {
            return {
                type: type
            };
        }

        isCountComplete(quantity: Quantity, count: number, value: number): boolean {
            switch (quantity) {
                case Quantity.All:
                    return false; // all must be accounted for elsewhere
                case Quantity.Exactly:
                    return value === count;
                case Quantity.AtMost:
                    return value <= count;
                case Quantity.AtLeast:
                    return value >= count;
                case Quantity.MoreThan:
                    return value > count;
                case Quantity.LessThan:
                    return value < count;
            }
            return false;
        }
    }
}
