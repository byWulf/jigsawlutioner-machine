class Solver {
    constructor(socket) {
        this.socket = socket;
    }

    addEventListeners() {
        this.socket.on('calculatingPlacements', () => {
            console.log('calculatingPlacements');

            $('#replacementsFinishedButton').addClass('disabled');
            $('#recalculatePlacementsButton').addClass('disabled');
            $('#placementsContainer').text('Calculating placements...');

            $('#placementModal').modal('show');
        });

        this.socket.on('placements', (placementData) => {
            console.log('placements', placementData);

            $('#replacementsFinishedButton').removeClass('disabled');
            $('#recalculatePlacementsButton').removeClass('disabled');

            let modal = $('#placementModal');
            modal.modal('show');

            this.placements = placementData.placements;
            this.ignoreMatches = placementData.ignoreMatches;

            this.createPlacementsImage(placementData.placements, modal.find('#placementsContainer'));
        });

        this.socket.on('placementsFinished', () => {
            $('#placementModal').modal('hide');
        });

        $('#placementModal').find('#placementsContainer').on('click', '.piece .side', (e) => {
            $(e.target).toggleClass('selected');

            let oppositeSide = this.findOppositeSideElement($(e.target));
            if (oppositeSide) {
                oppositeSide.toggleClass('selected', $(e.target).hasClass('selected'));

                $('#replacementsFinishedButton').addClass('disabled');
            }
        }).on('mouseenter', '.piece .side', (e) => {
            let oppositeSide = this.findOppositeSideElement($(e.target));
            if (oppositeSide) {
                oppositeSide.addClass('hover');
            }
        }).on('mouseout', '.piece .side', (e) => {
            let oppositeSide = this.findOppositeSideElement($(e.target));
            if (oppositeSide) {
                oppositeSide.removeClass('hover');
            }
        });

        $('#recalculatePlacementsButton').on('click', () => {
            if ($('#recalculatePlacementsButton').hasClass('disabled')) {
                return;
            }

            let ignoreMatches = this.ignoreMatches;

            $('#placementModal').find('#placementsContainer').find('.piece .side.selected').each((i, elem) => {
                let oppositeSide = this.findOppositeSideElement($(elem));
                if (oppositeSide) {
                    ignoreMatches.push({
                        source: {pieceIndex: parseInt($(elem).attr('data-pieceIndex'), 10), sideIndex: parseInt($(elem).attr('data-sideIndex'), 10)},
                        target: {pieceIndex: parseInt(oppositeSide.attr('data-pieceIndex'), 10), sideIndex: parseInt(oppositeSide.attr('data-sideIndex'), 10)},
                    })
                }
            });

            this.socket.emit('recalculatePlacements', ignoreMatches);
        });

        $('#replacementsFinishedButton').on('click', () => {
            if ($('#replacementsFinishedButton').hasClass('disabled')) {
                return;
            }

            this.socket.emit('placementsCorrect');
        });
    }

    findOppositeSideElement($elem) {
        let piece = this.placements[$elem.attr('data-groupIndex')][$elem.attr('data-x')][$elem.attr('data-y')];

        let absoluteSide = (parseInt($elem.attr('data-sideIndex'), 10) + piece.rotation + 4) % 4;

        let opposideMapping = {
            0: {side: 2, x: 0, y: -1},
            1: {side: 3, x: -1, y: 0},
            2: {side: 0, x: 0, y: 1},
            3: {side: 1, x: 1, y: 0},
        };

        let groupIndex = $elem.attr('data-groupIndex');
        let oppositeX = parseInt($elem.attr('data-x'), 10) + opposideMapping[absoluteSide].x;
        let oppositeY = parseInt($elem.attr('data-y'), 10) + opposideMapping[absoluteSide].y;

        if (typeof this.placements[groupIndex][oppositeX] !== 'undefined' && typeof this.placements[groupIndex][oppositeX][oppositeY] !== 'undefined') {
            let oppositePiece = this.placements[groupIndex][oppositeX][oppositeY];

            let oppositeSide = (opposideMapping[absoluteSide].side - oppositePiece.rotation + 4) % 4;

            return $('#placementModal').find('#placementsContainer').find('.side[data-groupIndex="' + groupIndex + '"][data-x="' + oppositeX + '"][data-y="' + oppositeY + '"][data-sideIndex="' + oppositeSide + '"]');
        }

        return null;
    }

    createPlacementsImage(placements, container) {
        container.empty();

        for (let g = 0; g < placements.length; g++) {
            let groupPlacements = placements[g];

            let $groupContainer = $('<div class="groupContainer"></div>');

            let first = true;

            for (let x in groupPlacements) {
                if (!groupPlacements.hasOwnProperty(x)) continue;

                for (let y in groupPlacements[x]) {
                    if (!groupPlacements[x].hasOwnProperty(y)) continue;

                    if (!first) continue;
                    //first = false;

                    let piece = groupPlacements[x][y];
                    if (typeof piece.sides === 'undefined' || !(piece.sides instanceof Array) || piece.sides.length !== 4) continue;
                    if (typeof piece.files === 'undefined' || typeof piece.files.transparent === 'undefined') continue;
                    if (typeof piece.images === 'undefined' || typeof piece.images.transparent === 'undefined') continue;

                    let $rotationImageContainer = $('<div class="piece imageContainer"></div>');
                    $rotationImageContainer.css({
                        left: piece.correctPosition.x * piece.images.transparent.resizeFactor,
                        top: piece.correctPosition.y * piece.images.transparent.resizeFactor,
                        transform: 'rotate(' + piece.correctPosition.rotation + 'deg)'
                    });

                    let $rotationButtonContainer = $('<div class="piece buttonContainer"></div>');
                    $rotationButtonContainer.css({
                        left: piece.correctPosition.x * piece.images.transparent.resizeFactor,
                        top: piece.correctPosition.y * piece.images.transparent.resizeFactor,
                        transform: 'rotate(' + piece.correctPosition.rotation + 'deg)'
                    });

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

                    for (let i = 0; i < 4; i++) {
                        let internMiddleX = piece.sides[i].startPoint[xKey] + (piece.sides[i].endPoint[xKey] - piece.sides[i].startPoint[xKey]) / 2;
                        let internMiddleY = piece.sides[i].startPoint[yKey] + (piece.sides[i].endPoint[yKey] - piece.sides[i].startPoint[yKey]) / 2;

                        let middleX = (piece.boundingBox.left + internMiddleX) * piece.images.transparent.resizeFactor - centerX;
                        let middleY = (piece.boundingBox.top + internMiddleY) * piece.images.transparent.resizeFactor - centerY;

                        let internRotation = Math.atan2(
                            piece.sides[i].endPoint[yKey] - piece.sides[i].startPoint[yKey],
                            piece.sides[i].endPoint[xKey] - piece.sides[i].startPoint[xKey]
                        ) * 180 / Math.PI;

                        let $sideContainer = $('<div class="sideContainer"></div>');
                        $sideContainer.css({
                            transform: 'rotate(' + (internRotation) + 'deg)',
                            left: middleX,
                            top: middleY,
                        });
                        $rotationButtonContainer.append($sideContainer);

                        let diffX = piece.sides[i].endPoint[xKey] - piece.sides[i].startPoint[xKey];
                        let diffY = piece.sides[i].endPoint[yKey] - piece.sides[i].startPoint[yKey];
                        let length = Math.sqrt(diffX * diffX + diffY * diffY);

                        let distanceToCenter = Math.sqrt(middleX * middleX + middleY * middleY);

                        let $side = $('<div class="side"></div>');
                        $side.css({
                            width: length * piece.images.transparent.resizeFactor,
                            height: distanceToCenter,
                            left: -(length * piece.images.transparent.resizeFactor) / 2,
                            top: -distanceToCenter
                        });
                        $side.attr('data-pieceIndex', piece.pieceIndex);
                        $side.attr('data-sideIndex', i);
                        $side.attr('data-groupIndex', g);
                        $side.attr('data-x', x);
                        $side.attr('data-y', y);

                        $sideContainer.append($side);
                    }

                    $groupContainer.append($rotationButtonContainer);
                    $groupContainer.append($rotationImageContainer);
                }
            }

            container.append($groupContainer);
        }
    }
}