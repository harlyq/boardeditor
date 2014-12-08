/// <reference path='boardsystem.d.ts' />
declare module PluginHelper {
    export function nextCombination(list: any[], possible: any[]): boolean;
    export function nextFactorial(list: any[], possible: any[], max ? : number): boolean;
    export function nextGrayCode(list: number[], max): boolean;
    export function isCountComplete(quantity: BoardSystem.Quantity, count: number, value: number): boolean;
}
