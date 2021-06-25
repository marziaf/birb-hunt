"use strict";

// npx tsc -watch
import { Entity } from "./structures/object.js"
import { utils } from "./libs/utils.js"
import { SceneGraphNode } from "./structures/scene_graph.js";

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


var lastUpdateTime = 0;
var rot = 0;

function camera() { //TODO
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
    return utils.multiplyMatrices(windowRatioCorrection, utils.MakeWorld(0.0, 0.0, 0.0, rot, -30, 0.0, 1)); // TODO
}


function drawGraph(node: SceneGraphNode) {
    if (!node.isDummy()) {
        node.entity.draw(utils.multiplyMatrices(node.getWorldMatrix(), camera()));
    }
    node.getChildren().forEach(child => drawGraph(child));
}

/**
 * Draw the objects on scene
 * @param {Array<Entity>} - array of objects to draw on scene 
 */
function drawScene(root: SceneGraphNode) {

    utils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    drawGraph(root);
    window.requestAnimationFrame(() => drawScene(root));
}


async function main() {
    // Texture image for the objects
    let sceneTexture = "assets/Texture_01.jpg";
    var gl_pr = { gl: gl, pr: program };

    // Create the scene tree
    let root = new SceneGraphNode(null, "root");
    let flower = new SceneGraphNode(new Entity("assets/flower.obj", gl_pr, sceneTexture), "flower");
    flower.setParent(root);
    await flower.entity.create();

    drawScene(root);
}