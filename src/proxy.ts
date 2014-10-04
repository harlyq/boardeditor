/// <reference path="game.ts" />
/// <reference path="rule2.ts" />
/// <reference path="command.ts" />
/// <reference path="gameclient.ts" />

class ProxyManager {
    proxies: GameProxy[] = [];

    addProxy(proxy: GameProxy) {
        this.proxies.push(proxy);
    }

    removeProxy(proxy: GameProxy) {
        var i = this.proxies.indexOf(proxy);
        if (i !== -1)
            this.proxies.splice(i, 1);
    }

    getProxy(user: string): GameProxy {
        for (var i = 0; i < this.proxies.length; ++i) {
            if (this.proxies[i].user === user)
                return this.proxies[i];
        }
        return null;
    }
}

class GameProxy {
    constructor(public user: string) {}

    askUser(rule: BaseRule): BaseCommand[] {
        return [];
    }
}

class LocalProxy extends GameProxy {
    constructor(user: string, public client: GameClient) {
        super(user);
    }

    askUser(rule: BaseRule): BaseCommand[] {
        return this.client.askUser(rule);
    }
}

class RESTProxy extends GameProxy {
    constructor(user: string) {
        super(user);
    }
}
