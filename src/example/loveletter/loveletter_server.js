// node server
var BoardSystem = require('./boardsystem');
var loveletter = require('./loveletter_rules');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json());
app.use('/', express.static(__dirname));

var commands = [];

var config = {
    type: 'GameConfig',
    name: 'loveletter',
    gameKey: '1',
    numPlayers: 4,
    players: {
        PLAYER1: '',
        PLAYER2: '',
        PLAYER3: '',
        PLAYER4: '',
    },
    screens: [{
        screen: 'common1',
        transport: 'REST',
        user: 'PLAYER1',
        type: 'human'
    }, {
        screen: 'common2',
        transport: 'REST',
        user: 'PLAYER2',
        type: 'human'
    }, {
        screen: 'common3',
        transport: 'REST',
        user: 'PLAYER3',
        type: 'human'
    }, {
        screen: 'common4',
        transport: 'REST',
        user: 'PLAYER4',
        type: 'human'
    }]
};

BoardSystem.addGameConfig(config);

// app.get('/', function(req, res) {
//     res.sendFile(__dirname + '/client.html');
// });

app.get('/message', function(req, res) {
    var user = req.param('user'),
        proxies = server.getProxies(user);

    for (var i = 0; i < proxies.length; ++i)
        res.send(JSON.stringify(proxies[i].onGet(req, res)));
});

app.post('/message', function(req, res) {
    var user = req.param('user'),
        proxies = server.getProxies(user);

    for (var i = 0; i < proxies.length; ++i)
        proxies[i].onPost(req, res);
});


app.post('/addUser', function(req, res) {
    var gameKey = req.param('gameKey');
    var userKey = req.param('userKey');
    var config = BoardSystem.getGameConfig(gameKey);
    if (!config) {
        res.send(JSON.stringify({
            error: 'unknown gameKey'
        }));
        return;
    }

    var foundSlot = false;
    var numPlayers = 1;
    for (var k in config.players) {
        foundSlot = config.players[k] === '' || config.players[k] === userKey;
        if (foundSlot) {
            config.players[k] = userKey;
            break;
        } else {
            ++numPlayers;
        }
    }
    if (!foundSlot) {
        res.send(JSON.stringify({
            error: 'no free places in the game'
        }));
        return;
    }

    //HACK - get the first screen for this user
    var screenConfig = BoardSystem.getScreenConfigByUser(config, k);
    if (!screenConfig) {
        console.error('config did not container user - ' + k);
        return; // something seriously wrong
    }

    var response = {
        type: 'config',
        screen: screenConfig.screen,
        config: screenConfig,
        user: k,
        userKey: userKey,
        gameKey: gameKey
    };
    res.send(JSON.stringify(response));

    console.log('added player - ' + k + ' [' + userKey + ']');
});

// app.post('/new', function(req, res) {
//     var userNames = req.param('userNames');
//     console.log('/new?userNames=' + userNames);
//     console.log(req.body);

//     // var proxy = server.getTransport(user);
//     // if (proxy)
//     //     proxy.updateCommands(req.body);
//     server.onSendCommands(req.body);

//     // TODO send a response;
// });

app.get('/config', function(req, res) {
    var screen = req.param('screen');
    var gameKey = req.param('gameKey');
    console.log('/config?gameKey=' + gameKey + 'screen=' + screen);

    var config = BoardSystem.getGameConfig(gameKey);

    var msg = {
        type: 'config',
        config: BoardSystem.getScreenConfigByScreen(config, screen),
    };
    res.send(JSON.stringify(msg));
});

var host = app.listen(3000, function() {
    console.log('Listening on port ' + host.address().port);
});

var server = new BoardSystem.createServer(loveletter, config);
server.newGameGen = loveletter.newGameGen;
server.rulesGen = loveletter.rulesGen;
server.newGame();

config.server = server;
