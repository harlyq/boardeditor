/// <reference path="_dependencies.ts" />
var BoardSystem;
(function (BoardSystem) {
    var configs = [];

    function addGameConfig(config) {
        configs.push(config);
    }
    BoardSystem.addGameConfig = addGameConfig;

    function getGameConfig(gameKey) {
        for (var i = 0; i < configs.length; ++i) {
            if (configs[i].gameKey === gameKey)
                return configs[i];
        }
        return null;
    }
    BoardSystem.getGameConfig = getGameConfig;
})(BoardSystem || (BoardSystem = {}));
