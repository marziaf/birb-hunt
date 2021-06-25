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

// TODO modify this
var lastUpdateTime = 0;
var rot = 0;
function animate() {
    var currentTime = (new Date).getTime();
    if (lastUpdateTime) {
        var deltaC = (30 * (currentTime - lastUpdateTime)) / 1000.0;
        rot += deltaC;
    }
    lastUpdateTime = currentTime;
    return utils.MakeWorld(0.0, 0.0, 0.0, rot, -30, 0.0, 2.0);
}


/**
 * Draw the objects on scene
 * @param {Array<Entity>} - array of objects to draw on scene 
 */
function drawScene(objects) {

    utils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    //gl.enable(gl.CULL_FACE);

    let projectionMatrix = animate(); // TODO change
    objects.forEach(obj => {
        obj.draw(projectionMatrix);
    });
    window.requestAnimationFrame(() => drawScene(objects));
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
    let sceneTexture = "assets/Texture_01.jpg";

    console.assert(gl != null && program != null && typeof gl != 'undefined' && typeof program != 'undefined');
    var sceneObjects = new Array();
    var gl_pr = { gl: gl, pr: program };
    var flower = new Entity("assets/flower.obj", gl_pr, sceneTexture);
    await flower.create();

    sceneObjects[0] = flower;

    drawScene(sceneObjects);
}