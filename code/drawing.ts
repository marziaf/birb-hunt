"use strict";

// npx tsc -watch
import { Entity } from "./structures/object.js"
import { utils } from "./libs/utils.js"
import { SceneGraphNode } from "./structures/scene_graph.js";
import { Camera } from "./movement/camera_movement.js";

var gl: WebGL2RenderingContext;
var program: WebGLProgram;
var canvas: HTMLCanvasElement;
var camera: Camera;
var transformWorldMatrix: Array<number>;
var lastUpdateTime = 0;

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


/**
 * Recursively draw all the nodes of the graph
 * @param node 
 */
function drawGraph(node: SceneGraphNode) {
    if (!node.isDummy()) {
        let WVP = utils.multiplyMatrices(transformWorldMatrix, node.getWorldMatrix());
        node.entity.draw(WVP);
    }
    node.getChildren().forEach(child => drawGraph(child));
}

/**
 * Draw the objects on scene
 * @param {Array<Entity>} - array of objects to draw on scene 
 */
function drawScene(root: SceneGraphNode) {

    // Get the delta time
    var currentTime = (new Date).getTime();
    var deltaT = (currentTime - lastUpdateTime) / 1000.0;
    lastUpdateTime = currentTime;

    // get the projection matrix, already inverted
    transformWorldMatrix = camera.getViewProjectionMatrix(deltaT);

    utils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    //gl.enable(gl.CULL_FACE);

    drawGraph(root);
    window.requestAnimationFrame(() => drawScene(root));
}


async function main() {
    // Texture image for the objects
    let sceneTexture = "assets/Texture_01.jpg";
    var gl_pr = { gl: gl, pr: program };

    // Get the camera
    let aspectRatio = canvas.width / canvas.height;
    camera = new Camera();
    camera.setCameraParameters(-220, aspectRatio, 0.1, 2000);
    // Create the scene tree
    let root = new SceneGraphNode(null, "root");
    let flower = new SceneGraphNode(new Entity("assets/flower.obj", gl_pr, sceneTexture), "flower");
    flower.setParent(root);
    await flower.entity.create();
    root.updateWorldMatrix();

    drawScene(root);
}