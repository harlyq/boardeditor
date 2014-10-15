/// <reference path="_dependencies.ts" />
/*export*/
class DeckLayout {
    static _func: {
        [layout: string]: (index: number, count: number, options: DeckLayout.Options) => number
    } = {};
    private options: DeckLayout.Options = {};
    private flipCardHandler = null;

    static transformKeyword: string = '';

    constructor(public parent: HTMLElement, options: DeckLayout.Options) {
        var thisOptions = this.options;
        thisOptions.layout = 'stack';
        thisOptions.maxspacing = 1;
        thisOptions.align = 'center';
        thisOptions.rotate = 0;
        thisOptions.offsetx = 0;
        thisOptions.offsety = 0;
        thisOptions.visibility = 'any';
        thisOptions.showcount = false;

        this.flipCardHandler = this.flipCard.bind(this);

        this.setOptions(options);

        if (!DeckLayout.hasDefine('fan')) {
            DeckLayout.define('fan', DeckLayout.getFan);
            DeckLayout.define('stack', DeckLayout.getStack);
            DeckLayout.define('random', DeckLayout.getRandom);
        }

        if (!DeckLayout.transformKeyword) {
            var transformStrings = ['transform', 'OTransform', 'webkitTransform', 'MozTransform', 'msTransform'];
            for (var j = 0; j < transformStrings.length; ++j) {
                if (transformStrings[j] in parent.style) {
                    DeckLayout.transformKeyword = transformStrings[j];
                    break;
                }
            }
        }
    }

    setOptions(options: DeckLayout.Options) {
        var thisOptions = this.options;

        for (var i in options) {
            if (!(i in thisOptions)) {
                if (['style', 'name', 'id', 'class'].indexOf(i) === -1)
                    console.log('unknown option - ' + i);
                continue;
            }

            var value = options[i];
            switch (typeof thisOptions[i]) {
                case 'number':
                    value = parseFloat(options[i]);
                    break;
                case 'boolean':
                    value = options[i] ? true : false;
                    break;
            }
            thisOptions[i] = value;
        }


        this.parent.removeEventListener('click', this.flipCardHandler);
        if (options.visibility === 'flip')
            this.parent.addEventListener('click', this.flipCardHandler);
    }

    // fn returns a number in the range 0 (left-most) to 1 (right-most)
    static define(layout: string,
        fn: (index: number, count: number, options: DeckLayout.Options) => number) {
        DeckLayout._func[layout] = fn;
    }

    static hasDefine(layout: string): boolean {
        return (DeckLayout._func[layout] ? true : false)
    }

    static position(card: HTMLElement, i: number, left: number, top: number) {
        card.style.position = 'absolute';
        card.style.left = left + 'px';
        card.style.top = top + 'px';
    }

    static translate(card: HTMLElement, i: number, left: number, top: number) {
        card.style.position = 'absolute';
        card.style[DeckLayout.transformKeyword] = 'translate(' + left + 'px,' + top + 'px)';
    }

    flipCard(e) {
        var card = < HTMLElement > (event.target);
        card.setAttribute('facedown', (card.getAttribute('facedown') === 'true' ? 'false' : 'true'));
    }

    getDeckCards(list: any): any[] {
        var cards = [];
        for (var i = 0; i < list.length; ++i) {
            //if (list[i] instanceof DeckCardElement) not working
            if (list[i].localName === 'deck-card')
                cards.push(list[i]);
        }
        return cards;
    }

    applyOptions(cards ? : any) {
        var options = this.options;
        var parent = this.parent;
        if (typeof cards === 'undefined')
            cards = this.getDeckCards(parent.children);

        [].forEach.call(cards, function(card) {
            switch (options.visibility) {
                case 'faceup':
                    card.setAttribute('facedown', 'false');
                    break;
                case 'facedown':
                    card.setAttribute('facedown', 'true');
                    break;
            }
        });

        var showCount = false;
        if ('showcount' in options) {
            showCount = options.showcount;
        }

        var countElem = < HTMLElement > (parent.querySelector('.count'));
        if (countElem && !showCount) {
            countElem.classList.add('hidden');
        } else if (!countElem && showCount) {
            countElem = document.createElement('div');
            countElem.classList.add('count');
            parent.appendChild(countElem);
        } else if (countElem && showCount) {
            countElem.classList.remove('hidden');
        }
        if (showCount)
            countElem.innerText = cards.length; // should be linked to the location model data
    }

    forEach(fn: (card: any, i: number, left: number, top: number) => void);
    forEach(cards: any, fn: (card: any, i: number, left: number, top: number) => void);
    forEach(cardsOrFn: any, fn ? : (card: any, left: number, top: number) => void) {
        var options = this.options;
        var cards = cardsOrFn;
        if (typeof cardsOrFn === 'function') {
            fn = cardsOrFn;
            cards = this.getDeckCards(this.parent.children);
        }
        if (typeof fn === 'undefined')
            return; // nothing to do

        if (typeof DeckLayout._func[options.layout] === 'undefined')
            return; // unknown layout

        var parent = this.parent;
        if (parent) {
            options.width = parent.offsetWidth;
            options.height = parent.offsetHeight;
            options.left = parent.offsetLeft;
            options.top = parent.offsetTop;
        }

        var numCards = cards.length;
        for (var i = 0; i < numCards; ++i) {
            var card = cards[i];
            var left = this.getLeft(i, numCards, card.offsetWidth); // - options.left;
            var top = this.getTop(i, numCards, card.offsetHeight); // - options.top;

            fn.call(this, card, i, left, top);
        }
    }

