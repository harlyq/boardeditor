/// <reference path="board.ts" />
/// <reference path="gameclient.ts" />

module Game {
    export class BaseProxy {
        constructor(public user: string) {}

        resolveRule(rule: BaseRule): BaseCommand[] {
            return [];
        }
    }

    export class LocalProxy extends BaseProxy {
        constructor(user: string, public client: Client) {
            super(user);
        }

        resolveRule(rule: BaseRule): BaseCommand[] {
            return this.client.resolveRule(rule);
        }
    }

    export class RESTProxy extends BaseProxy {
        constructor(user: string) {
            super(user);
        }
    }

}
