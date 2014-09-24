/// <reference path="interact.d.ts" />
module BoardEditor {
    class Config {
        top = 10;
        left = 10;
        width = 100;
        height = 100;
    }
    var g_config: Config = new Config();

    export class Tool {

    }

    var drawCard = function(card, location, cutout) {
        var sx = parseFloat(location.style.left),
            sy = parseFloat(location.style.top),
            sw = parseFloat(location.style.width),
            sh = parseFloat(location.style.height),
            dw = card.width,
            dh = card.height,
            ctx = card.getContext('2d');

        [].forEach.call(cutout.children, function(child) {
            if (!(child instanceof HTMLImageElement))
                return;

            var cx = parseFloat(child.style.left),
                cy = parseFloat(child.style.top),
                cw = parseFloat(child.style.width),
                ch = parseFloat(child.style.height),
                nw = ( < HTMLImageElement > child).naturalWidth,
                nh = ( < HTMLImageElement > child).naturalHeight;

            // Downsize in steps (50%) to improve resize quality when cw/nw > 2
            ctx.drawImage(child, 0, 0, nw, nh, (cx - sx), (cy - sy), cw * dw / sw, ch * dh / sh);
        });
    }

    var dragMove = function(event) {
        var target = event.target,
            newLeft = parseFloat(target.style.left) + event.dx,
            newTop = parseFloat(target.style.top) + event.dy;

        target.style.left = newLeft + 'px';
        target.style.top = newTop + 'px';
    };

    var resizeMove = function(event) {
        // add the change in coords to the previous width of the target element
        var target = event.target,
            newWidth = parseFloat(target.style.width) + event.dx,
            newHeight = parseFloat(target.style.height) + event.dy;

        // update the element's style
        target.style.width = newWidth + 'px';
        target.style.height = newHeight + 'px';
    };

    export class PictureTool extends Tool {
        createPicture(src: string): HTMLElement {
            var image = < HTMLImageElement > document.createElement('img');
            image.src = src;
            image.classList.add('picture');
            image.style.position = 'absolute';
            image.style.left = g_config.left + 'px';
            image.style.top = g_config.top + 'px';
            image.style.width = image.width + 'px';
            image.style.height = image.height + 'px';

            interact(image)
                .draggable(true)
                .resizable(true)
                .on('dragmove', dragMove)
                .on('resizemove', resizeMove);

            return image;
        }
    }

    export class LocationTool extends Tool {
        createLocation(): HTMLElement {
            var location = < HTMLDivElement > document.createElement('div');
            location.classList.add('location');
            location.style.position = 'absolute';
            location.style.left = g_config.left + 'px';
            location.style.top = g_config.top + 'px';
            location.style.width = g_config.width + 'px';
            location.style.height = g_config.height + 'px';

            interact(location)
                .draggable(true)
                .resizable(true)
                .on('dragmove', dragMove)
                .on('resizemove', resizeMove);

            return location;
        }
    }

    export class CardTool extends Tool {
        createCard(location: HTMLElement, cutout: HTMLElement): HTMLElement {
            var card = < HTMLCanvasElement > document.createElement('canvas');
            var width = parseFloat(location.style.width);
            var height = parseFloat(location.style.height);
            card.classList.add('card');
            card.width = width;
            card.height = height;
            card.style.width = width + 'px';
            card.style.height = height + 'px';
            drawCard(card, location, cutout);

            return card;
        }
    }
}
