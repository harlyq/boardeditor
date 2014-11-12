// node server
var Game = require('./game');
var loveletter = require('./loveletter_game');
console.log(loveletter);

var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json());
app.use('/', express.static(__dirname));

var commands = [];

var config = {
    type: 'loveletter',
    screens: [{
        screen: 'common',
        mode: 'shared',
        transport: 'REST',
        users: [{
            name: 'PLAYER1',
            type: 'human'
        }, {
            name: 'PLAYER2',
            type: 'human'
        }, {
            name: 'PLAYER3',
            type: 'human'
        }, {
            name: 'PLAYER4',
            type: 'human'
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

    // var proxy = server.getProxy(user);
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

var server = new Game.createServer(loveletter, config);
server.newGameGen = loveletter.newGameGen;
server.rulesGen = loveletter.rulesGen;
server.newGame();
