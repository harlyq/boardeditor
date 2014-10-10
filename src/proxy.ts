/// <reference path="board.ts" />
/// <reference path="gameclient.ts" />

module Game {
    export class BaseProxy {
        lastRuleId: number = -1;

        constructor(public user: string) {}

        resolveRule(rule: BaseRule): BaseCommand[] {
            return [];
        }

            update(commands: BaseCommand[]) {}
    }

    export class LocalProxy extends BaseProxy {
        constructor(user: string, public client: Client) {
            super(user);
        }

        resolveRule(rule: BaseRule): BaseCommand[] {
            this.lastRuleId = rule.id;

            return this.client.resolveRule(rule);
        }

        update(commands: BaseCommand[]) {
            if (commands.length === 0)
                return;

            if (this.lastRuleId < commands[0].id) {
                this.client.update(commands);
                this.lastRuleId = commands[0].id;
            }
        }
    }

    export class RESTProxy extends BaseProxy {
        constructor(user: string, public whereList: any[]) {
            super(user);
        }

        resolveRule(rule: BaseRule): BaseCommand[] {
            this.lastRuleId = rule.id;

            // convert a function to an index
            if ('where' in rule)
                rule['whereIndex'] = this.whereList.indexOf(rule['where']);

            // TODO remainder of REST protocol
            return [];
        }
    }

}
