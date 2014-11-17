/// <reference path="_dependencies.ts" />

declare
var require: any;
declare
var browserRequire: any;

// require() may be present in the setup files for a game, to bring in game modules, but for the non-server
// versions they will be loaded via script tags, so require becomes a no-op.
if (typeof require === 'undefined') {
    var browserModules = {};
    var nameEx = /(\w*)(?:\.js)?$/;

    browserRequire = function(): any {
        var allScripts = document.getElementsByTagName('script'),
            src = allScripts[allScripts.length - 1].src,
            coreName = nameEx.exec(src)[1];

        // when putting multiple plugins into the same file, browserRequire() will be called multiple times
        if (!(coreName in browserModules))
            browserModules[coreName] = {};

        return browserModules[coreName];
    }

    require = function(filename: string): any {
        var coreName = nameEx.exec(filename)[1];
        if (!(coreName in browserModules)) {
            console.log('require(' + filename + ') - not found');
            return null;
        }

        return browserModules[coreName];
    };
}

if (typeof browserRequire === 'function')
    exports = browserRequire();

declare
var exports: any;

if (typeof exports !== 'undefined') {
    for (var k in Game)
        exports[k] = Game[k];
}
