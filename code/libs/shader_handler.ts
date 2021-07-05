import { collapseTextChangeRangesAcrossMultipleVersions, isAssertionExpression, isNullishCoalesce } from "typescript";
import { utils } from "../libs/utils.js"

enum shaderType {
    LAMBERT,
    PBR,
}

enum lightType {
    DIRECTIONAL,
    AMBIENT
}

/**
 * Deal with the main aspects shader-related:
 * - compile
 * - get vertices locations in program
 * - get matrices locations in program
 * - ...
 */
class Shader {
    program: WebGLProgram;
    // Common variables for shaders
    shaderDir = "http://127.0.0.1/birb_hunt/code/shaders/";
    positionAttributeLocation: number;
    normalAttributeLocation: number;
    uvAttributeLocation: number;
    matrixUniform: WebGLUniformLocation;
    // Lambert
    materialDiffuseColorUniform: WebGLUniformLocation;
    normalMatrixUniform: WebGLUniformLocation;
    // PBR
    roughnessUniform: WebGLUniformLocation;
    metalnessUniform: WebGLUniformLocation;
    specularColorUniform: WebGLUniformLocation;

    /**
     * Define the shader type
     * Construction must be finished with init()
     * @param gl 
     * @param shaderType 
     */
    constructor(public readonly gl: WebGL2RenderingContext, public readonly shaderType: shaderType) { }

    /**
     * Async compile shaders and get atributes/uniforms locations
     * To be executed before using the shader
     */
    async init() {
        if (this.shaderType == shaderType.LAMBERT) {
            await this.initLambert();
        }
        else if (this.shaderType == shaderType.PBR) {
            await this.initBRDF();
        } else console.assert(false);
        this.gl.useProgram(this.program);
        this.positionAttributeLocation = this.gl.getAttribLocation(this.program, "in_position");
        this.normalAttributeLocation = this.gl.getAttribLocation(this.program, "in_normal");
        this.uvAttributeLocation = this.gl.getAttribLocation(this.program, "in_uv");

        this.matrixUniform = this.gl.getUniformLocation(this.program, "u_matrix");
        this.normalMatrixUniform = this.gl.getUniformLocation(this.program, 'u_normal_matrix');
    }

    setPBRParameters(metalness: number, roughness: number, specularColor: Array<number>) {
        this.gl.useProgram(this.program);
        this.gl.uniform1f(this.metalnessUniform, metalness);
        this.gl.uniform1f(this.roughnessUniform, roughness);
        this.gl.uniform3fv(this.specularColorUniform, specularColor);
    }

    /**
     * Pass to the program the matrices to transform the attributes
     * @param transformMatrix 
     */
    transform(WVP: Array<number>, Loc: Array<number>) {
        let transposeWVP = utils.transposeMatrix(WVP);
        let transposeLoc = (utils.transposeMatrix(Loc)); // TODO works with non-uniform scaling
        this.gl.useProgram(this.program);
        this.gl.uniformMatrix4fv(this.matrixUniform, false, transposeWVP);
        this.gl.uniformMatrix4fv(this.normalMatrixUniform, false, transposeLoc);
    }

    private async initLambert() {
        this.program = await utils.createAndCompileShaders(
            this.gl, [this.shaderDir + 'lambert_vs.glsl', this.shaderDir + 'lambert_fs.glsl']);
    }

    private async initBRDF() {
        this.program = await utils.createAndCompileShaders(
            this.gl, [this.shaderDir + 'PBR_vs.glsl', this.shaderDir + 'PBR_fs.glsl']);
        this.metalnessUniform = this.gl.getUniformLocation(this.program, 'metalness');
        this.roughnessUniform = this.gl.getUniformLocation(this.program, 'roughness');
        this.specularColorUniform = this.gl.getUniformLocation(this.program, 'specularColor');
    }
}


/**
 * Create and manage one light
 */
class Light {
    public shader: Shader;
    // locations
    private lightDirectionUniform: WebGLUniformLocation;
    private lightColorUniform: WebGLUniformLocation;
    private materialDiffuseColorUniform: WebGLUniformLocation;
    private ambientColorUniform: WebGLUniformLocation;

