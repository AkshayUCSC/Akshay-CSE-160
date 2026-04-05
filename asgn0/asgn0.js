// asgn0.js

function clearCanvas() {
    var canvas = document.getElementById('example');
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawVector(v, color) {
    var canvas = document.getElementById('example');
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }

    var ctx = canvas.getContext('2d');
    var centerX = canvas.width / 2;
    var centerY = canvas.height / 2;

    var x = centerX + v.elements[0] * 20;
    var y = centerY - v.elements[1] * 20;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function handleDrawEvent() {
    clearCanvas();

    var v1x = parseFloat(document.getElementById('v1x').value);
    var v1y = parseFloat(document.getElementById('v1y').value);
    var v2x = parseFloat(document.getElementById('v2x').value);
    var v2y = parseFloat(document.getElementById('v2y').value);

    var v1 = new Vector3([v1x, v1y, 0]);
    var v2 = new Vector3([v2x, v2y, 0]);

    drawVector(v1, "red");
    drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
    clearCanvas();

    var v1x = parseFloat(document.getElementById('v1x').value);
    var v1y = parseFloat(document.getElementById('v1y').value);
    var v2x = parseFloat(document.getElementById('v2x').value);
    var v2y = parseFloat(document.getElementById('v2y').value);
    var operation = document.getElementById('operation').value;
    var scalar = parseFloat(document.getElementById('scalar').value);

    var v1 = new Vector3([v1x, v1y, 0]);
    var v2 = new Vector3([v2x, v2y, 0]);

    drawVector(v1, "red");
    drawVector(v2, "blue");

    if (operation === "add") {
        var v3 = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]]);
        v3.add(v2);
        drawVector(v3, "green");
    } else if (operation === "sub") {
        var v3 = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]]);
        v3.sub(v2);
        drawVector(v3, "green");
    } else if (operation === "mul") {
        var v3 = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]]);
        var v4 = new Vector3([v2.elements[0], v2.elements[1], v2.elements[2]]);
        v3.mul(scalar);
        v4.mul(scalar);
        drawVector(v3, "green");
        drawVector(v4, "green");
    } else if (operation === "div") {
        var v3 = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]]);
        var v4 = new Vector3([v2.elements[0], v2.elements[1], v2.elements[2]]);
        v3.div(scalar);
        v4.div(scalar);
        drawVector(v3, "green");
        drawVector(v4, "green");
    } else if (operation === "magnitude") {
        console.log("Magnitude v1:", v1.magnitude());
        console.log("Magnitude v2:", v2.magnitude());
    } else if (operation === "normalize") {
        var v3 = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]]);
        var v4 = new Vector3([v2.elements[0], v2.elements[1], v2.elements[2]]);
        v3.normalize();
        v4.normalize();
        drawVector(v3, "green");
        drawVector(v4, "green");
    } else if (operation === "angle") {
        console.log("Angle:", angleBetween(v1, v2));
    } else if (operation === "area") {
        console.log("Area of the triangle:", areaTriangle(v1, v2));
    }
}

function angleBetween(v1, v2) {
    var dot = Vector3.dot(v1, v2);
    var mag1 = v1.magnitude();
    var mag2 = v2.magnitude();

    if (mag1 === 0 || mag2 === 0) {
        return 0;
    }

    var cosAlpha = dot / (mag1 * mag2);

    // Clamp to avoid floating-point issues
    cosAlpha = Math.max(-1, Math.min(1, cosAlpha));

    var alphaRadians = Math.acos(cosAlpha);
    var alphaDegrees = alphaRadians * 180 / Math.PI;

    return alphaDegrees;
}

function areaTriangle(v1, v2) {
    var cross = Vector3.cross(v1, v2);
    var areaParallelogram = cross.magnitude();
    return areaParallelogram / 2;
}

function main() {
    clearCanvas();
}