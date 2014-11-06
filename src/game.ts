/// <reference path="_dependencies.ts" />
declare
var exports: any;

if (typeof exports !== 'undefined') {
    exports.GameServer = Game.GameServer;
    exports.createServer = Game.createServer;
}

declare
var require: any;

// require() may be present in the setup files for a game, to bring in game modules, but for the non-server
// versions they will be loaded via script tags, so require becomes a no-op.
if (typeof require === 'undefined') {
    require = function(module: string) {};
}
