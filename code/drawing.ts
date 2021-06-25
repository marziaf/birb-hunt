"use strict";

// npx tsc -watch
import { Entity } from "./object.js"
import { utils } from "./libs/utils.js"

var gl: WebGL2RenderingContext;
var program: WebGLProgram;
var canvas: HTMLCanvasElement;


/**
 * Get canvas with webgl
 * Load the shaders to the program
 * @returns 
 */
async function init() {
    // Get a WebGL context
    canvas = <HTMLCanvasElement>document.getElementById("my-canvas");
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
    // keep the ratio of the objects' height and width constant
    let aspectRatio = canvas.width / canvas.height;
    // fix the ratio of the objects wrt the scene
    let objectSceneRatio = 500 / canvas.width;
    let windowRatioCorrection = utils.MakeScaleNuMatrix(objectSceneRatio, aspectRatio * objectSceneRatio, objectSceneRatio);
    return utils.multiplyMatrices(windowRatioCorrection, utils.MakeWorld(0.0, 0.0, 0.0, 90, -30, 0.0, 1));
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
    gl.enable(gl.CULL_FACE);

    let projectionMatrix = animate(); // TODO change
    objects.forEach(obj => {
        obj.draw(projectionMatrix);
    });
    window.requestAnimationFrame(() => drawScene(objects));
}


async function main() {
    // Texture image for the objects
    let sceneTexture = "assets/Texture_01.jpg";
    console.assert(gl != null && program != null && typeof gl != 'undefined' && typeof program != 'undefined');

    var sceneObjects = new Array();
    var gl_pr = { gl: gl, pr: program };

    var flower = new Entity("assets/flower.obj", gl_pr, sceneTexture);
    await flower.create();

    sceneObjects[0] = flower;

    drawScene(sceneObjects);
}