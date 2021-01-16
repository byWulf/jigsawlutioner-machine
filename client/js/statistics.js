class Statistics {
    constructor(socket) {
        this.socket = socket;

        this.setCount(0);
    }

    addEventListeners() {
        this.socket.on('piecesScannedChanged', (count) => {
            this.setCount(count);
        });

        this.socket.on('timingStatistics', (statistics) => {
            this.addStatistics(statistics);
        })

        this.socket.on('pieceScanned', (piece) => {
            console.log('pieceScanned', piece);

            if (typeof piece.sides === 'undefined' || !(piece.sides instanceof Array) || piece.sides.length !== 4) return;
            if (typeof piece.files === 'undefined' || typeof piece.files.transparent === 'undefined') return;
            if (typeof piece.images === 'undefined' || typeof piece.images.transparent === 'undefined') return;

            let $rotationImageContainer = $('<div class="piece imageContainer"></div>');

            let xKey = typeof piece.sides[0].startPoint.x !== 'undefined' ? 'x' : 1;
            let yKey = typeof piece.sides[0].startPoint.y !== 'undefined' ? 'y' : 2;

            let minX = Math.min(piece.sides[0].startPoint[xKey], piece.sides[1].startPoint[xKey], piece.sides[2].startPoint[xKey], piece.sides[3].startPoint[xKey]);
            let maxX = Math.max(piece.sides[0].startPoint[xKey], piece.sides[1].startPoint[xKey], piece.sides[2].startPoint[xKey], piece.sides[3].startPoint[xKey]);
            let minY = Math.min(piece.sides[0].startPoint[yKey], piece.sides[1].startPoint[yKey], piece.sides[2].startPoint[yKey], piece.sides[3].startPoint[yKey]);
            let maxY = Math.max(piece.sides[0].startPoint[yKey], piece.sides[1].startPoint[yKey], piece.sides[2].startPoint[yKey], piece.sides[3].startPoint[yKey]);


            let centerX = (piece.boundingBox.left + (minX + (maxX - minX) / 2)) * piece.images.transparent.resizeFactor;
            let centerY = (piece.boundingBox.top + (minY + (maxY - minY) / 2)) * piece.images.transparent.resizeFactor;

            let $img = $('<img src="" alt="">');
            $img.attr('src', '/projects/' + services.projectManager.currentProject + '/images/' + piece.files.transparent);
            $img.css({
                left: -centerX,
                top: -centerY
            });

            $rotationImageContainer.append($img);

            $rotationImageContainer.appendTo('.fancyPiecePreview');

            $rotationImageContainer.animate({
                left: '-100px'
            }, 5000, 'linear', () => {
                $rotationImageContainer.remove();
            });
        });
    }

    setCount(count) {
        $('#statisticsPiecesScanned').text(count);
    }

    addStatistics(statistics) {
        const elem = $('<div class="row"><div class="col-8 name"></div><div class="col-4 time"></div></div>');
        elem.find('.name').text(statistics.name);
        elem.find('.time').text(statistics.time + 'ms');

        elem.prependTo('.timingStatisticsContainer');
    }
}
