"use strict";

// npx tsc -watch
import { Entity } from "./structures/object.js"
import { utils } from "./libs/utils.js"
import { SceneGraphNode } from "./structures/scene_graph.js";
import { Camera } from "./movement/camera_movement.js";
import { Skybox } from './structures/skybox.js'
import { mov } from "./movement/scene_object_movement.js"
import { Light, DirectionalLight, AmbientLight, Shader, LambertShader, PBRShader, Texture } from "./libs/shader_handler.js";

var gl: WebGL2RenderingContext;
var skyboxProgram: WebGLProgram;

var canvas: HTMLCanvasElement;
var camera: Camera;
var lastUpdateTime = 0;

var sky: Skybox;
var root: SceneGraphNode;

var VPmatrix: Array<number>;
var Vmatrix: Array<number>;

var onGrassStaticRenderer: { shader: Shader, lights: Array<Light>, texture: Texture };

/**
 * Get canvas with webgl
 * Load the shaders
 * @returns 
 */
async function init() {
    // Get a WebGL context
    canvas = <HTMLCanvasElement>document.getElementById("my-canvas");
    gl = canvas.getContext("webgl2");
    console.assert(gl != null && typeof gl != 'undefined');
    utils.resizeCanvasToDisplaySize(canvas);

    // Create objects to render plants, rocks...
    let realistic = new PBRShader(gl);
    await realistic.init();
    // Lights
    let dirLightAlpha = utils.degToRad(60);
    let dirLightBeta = utils.degToRad(180);
    let dirLight = [Math.cos(dirLightAlpha) * Math.cos(dirLightBeta),
    Math.sin(dirLightAlpha),
    Math.cos(dirLightAlpha)];
    let directionalLight = new DirectionalLight(realistic, dirLight, [1, 1, 1]);
    // Textures
    let sceneObjectsTexture = new Texture("./assets/scene_objects/Texture_01.jpg");
    onGrassStaticRenderer = { shader: realistic, lights: [directionalLight], texture: sceneObjectsTexture };

    // sky
    let shaderDir: string = "http://127.0.0.1/birb_hunt/code/shaders/";
    skyboxProgram = await utils.createAndCompileShaders(
        gl, [shaderDir + 'skybox_vs.glsl', shaderDir + 'skybox_fs.glsl']);
    // create scene
    root = await setupEnvironment();
    main();
}
window.onload = init;

/**
 * Recursively draw all the nodes of the graph
 * @param node 
 */
function drawGraph(node: SceneGraphNode) {

    if (!node.isDummy()) {
        let W = node.getWorldMatrix();
        let WVP = utils.multiplyMatrices(VPmatrix, W);
        node.entity.draw(WVP, W);
    }
    node.getChildren().forEach(child => drawGraph(child));
}

/**
 * Draw the objects on scene
 * @param {Array<Entity>} - array of objects to draw on scene 
 */
function drawScene(root: SceneGraphNode) {
    // clear screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    utils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    // Get the delta time
    var currentTime = (new Date).getTime();
    var deltaT = (currentTime - lastUpdateTime) / 1000.0;
    lastUpdateTime = currentTime;
    // get the projection matrix
    let matrices = camera.getViewProjectionMatrix(deltaT);
    VPmatrix = matrices.viewProjection;
    // draw skybox
    sky.draw(utils.invertMatrix(VPmatrix));
    // set the lights only once
    onGrassStaticRenderer.lights.forEach(light => {
        light.set(VPmatrix);
    });
    // draw scene objects
    drawGraph(root);
    //loop
    window.requestAnimationFrame(() => drawScene(root));
}

async function setupEnvironment() {
    // Texture image for the objects
    let objFileDir = "./assets/scene_objects/";

    // Create the skybox
    sky = new Skybox('./assets/skyboxes/', gl, skyboxProgram,
        'posx.jpg', 'negx.jpg', 'negy.jpg', 'posy.jpg', 'posz.jpg', 'negz.jpg');

    // Create the possible objects to insert in the scene
    let objectNamesQtys = [
        { name: "flower", qty: 30 },
        { name: "plant", qty: 20 },
        { name: "rock1", qty: 2 },
        { name: "rock2", qty: 2 },
        { name: "rock3", qty: 2 },
        { name: "smallrock", qty: 10 },
        { name: "stump", qty: 5 },
        { name: "tree1", qty: 10 },
        { name: "tree2", qty: 10 },
        { name: "tree3", qty: 10 },
        { name: "tree4", qty: 10 }];

    // Create the scene graph
    // root
    let root = new SceneGraphNode(null, "root");
    // grass
    let grassLevel = new SceneGraphNode(null, "grassLevel");
    grassLevel.setParent(root);

    let grass = new Entity(objFileDir + 'grass.obj', onGrassStaticRenderer.shader, 0, 1, [0, 1, 0.3]);
    await grass.create();

    let grassNode = new SceneGraphNode(grass, "grass");
    grassNode.setParent(root);
    mov.initLocalPosition(grassNode, 0, 0, 0, 0, 0, 0, 5);

    // objects on grass
    for (const { name, qty } of objectNamesQtys) {

        let obj = new Entity(objFileDir + name + ".obj", onGrassStaticRenderer.shader, 0.1, 0.9, [1, 1, 1]);
        await obj.create();

        for (let i = 0; i < qty; i++) {
            let node = new SceneGraphNode(obj, name + i);
            node.setParent(grassLevel);
            mov.initRandomLocalPosition(node);
        }
    };
    root.updateWorldMatrix();

    // get shadow map
    onGrassStaticRenderer.lights[0].setShadowMap(root);

    // Get the camera
    // create after the others to avoid problems with early event interception
    let aspectRatio = canvas.width / canvas.height;
    camera = new Camera(canvas);
    camera.setCameraParameters(40, aspectRatio, 0.1, 2000);

    return root;
}

function getShaderMap(light: Light) {

}

function main() {
    console.log(root);
    drawScene(root);
}