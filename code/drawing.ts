"use strict";

// npx tsc -watch
import { Entity } from "./object.js"
import { utils } from "./libs/utils.js"
import { OBJFile } from "./libs/obj-parser.js"

var gl: WebGL2RenderingContext;
var program;


/**
 * Get canvas with webgl
 * Load the shaders to the program
 * @returns 
 */
async function init() {
    console.log("Running init");
    // Get a WebGL context
    let canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("my-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("GL context not opened");
        return;
    }
    utils.resizeCanvasToDisplaySize(canvas);
    // Link the two shaders into a program

    let shaderDir: string = "http://127.0.0.1/birb_hunt/code/shaders/";
    program = await utils.createAndCompileShaders(gl, [shaderDir + 'vs.glsl', shaderDir + 'fs.glsl']);
    main();
}
window.onload = init;

/**
 * Draw the objects on scene
 * @param {Array<Entity>} - array of objects to draw on scene 
 */
function drawScene(objects) {
    // TODO make work with animation
    let projectionMatrix = utils.identityMatrix(); // TODO change
    objects.forEach(obj => {
        gl.useProgram(obj.program_shaders);
        gl.uniformMatrix4fv(obj.matrix_glsl_location, false, utils.transposeMatrix(projectionMatrix));
        gl.bindVertexArray(obj.vao);
        gl.drawElements(gl.TRIANGLES, obj.numVertices, gl.UNSIGNED_SHORT, 0);
    });
}

// TODO DELETE

async function printObj(obj_file_name) {
    var obj_data = await fetch(obj_file_name).then(response => response.text()).then(data => { return data });
    const objFile = new OBJFile(obj_data);
    console.log(objFile.parse());
};


async function main() {
    console.log("Program is running");
    printObj("assets/flower.obj");

    console.assert(gl != null && program != null && typeof gl != 'undefined' && typeof program != 'undefined');
    var sceneObjects = new Array();
    var gl_pr = { gl: gl, pr: program };
    var flower = new Entity("assets/flower.obj", gl_pr);
    await flower.create();
    console.log("Got flower");

    sceneObjects[0] = flower;

    drawScene(sceneObjects);
}