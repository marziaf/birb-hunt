"use strict";

var canvas;
var gl;
var program;


/**
 * Get canvas with webgl
 * Load the shaders to the program
 * @returns 
 */
async function init() {
    // Get a WebGL context
    canvas = document.getElementById("my-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("GL context not opened");
        return;
    }
    autoResizeCanvas(canvas);

    // Link the two shaders into a program
    var shaderDir = "./code/shaders/";
    await utils.loadFiles([shaderDir + 'vs.glsl', shaderDir + 'fs.glsl'], function(shaderText) {
        var vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, shaderText[0]);
        var fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, shaderText[1]);
        program = utils.createProgram(gl, vertexShader, fragmentShader);
    });


    gl.useProgram(program);
    main();
}
window.onload = init;


function autoResizeCanvas(canvas) {
    const expandFullScreen = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    expandFullScreen();
    // Resize screen when the browser has triggered the resize event
    window.addEventListener('resize', expandFullScreen);
}


function main() {


    //x,y for each vertex
    var positions = [
        0.2, 0.1,
        0.5, 0.9,
        0.8, 0.7
    ];

    // Create a buffer and put three 2d clip space points in it
    var positionBuffer = gl.createBuffer();

    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // look up where the vertex data needs to go.
    //Assume vec4 a_position attribute in GLSL representing the position of the vertices
    var positionAttributeLocation = gl.getAttribLocation(program, "a_position");

    // Turn on the attribute
    gl.enableVertexAttribArray(positionAttributeLocation);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2; // 2 components per iteration
    var normalize = false; // don't normalize the data
    var stride = 0; // 0 = move forward stride * sizeof(type) each iteration to get the next position
    var offset = 0; // start at the beginning of the buffer
    gl.vertexAttribPointer(positionAttributeLocation, size, gl.FLOAT, normalize, stride, offset);


    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // draw
    //var primitiveType = gl.LINES;
    // var primitiveType = gl.POINTS;
    //var primitiveType = gl.LINE_STRIP;
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 3;
    gl.drawArrays(primitiveType, offset, count);
}