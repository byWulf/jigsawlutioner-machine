const socket = io();

$('#imageButton').on('click', () => {
    if ($(this).hasClass('disabled')) return;
    $(this).addClass('disabled');
    socket.emit('takeImage', {
        ss: $('#cameraSs').val(),
        ex: $('#cameraEx').val(),
        sh: $('#cameraSh').val(),
        co: $('#cameraCo').val(),
        br: $('#cameraBr').val(),
        sa: $('#cameraSa').val(),
        ISO: $('#cameraISO').val(),
        awb: $('#cameraAwb').val(),
        mm: $('#cameraMm').val(),
        drc: $('#cameraDrc').val(),
        q: $('#cameraQ').val(),
        cropLeft: $('#cameraCropLeft').val(),
        cropRight: $('#cameraCropRight').val(),
        cropTop: $('#cameraCropTop').val(),
        cropBottom: $('#cameraCropBottom').val(),
        parseThresh: $('#parseThresh').val(),
        parseReduction: $('#parseReduction').val()
    });
});
$('#nextButton').on('click', () => {
    socket.emit('nextPlate');
});
$('#prevButton').on('click', () => {
    socket.emit('prevPlate');
});

socket.on('newImage', (filename) => {
    $('#imageOriginal').attr('src', filename + '.resized.png');
    $('#image1').attr('src', filename + '.cropped.png.step1.png');
    $('#image2a').attr('src', filename + '.cropped.png.step2a.png');
    $('#image2b').attr('src', filename + '.cropped.png.step2b.png');
    $('#image2c').attr('src', filename + '.cropped.png.step2c.png');
    $('#image2d').attr('src', filename + '.cropped.png.step2d.png');
    $('#image2e').attr('src', filename + '.cropped.png.step2e.png');
    $('#imageButton').removeClass('disabled');
});

$('#cameraCropLeft, #cameraCropRight, #cameraCropTop, #cameraCropBottom').on('change keyup blur', function() {
    $('#cropLeftMarker').css('left', $('#cameraCropLeft').val() + '%');
    $('#cropRightMarker').css('left', $('#cameraCropRight').val() + '%');
    $('#cropTopMarker').css('top', $('#cameraCropTop').val() + '%');
    $('#cropBottomMarker').css('top', $('#cameraCropBottom').val() + '%');
});

$('#cameraCropLeft').change();