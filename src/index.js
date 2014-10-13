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

var host = app.listen(3000, function() {
    console.log('Listening on port ' + host.address().port);
});

console.log(Game.BankClient);

var bankClient = new Game.BankClient();
bankClient.setProxy(Game.createLocalProxy('BANK', bankClient));
bankClient.setupFunc = mancala.setupFunc;
bankClient.setup();

var server = new Game.GameServer();
server.setupFunc = mancala.setupFunc;
server.newGameGen = mancala.newGameGen;
server.rulesGen = mancala.rulesGen;
server.addProxy(Game.createLocalProxy('BANK', server));
server.addProxy(Game.createRESTClientProxy('PLAYER1', mancala.whereList, server));
server.addProxy(Game.createRESTClientProxy('PLAYER2', mancala.whereList, server));
server.setup();
server.newGame();