    getIndex(x: number, y: number, count: number, cardWidth: number, cardHeight: number): number {
        var indexLeft = -1,
            diffLeft = 1e10,
            indexTop = -1,
            diffTop = 1e10,
            deltaTop = 0,
            deltaLeft = 0,
            lastTop = 0,
            lastLeft = 0;

        for (var i = 0; i < count; ++i) {
            var left = this.getLeft(i, count, cardWidth);
            var top = this.getTop(i, count, cardHeight);
            deltaTop = Math.abs(top - lastTop);
            deltaLeft = Math.abs(left - lastLeft);
            lastTop = top;
            lastLeft = left;

            top = y - top;
            left = x - left;

            if (left > 0 && left < diffLeft) {
                diffLeft = left;
                indexLeft = i;
            }
            if (top > 0 && top < diffTop) {
                diffTop = top;
                indexTop = i;
            }
        }

        if (deltaTop > deltaLeft)
            return indexTop;
        else
            return indexLeft;
    }

    getLeft(index: number, count: number, cardwidth: number) {
        var options = this.options;
        return (this.getX(index, count) + 1) * (options.width - cardwidth) / 2 + index * options.offsetx;
    }

    getTop(index: number, count: number, cardheight: number) {
        var options = this.options;
        return (this.getY(index, count) + 1) * (options.height - cardheight) / 2 + index * options.offsety;
    }

    getX(index: number, count: number): number {
        var options = this.options;
        var rad = options.rotate / 180 * Math.PI;
        var r = DeckLayout._func[options.layout](index, count, options);
        return r * Math.cos(rad);
    }

    getY(index: number, count: number): number {
        var options = this.options;
        var rad = options.rotate / 180 * Math.PI;
        var r = DeckLayout._func[options.layout](index, count, options);
        return r * Math.sin(rad);
    }

    static getStack(index, count, options): number {
        switch (options.align) {
            case 'left':
                return -1;
                break;
            case 'center':
                return 0;
                break;
            case 'right':
                return 1;
                break;
        }
    }

    static getFan(index, count, options): number {
        var delta = Math.min(options.maxspacing, (count > 1 ? 2 / (count - 1) : 0));

        switch (options.align) {
            case 'left':
                return index * delta;
                break;
            case 'center':
                return (index - (count - 1) / 2) * delta;
                break;
            case 'right':
                return 1 - (count - 1 - index) * delta;
                break;
        }
    }

    static getRandom(index, count, options): number {
        return (Math.random() - 0.5) * 2;
    }
}

/*export*/
module DeckLayout {
    // all lowercase as these can be set directly as options
    export interface Options {
        layout ? : string; // stack, fan, random
        maxspacing ? : number; // (0,1) used by fan
        align ? : string; // left, center, right
        rotate ? : number;
        offsetx ? : number;
        offsety ? : number;
        top ? : number;
        left ? : number;
        width ? : number;
        height ? : number;
        visibility ? : string; // any, faceup, facedown
        showcount ? : boolean;
    }

    interface TopLeft {
        top: number;
        left: number;
    }

    interface XY {
        x: number;
        y: number;
    }
}

var DeckLayoutElement = null;

if (typeof window !== 'undefined') {
    var DeckLayoutPrototype = Object.create(HTMLElement.prototype);

    DeckLayoutPrototype.optionsList = ['layout', 'visibility', 'rotate', 'offsetx', 'offsety', 'align'];

    DeckLayoutPrototype.createdCallback = function() {
        var self = this;
        this.options = {};

        [].forEach.call(this.attributes, function(attr) {
            self.options[attr.name] = attr.value;
        });

        this.DeckLayout = new DeckLayout(this, this.options);

        this.observer = new MutationObserver(function(mutations) {
            self.DeckLayout.forEach(DeckLayout.position);
            self.DeckLayout.applyOptions();
        });
    };

    DeckLayoutPrototype.attachedCallback = function() {
        this.update();
        this.observer.observe(this, {
            childList: true
        });
    };

    DeckLayoutPrototype.detachedCallback = function() {
        this.observer.disconnect();
    }

    DeckLayoutPrototype.attributeChangedCallback = function(attrName: string, oldVal, newVal) {
        if (DeckLayoutPrototype.optionsList.indexOf(attrName) !== -1) {
            this.options[attrName] = newVal;

            this.DeckLayout.setOptions(this.options);
            this.DeckLayout.applyOptions();
        }
    }

    DeckLayoutPrototype.forEach = function(cardsOrFn: any, fn ? : (card: any, i: number, left: number, top: number) => void) {
        this.DeckLayout.forEach(cardsOrFn, fn);
    }

    DeckLayoutPrototype.getIndex = function(x: number, y: number, count: number, cardWidth: number, cardHeight: number): number {
        return this.DeckLayout.getIndex(x, y, count, cardWidth, cardHeight);
    }

    DeckLayoutPrototype.update = function() {
        this.DeckLayout.forEach(DeckLayout.position);
        this.DeckLayout.applyOptions();
    }

    if ('registerElement' in document) {
        DeckLayoutElement = document.registerElement('deck-layout', {
            prototype: DeckLayoutPrototype
        });
    }
}
