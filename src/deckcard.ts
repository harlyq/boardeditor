/// <reference path="platform.js.d.ts" />
class DeckCard {
    // HTML properties
    front: string = '';
    back: string = '';
    facedown: string = '';

    shadowRoot: HTMLElement;

    constructor(public parent: HTMLElement) {
        window.addEventListener('load', this.update.bind(this)); // does not scale well

        this.shadowRoot = this.parent.createShadowRoot();

        var canvasElem = document.createElement('canvas');
        canvasElem.classList.add('DeckCardCanvas');
        this.shadowRoot.appendChild(canvasElem);
    }

    update() {
        var canvasElem = < HTMLCanvasElement > (this.shadowRoot.querySelector(".DeckCardCanvas"));
        if (!canvasElem)
            return;

        canvasElem.width = this.parent.offsetWidth;
        canvasElem.height = this.parent.offsetHeight;

        if (this.facedown === 'true') {
            var backElem = < HTMLElement > (document.querySelector('#' + this.back));
            this.drawCard(canvasElem, backElem);
        } else {
            var frontElem = < HTMLElement > (document.querySelector('#' + this.front));
            this.drawCard(canvasElem, frontElem);
        }
    }

    drawCard(cardCanvas: HTMLCanvasElement, cutout: HTMLElement) {
        if (!cardCanvas || !cutout)
            return;

        var sx = parseFloat(cutout.style.left),
            sy = parseFloat(cutout.style.top),
            sw = parseFloat(cutout.style.width),
            sh = parseFloat(cutout.style.height),
            dw = cardCanvas.width,
            dh = cardCanvas.height,
            ctx = cardCanvas.getContext('2d'),
            cutoutParent = < HTMLElement > (cutout.parentNode);

        ctx.fillStyle = cutoutParent.style.backgroundColor || 'white';
        ctx.fillRect(0, 0, dw, dh);

        [].forEach.call(cutoutParent.children, function(child) {
            if (!(child instanceof HTMLImageElement))
                return;

            var cx = parseFloat(child.style.left),
                cy = parseFloat(child.style.top),
                cw = parseFloat(child.style.width),
                ch = parseFloat(child.style.height),
                nw = ( < HTMLImageElement > child).naturalWidth,
                nh = ( < HTMLImageElement > child).naturalHeight;

            // TODO Downsize in steps (50%) to improve resize quality when cw/nw > 2
            ctx.drawImage(child, 0, 0, nw, nh, (cx - sx), (cy - sy), cw * dw / sw, ch * dh / sh);
        });
    }
}

var DeckCardPrototype = Object.create(HTMLElement.prototype);

DeckCardPrototype.createdCallback = function() {
    var deckCard = new DeckCard(this);
    this.deckCard = deckCard;

    [].forEach.call(this.attributes, function(attr) {
        deckCard[attr.name] = attr.value;
    });
}

DeckCardPrototype.attributeChangedCallback = function(attrName: string, oldVal: string, newVal: string) {
    this.deckCard[attrName] = newVal;

    if (attrName === 'facedown')
        this.deckCard.update();
}

if ('registerElement' in document) {
    document.registerElement('deck-card', {
        prototype: DeckCardPrototype
    });
}
