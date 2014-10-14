// node server
var Game = require('./finalgame');
console.log(Game);
var mancala = require('./mancala');
console.log(mancala);

var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json());
app.use('/', express.static(__dirname));

var commands = [];

var config = {
    type: 'mancala',
    users: [{
        name: 'PLAYER1',
        type: 'human',
        proxy: 'REST',
        screen: 'board'
    }, {
        name: 'PLAYER2',
        type: 'human',
        proxy: 'REST',
        screen: 'board'
    }]
}

// app.get('/', function(req, res) {
//     res.sendFile(__dirname + '/client.html');
// });

app.get('/moves', function(req, res) {
    var user = req.param('user');
    var afterId = req.param('afterId');
    console.log('/moves?user=' + user + '&afterId=' + afterId);

    var proxy = server.getProxy(user);
    if (proxy)
        res.send(JSON.stringify(proxy.clientRequest(afterId)));
});

app.post('/new', function(req, res) {
    var user = req.param('user');
    console.log('/new?user=' + user);
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

    // send the configuration for the requested users
    var localConfig = {
        type: config.type,
        users: []
    }
    for (var i = 0; i < config.users.length; ++i) {
        var user = config.users[i];
        if (user.screen === screen)
            localConfig.users.push(user);
    }
    res.send(JSON.stringify(localConfig));
});

var host = app.listen(3000, function() {
    console.log('Listening on port ' + host.address().port);
});

var server = new Game.createServer(mancala, config);
server.newGame();
