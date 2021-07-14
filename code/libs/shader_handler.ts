import { collapseTextChangeRangesAcrossMultipleVersions, isAssertionExpression, isNullishCoalesce, isThisTypeNode } from "typescript";
import { utils } from "../libs/utils.js"
import { Camera } from "../movement/camera_movement.js";
import { Entity } from "../structures/object.js";
import { SceneGraphNode } from "../structures/scene_graph.js";



/**
 * Deal with the main aspects shader-related:
 * - compile
 * - get vertices locations in program
 * - get matrices locations in program
 * - ...
 */
abstract class Shader {
    program: WebGLProgram;
    // Common variables for shaders
    shaderDir = "http://127.0.0.1/birb_hunt/code/shaders/";
    positionAttributeLocation: number;
    normalAttributeLocation: number;
    uvAttributeLocation: number;
    matrixUniform: WebGLUniformLocation;
    normalMatrixUniform: WebGLUniformLocation;
    localMatrixUniform: WebGLUniformLocation;


    /**
     * Construction must be finished with init()
     * @param gl 
     * @param shaderType 
     */
    constructor(public readonly gl: WebGL2RenderingContext) { }

    /**
     * Async compile shaders and get atributes/uniforms locations
     * To be executed before using the shader
     */
    protected async init() {
        this.gl.useProgram(this.program);
        this.positionAttributeLocation = this.gl.getAttribLocation(this.program, "in_position");
        this.normalAttributeLocation = this.gl.getAttribLocation(this.program, "in_normal");
        this.uvAttributeLocation = this.gl.getAttribLocation(this.program, "in_uv");
        this.matrixUniform = this.gl.getUniformLocation(this.program, "u_matrix");
        this.normalMatrixUniform = this.gl.getUniformLocation(this.program, 'u_normal_matrix');
        this.localMatrixUniform = this.gl.getUniformLocation(this.program, 'u_local_matrix');
    }
    setParameters(a: number, b: number, c: Array<number>) { }


    /**
     * Pass to the program the matrices to transform the attributes
     * @param transformMatrix 
     */
    public transform(WVP: Array<number>, Loc: Array<number>) {
        let transposeWVP = utils.transposeMatrix(WVP);
        let transposeLoc = (utils.transposeMatrix(Loc)); // TODO works with non-uniform scaling
        this.gl.useProgram(this.program);
        this.gl.uniformMatrix4fv(this.matrixUniform, false, transposeWVP);
        this.gl.uniformMatrix4fv(this.normalMatrixUniform, false, transposeLoc);
        this.gl.uniformMatrix4fv(this.localMatrixUniform, false, Loc);
    }

}

class LambertShader extends Shader {
    constructor(public readonly gl: WebGL2RenderingContext) {
        super(gl);
    }

    public async init() {
        this.program = await utils.createAndCompileShaders(
            this.gl, [this.shaderDir + 'lambert_vs.glsl', this.shaderDir + 'lambert_fs.glsl']);
        super.init();
    }
}

class PBRShader extends Shader {
    roughnessUniform: WebGLUniformLocation;
    metalnessUniform: WebGLUniformLocation;
    specularColorUniform: WebGLUniformLocation;
    constructor(public readonly gl: WebGL2RenderingContext) {
        super(gl);
    }

    public async init() {
        this.program = await utils.createAndCompileShaders(
            this.gl, [this.shaderDir + 'PBR_vs.glsl', this.shaderDir + 'PBR_fs.glsl']);
        this.metalnessUniform = this.gl.getUniformLocation(this.program, 'metalness');
        this.roughnessUniform = this.gl.getUniformLocation(this.program, 'roughness');
        this.specularColorUniform = this.gl.getUniformLocation(this.program, 'specularColor');
        super.init();
    }

    setParameters(metalness: number, roughness: number, specularColor: Array<number>) {
        this.gl.useProgram(this.program);
        this.gl.uniform1f(this.metalnessUniform, metalness);
        this.gl.uniform1f(this.roughnessUniform, roughness);
        this.gl.uniform3fv(this.specularColorUniform, specularColor);
    }
}

/**
 * Create and manage one light
 */
abstract class Light {
    // locations
    protected shadowMapUniform: WebGLUniformLocation;
    protected shadowMapMatrix: WebGLUniformLocation;
    // shadow map
    protected frameBuffer: WebGLFramebuffer;
    protected depthShadowMap: WebGLTexture;
    private readonly mapSize = 512;

    constructor(protected shader: Shader) { }

