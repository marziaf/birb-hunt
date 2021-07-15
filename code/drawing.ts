"use strict";

// npx tsc -watch
import { Entity } from "./structures/object.js"
import { utils } from "./libs/utils.js"
import { SceneGraphNode } from "./structures/scene_graph.js";
import { Camera } from "./movement/camera_movement.js";
import { Skybox } from './structures/skybox.js'
import { mov } from "./movement/scene_object_movement.js"
import { Light, DirectionalLight, AmbientLight, Shader, LambertShader, PBRShader, Texture } from "./libs/shader_handler.js";
import { Birb } from "./movement/birb_movement.js";
import { Collider, CylinderCollider, SphereCollider } from "./movement/collision.js";

var gl: WebGL2RenderingContext;
var skyboxProgram: WebGLProgram;

var canvas: HTMLCanvasElement;
var camera: Camera;
var lastUpdateTime = 0;

var sky: Skybox;
var root: SceneGraphNode;

var VPmatrix: Array<number>;
var Vmatrix: Array<number>;

var render: { shader: Shader, lights: Array<Light>, texture: Texture };

var birbHandle: Birb;
let objFileDir = "./assets/scene_objects/";

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
    let directionalLight = new DirectionalLight(realistic, dirLight, [1, 0.8, 0.7]);
    // Textures
    let sceneObjectsTexture = new Texture(realistic, "./assets/scene_objects/Texture_01.jpg");
    render = { shader: realistic, lights: [directionalLight], texture: sceneObjectsTexture };

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
    // set the lights and the shadows only once
    render.lights.forEach(light => {
        light.set(VPmatrix);
    });
    // move birb
    birbHandle.randomWalk(deltaT, VPmatrix);
    // draw scene objects
    drawGraph(root);
    //loop
    window.requestAnimationFrame(() => drawScene(root));
}

async function getBirb(root: SceneGraphNode) {
    let birb = new Entity('./assets/red.obj', render.shader, 0.3, 1, [1, 0.2, 0.1], false);
    await birb.create();
    let birbNest = new Entity(objFileDir + 'coral.obj', render.shader, 1, 0.5, [1, 0.8, 0.5], false);
    await birbNest.create();

    let birbNestLevel = new SceneGraphNode(null, "birbNestLevel");
    birbNestLevel.setParent(root);
    let nestNode = new SceneGraphNode(birbNest, "nest", new SphereCollider(1));
    nestNode.setParent(birbNestLevel);
    let birbLevel = new SceneGraphNode(null, "birbLevel")
    let birbNode = new SceneGraphNode(birb, "birb", new SphereCollider(1));
    birbLevel.setParent(birbNestLevel);
    birbNode.setParent(birbLevel);
    mov.initGroupPosition(birbNestLevel, 5, 0, 5);//TODO
    birbHandle = new Birb(birbLevel);
}

async function getForest(root: SceneGraphNode) {
    // Create the possible objects to insert in the scene
    let objectProperties = [
        { name: "flower", qty: 60, spec: 0.1, rough: 0.7, collider: null },
        { name: "plant", qty: 30, spec: 0.4, rough: 0.7, collider: null },
        { name: "rock1", qty: 2, spec: 0.2, rough: 1, collider: new CylinderCollider(3) },
        { name: "rock2", qty: 2, spec: 0.2, rough: 1, collider: new CylinderCollider(3) },
        { name: "rock3", qty: 2, spec: 0.2, rough: 1, collider: new CylinderCollider(3) },
        { name: "smallrock", qty: 15, spec: 0.5, rough: 1, collider: new CylinderCollider(1) },
        { name: "stump", qty: 20, spec: 0.05, rough: 1, collider: new CylinderCollider(1) },
        { name: "tree1", qty: 30, spec: 0.2, rough: 1, collider: new CylinderCollider(0.2) },
        { name: "tree2", qty: 20, spec: 0.3, rough: 1, collider: new CylinderCollider(0.2) },
        { name: "tree3", qty: 20, spec: 0.05, rough: 1, collider: new CylinderCollider(0.2) },
        { name: "tree4", qty: 20, spec: 0.1, rough: 1, collider: new CylinderCollider(0.2) }];

    // grass
    let grassLevel = new SceneGraphNode(null, "grassLevel");
    grassLevel.setParent(root);
    let grass = new Entity(objFileDir + 'grass.obj', render.shader, 0, 1, [0, 1, 0.3]);
    await grass.create();
    let grassNode = new SceneGraphNode(grass, "grass");
    grassNode.setParent(root);
    mov.initLocalPosition(grassNode, 0, 0, 0, 0, 0, 0, 5);
    // trees, rocks...
    for (const { name, qty, spec, rough, collider } of objectProperties) {
        let obj = new Entity(objFileDir + name + ".obj", render.shader, spec, rough, [1, 1, 1]);
        await obj.create();

        for (let i = 0; i < qty; i++) {
            let node = new SceneGraphNode(obj, name + i, collider);
            node.setParent(grassLevel);
            do { mov.initRandomLocalPosition(node); } while (node.collider.collidingAny(root));
        }
    }
    root.updateWorldMatrix();
}

async function setupEnvironment() {

    // Create the skybox
    sky = new Skybox('./assets/skyboxes/', gl, skyboxProgram,
        'posx.jpg', 'negx.jpg', 'negy.jpg', 'posy.jpg', 'posz.jpg', 'negz.jpg');

    // Create the scene graph
    let root = new SceneGraphNode(null, "root", new SphereCollider(1)); // This collider represents the player
    getBirb(root);
    getForest(root);

    // objects on grass


    // get shadow map
    render.lights[0].setShadowMap(root);

    // Get the camera
    // create after the others to avoid problems with early event interception
    let aspectRatio = canvas.width / canvas.height;
    camera = new Camera(canvas);
    camera.setCameraParameters(40, aspectRatio, 0.1, 2000);

    return root;
}

function main() {
    console.log(root);
    drawScene(root);
}