function rad2deg(radians)
{
    return radians * (180 / Math.PI);
}

function normalizeRotation(rotation)
{
    while (rotation > 180) {
        rotation -= 360;
    }
    while (rotation <= -180) {
        rotation += 360;
    }

    return rotation;
}

function getAverageRotation(topLeftPoint, bottomLeftPoint, bottomRightPoint, topRightPoint)
{
    const topRotation = getRotation(topLeftPoint, topRightPoint);
    const bottomRotation = justifyRotation(topRotation, getRotation(bottomLeftPoint, bottomRightPoint));
    const leftRotation = justifyRotation(topRotation, getRotation(topLeftPoint, bottomLeftPoint) - 90);
    const rightRotation = justifyRotation(topRotation, getRotation(topRightPoint, bottomRightPoint) - 90);

    return normalizeRotation((topRotation + bottomRotation + leftRotation + rightRotation) / 4);
}


function justifyRotation(baseRotation, rotationToJustify)
{
    while (Math.abs(rotationToJustify - baseRotation) > Math.abs(rotationToJustify - baseRotation - 180)) {
        rotationToJustify -= 360;
    }

    while (Math.abs(rotationToJustify - baseRotation) > Math.abs(rotationToJustify - baseRotation + 180)) {
        rotationToJustify += 360;
    }

    return rotationToJustify;
}


function getRotation(point1, point2)
{
    const rotation = rad2deg(Math.atan2(point2.y - point1.y, point2.x - point1.x));

    return normalizeRotation(rotation);
}

function getAveragePoint(points)
{
    if (points.length === 0) {
        throw new Error('You have to provide at least one point to get their average.');
    }

    let xSum = 0;
    let ySum = 0;
    for (let i = 0; i < points.length; i++) {
        xSum += points[i].x;
        ySum += points[i].y;
    }

    return {
        x: xSum / points.length,
        y: ySum / points.length,
    };
}

function rotatePoint(centerPoint, point, angle) {
    const radians = (Math.PI / 180) * angle;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    return {
        x: (cos * (point.x - centerPoint.x)) + (sin * (point.y - centerPoint.y)) + centerPoint.x,
        y: (cos * (point.y - centerPoint.y)) - (sin * (point.x - centerPoint.x)) + centerPoint.y,
    };
}

export { getAverageRotation, getAveragePoint, rotatePoint };
