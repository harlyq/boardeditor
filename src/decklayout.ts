/// <reference path="platform.js.d.ts" />
/*export*/
class DeckLayout {
    static _func: {
        [layout: string]: (index: number, count: number, options: DeckLayout.Options) => number
    } = {};
    private options: DeckLayout.Options = {};
    static transformKeyword: string = '';

    constructor(options: DeckLayout.Options) {
        var thisOptions = this.options;
        thisOptions.layout = 'left';
        thisOptions.maxspacing = 1;
        thisOptions.align = 'center';
        thisOptions.rotate = 0;
        thisOptions.offsetx = 0;
        thisOptions.offsety = 0;
        thisOptions.element = null;

        this.setOptions(options);

        if (!DeckLayout.hasDefine('fan')) {
            DeckLayout.define('fan', DeckLayout.getFan);
            DeckLayout.define('stack', DeckLayout.getStack);
            DeckLayout.define('random', DeckLayout.getRandom);
        }

        if (!DeckLayout.transformKeyword) {
            var elem = document.createElement('div');
            var transformStrings = ['transform', 'OTransform', 'webkitTransform', 'MozTransform', 'msTransform'];
            for (var j = 0; j < transformStrings.length; ++j) {
                if (transformStrings[j] in elem.style) {
                    DeckLayout.transformKeyword = transformStrings[j];
                    break;
                }
            }
            //DeckLayout.transformKeyword = 'webkitTransform';
        }
    }

    setOptions(options: DeckLayout.Options) {
        var thisOptions = this.options;

        for (var i in options)
            thisOptions[i] = options[i];
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

    forEach(fn: (card: any, i: number, left: number, top: number) => void);
    forEach(cards: any, fn: (card: any, i: number, left: number, top: number) => void);
    forEach(cardsOrFn: any, fn ? : (card: any, left: number, top: number) => void) {
        var options = this.options;
        var cards = cardsOrFn;
        if (typeof cardsOrFn === 'function') {
            fn = cardsOrFn;
            cards = options.element.children;
        }
        if (typeof fn === 'undefined')
            return; // nothing to do

        var element = options.element;
        if (element) {
            options.width = element.offsetWidth;
            options.height = element.offsetHeight;
            options.left = element.offsetLeft;
            options.top = element.offsetTop;
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
        element ? : HTMLElement;
        top ? : number;
        left ? : number;
        width ? : number;
        height ? : number;
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

var DeckLayoutPrototype = Object.create(HTMLElement.prototype);

DeckLayoutPrototype.createdCallback = function() {
    this.options = {
        element: this
    };

    var self = this;
    [].forEach.call(this.attributes, function(attr) {
        self.options[attr.name] = attr.value;
    });
};

DeckLayoutPrototype.attachedCallback = function() {
    this.DeckLayout = new DeckLayout(this.options);
    this.DeckLayout.forEach(DeckLayout.position);
};

DeckLayoutPrototype.detachedCallback = function() {
    this.DeckLayout = null;
}

DeckLayoutPrototype.attributeChangedCallback = function(attrName: string, oldVal, newVal) {
    this.options[attrName] = newVal;

    if (this.DeckLayout) {
        this.DeckLayout.setOptions(this.options);
        this.DeckLayout.forEach(DeckLayout.position);
    }
}

DeckLayoutPrototype.forEach = function(cardsOrFn: any, fn ? : (card: any, i: number, left: number, top: number) => void) {
    if (this.DeckLayout)
        this.DeckLayout.forEach(cardsOrFn, fn);
}

DeckLayoutPrototype.getIndex = function(x: number, y: number, count: number, cardWidth: number, cardHeight: number): number {
    if (this.DeckLayout)
        return this.DeckLayout.getIndex(x, y, count, cardWidth, cardHeight);
    return -1;
}

DeckLayoutPrototype.appendChild = function(newElement: Node) {
    HTMLElement.prototype.appendChild.call(this, newElement);
    if (this.DeckLayout)
        this.DeckLayout.forEach(DeckLayout.position);
}

DeckLayoutPrototype.removeChild = function(oldElement: Node) {
    HTMLElement.prototype.removeChild.call(this, oldElement);
    if (this.DeckLayout)
        this.DeckLayout.forEach(DeckLayout.position);
}

DeckLayoutPrototype.insertBefore = function(newElement: Node, referenceElement: Node) {
    HTMLElement.prototype.insertBefore.call(this, newElement, referenceElement);
    if (this.DeckLayout)
        this.DeckLayout.forEach(DeckLayout.position);
}

DeckLayoutPrototype.replaceChild = function(newElement: Node, oldElement: Node) {
    HTMLElement.prototype.replaceChild.call(this, newElement, oldElement);
    if (this.DeckLayout)
        this.DeckLayout.forEach(DeckLayout.position);
}

if ('registerElement' in document) {
    document.registerElement('deck-layout', {
        prototype: DeckLayoutPrototype
    });
}