    public set(WVP: Array<number>) {
        let gl = this.shader.gl;
        gl.useProgram(this.shader.program);
        // link the depth texture
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.depthShadowMap);
        gl.uniform1i(this.shadowMapUniform, 1);
    }

    public setShadowMap(staticObjectsRoot: SceneGraphNode) {
        if (this.frameBuffer == null || typeof this.frameBuffer == 'undefined') {
            this.initShadowMap();
        }
    };

    protected initShadowMap() {
        let gl = this.shader.gl;
        gl.useProgram(this.shader.program);
        // frame buffer
        this.frameBuffer = gl.createFramebuffer()
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer)
        // create a texture to hold the colors (useless)
        gl.activeTexture(gl.TEXTURE1);
        let color = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, color);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.mapSize, this.mapSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
        // create a texture to hold the depth
        gl.activeTexture(gl.TEXTURE2);
        this.depthShadowMap = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.depthShadowMap);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, this.mapSize, this.mapSize, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthShadowMap, 0);
        // link to shader
        this.shadowMapUniform = gl.getUniformLocation(this.shader.program, "u_shadow_map");
        this.shadowMapMatrix = gl.getUniformLocation(this.shader.program, "u_shadow_matrix");
    }

    protected drawShadowMap(staticObjectsRoot: SceneGraphNode, view: Array<number>) {
        let gl = this.shader.gl;
        // draw on frame buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
        console.assert(gl.checkFramebufferStatus(gl.FRAMEBUFFER) == 36053);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, this.mapSize, this.mapSize);
        this.drawGraph(staticObjectsRoot, view);
    }

    protected drawGraph(node: SceneGraphNode, view: Array<number>) {
        if (!node.isDummy()) {
            let W = node.getWorldMatrix();
            node.entity.draw(view, W);
        }
        node.getChildren().forEach(child => this.drawGraph(child, view));
    }

}

class DirectionalLight extends Light {
    private lightDirectionUniform: WebGLUniformLocation;
    private lightColorUniform: WebGLUniformLocation;
    private materialDiffuseColorUniform: WebGLUniformLocation;
    private viewMatrix: Array<number>;

    constructor(shader: Shader, public lightDirection: Array<number>, public lightColor: Array<number>) {
        super(shader);
        this.shader.gl.useProgram(this.shader.program);
        this.lightDirectionUniform = this.shader.gl.getUniformLocation(this.shader.program, 'u_light_direction');
        this.lightColorUniform = this.shader.gl.getUniformLocation(this.shader.program, 'u_light_color');
    }

    /**
    * Given the transform matrix, transform the spatial light parameters
    * Call only once for frame
    * @param matrix 
    */
    public set(matrix: Array<number>) {
        super.set(matrix);
        this.shader.gl.useProgram(this.shader.program);
        let transpose = utils.transposeMatrix(matrix);
        let inverseTranspose = utils.invertMatrix(transpose);
        let light4 = utils.copy(this.lightDirection); light4[3] = 0;
        let transformedDirection = utils.multiplyMatrixVector(utils.identityMatrix(), light4);//inverseTranspose, light4);
        this.shader.gl.uniform3fv(this.lightColorUniform, this.lightColor);
        this.shader.gl.uniform3fv(this.lightDirectionUniform, transformedDirection.slice(0, 3));
        // link the matrix to transform the texture object coordinates to light
        this.shader.gl.uniformMatrix4fv(this.shadowMapMatrix, false, this.viewMatrix);
    }

    public setShadowMap(staticObjectsRoot: SceneGraphNode) {
        super.setShadowMap(staticObjectsRoot);
        // Put the scene in light coordinates
        this.viewMatrix = utils.MakeView(10, 10, 10, Math.atan(this.lightDirection[1] / this.lightDirection[0]), Math.acos(this.lightDirection[2] / this.lightDirection[0]));
        super.drawShadowMap(staticObjectsRoot, this.viewMatrix);
    }
}

class AmbientLight extends Light {
    private ambientColorUniform: WebGLUniformLocation;

    constructor(shader: Shader, private ambientColor: Array<number>) {
        super(shader);
        this.ambientColorUniform = this.shader.gl.getUniformLocation(this.shader.program, 'u_ambient_color');
    }

    /**
     * Set parameters on the shader
     */
    public set() {
        this.shader.gl.uniform3fv(this.ambientColorUniform, this.ambientColor);
    }

    public setShadowMap(staticObjectsRoot: SceneGraphNode) {
        //TODO
    }

}


/**
 * Create and manage a texture
 */
class Texture {
    // texture
    texture: WebGLTexture;
    // locations
    uvAttributeLocation: number;
    textureUniform: WebGLUniformLocation;

    /**
     * Define the souce file
     * To complete the construction, call also linkShader
     * @param textureFile 
     * @param shader
     */
    constructor(private shader: Shader, public textureFile: string) {
        shader.gl.useProgram(shader.program);
        this.textureUniform = shader.gl.getUniformLocation(shader.program, "u_texture");
        // create and bind texture
        this.texture = this.shader.gl.createTexture();
        var image = new Image();
        image.src = textureFile;
        var gl = shader.gl;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        //gl.generateMipmap(gl.TEXTURE_2D);
        var tex = this.texture;
        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        }
    }

}

export { Light, DirectionalLight, AmbientLight, Shader, LambertShader, PBRShader, Texture };