    /**
     * Define the light type and its parameters (set the needed ones according to shader type)
     * Complete construction with linkShader()
     * @param type 
     * @param lightDirection 
     * @param lightColor 
     * @param diffuseColorMaterial 
     */
    constructor(public type: lightType,
        public lightDirection: Array<number> = null, public lightColor: Array<number> = null,
        public diffuseColorMaterial: Array<number> = null, public ambientColor: Array<number> = null) { }

    /**
     * Link the light to a shader and get uniform locations
     * Must be called before using light
     * @param shader 
     */
    linkShader(shader: Shader) {
        this.shader = shader;
        if (this.type == lightType.DIRECTIONAL) {
            this.getLocationsDirectional();
        }
        if (this.type == lightType.AMBIENT) {
            this.getLocationsAmbient();
        }
    }

    /**
     * Given the transform matrix, transform the spacial light parameters
     * Call only once for frame
     * @param matrix 
     */
    transform(matrix: Array<number> = null) {
        this.shader.gl.useProgram(this.shader.program);
        let transpose = utils.transposeMatrix(matrix);
        let inverseTranspose = utils.invertMatrix(transpose);

        if (this.type == lightType.DIRECTIONAL) {
            this.transformDirectional(inverseTranspose);
        }
        if (this.type == lightType.AMBIENT) {
            this.shader.gl.uniform3fv(this.ambientColorUniform, this.ambientColor);
        }
    }

    private transformDirectional(matrix: Array<number>) {
        let light4 = utils.copy(this.lightDirection); light4[3] = 0;
        let transformedDirection = utils.multiplyMatrixVector(utils.identityMatrix(), light4);//inverseTranspose, light4);
        this.shader.gl.uniform3fv(this.lightColorUniform, this.lightColor);

        this.shader.gl.uniform3fv(this.lightDirectionUniform, transformedDirection.slice(0, 3));
    }

    private getLocationsDirectional() {
        this.shader.gl.useProgram(this.shader.program);
        this.lightDirectionUniform = this.shader.gl.getUniformLocation(this.shader.program, 'u_light_direction');
        this.lightColorUniform = this.shader.gl.getUniformLocation(this.shader.program, 'u_light_color');
        if (this.diffuseColorMaterial != null) {
            this.materialDiffuseColorUniform = this.shader.gl.getUniformLocation(this.shader.program, 'u_diffuse_color');
            this.shader.gl.uniform3fv(this.materialDiffuseColorUniform, this.diffuseColorMaterial);
        }
    }

    private getLocationsAmbient() {
        this.ambientColorUniform = this.shader.gl.getUniformLocation(this.shader.program, 'u_ambient_color');
    }
}

/**
 * Create and manage a texture
 */
class Texture {
    shader: Shader;
    // texture
    texture: WebGLTexture;
    // locations
    uvAttributeLocation: number;
    textureUniform: WebGLUniformLocation;

    /**
     * Define the souce file
     * To complete the construction, call also linkShader
     * @param textureFile 
     */
    constructor(public textureFile: string) { }

    /**
     * Associate a shader to get the shading program
     * @param shader 
     */
    linkShader(shader: Shader) {
        this.shader = shader;
        // signal that there is a texture
        this.shader.gl.useProgram(this.shader.program);
        this.shader.gl.uniform1i(this.shader.gl.getUniformLocation(this.shader.program, "u_has_texture"), 1);
        this.textureUniform = this.shader.gl.getUniformLocation(this.shader.program, "u_texture");
        this.loadTexture(this.textureFile);
    }

    private loadTexture(textureSrc: string) {
        // create and bind texture
        this.shader.gl.useProgram(this.shader.program);
        this.texture = this.shader.gl.createTexture();
        var image = new Image();
        image.src = textureSrc;
        var gl = this.shader.gl;
        var texture = this.texture;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        //gl.generateMipmap(gl.TEXTURE_2D);
        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        }
    }
}

export { Light, Shader, Texture, shaderType, lightType };