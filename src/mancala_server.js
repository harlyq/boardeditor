// node server
var BoardSystem = require('./boardsystem');
console.log(BoardSystem);
var mancalaSetup = require('./mancala_setup');
var mancalaGame = require('./mancala_game');
console.log(mancalaSetup);

var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json());
app.use('/', express.static(__dirname));

var commands = [];

var config = {
    type: 'mancala',
    screens: [{
        screen: 'common',
        mode: 'shared',
        proxy: 'REST',
        users: [{
            name: 'PLAYER1',
            type: 'human',
            me: 'red'
        }, {
            name: 'PLAYER2',
            type: 'human',
            me: 'blue'
        }]
    }]
};

// app.get('/', function(req, res) {
//     res.sendFile(__dirname + '/client.html');
// });

app.get('/moves', function(req, res) {
    var userNames = req.param('userNames');
    var afterId = req.param('afterId');
    console.log('/moves?userNames=' + userNames + '&afterId=' + afterId);

    var proxies = server.getProxies(userNames);
    for (var i = 0; i < proxies.length; ++i)
        res.send(JSON.stringify(proxies[i].clientRequest(afterId)));
});

app.post('/new', function(req, res) {
    var userNames = req.param('userNames');
    console.log('/new?userNames=' + userNames);
    console.log(req.body);

    // var proxy = server.getTransport(user);
    // if (proxy)
    //     proxy.updateCommands(req.body);
    server.onSendCommands(req.body);

    // TODO send a response;
});

app.get('/config', function(req, res) {
    var screen = req.param('screen');
    console.log('/config?screen=' + screen);

    res.send(JSON.stringify(config));
});

var host = app.listen(3000, function() {
    console.log('Listening on port ' + host.address().port);
});

var server = new BoardSystem.createServer(mancalaSetup, config);
server.newGameGen = mancalaGame.newGameGen;
server.rulesGen = mancalaGame.rulesGen;
server.newGame();
