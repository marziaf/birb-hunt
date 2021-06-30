import { isAssertionExpression, isNullishCoalesce } from "typescript";
import { utils } from "../libs/utils.js"

enum shaderType {
    LAMBERT,
}

enum lightType {
    DIRECTIONAL,
}


class Shader {
    program: WebGLProgram;
    // Common variables for shaders
    shaderDir = "http://127.0.0.1/birb_hunt/code/shaders/";
    positionAttributeLocation: number;
    normalAttributeLocation: number;
    matrixUniform: WebGLUniformLocation;
    // Lambert
    materialDiffuseColorUniform: WebGLUniformLocation;
    normalMatrixUniform: WebGLUniformLocation;

    constructor(public readonly gl: WebGL2RenderingContext, public readonly shaderType: shaderType) { }

    async init() {
        if (this.shaderType == shaderType.LAMBERT) {
            await this.initLambert();
        } else { throw "No valid shader type"; }
        this.gl.useProgram(this.program);
        this.positionAttributeLocation = this.gl.getAttribLocation(this.program, "in_position");
        this.normalAttributeLocation = this.gl.getAttribLocation(this.program, "in_normal");
        this.matrixUniform = this.gl.getUniformLocation(this.program, "u_matrix");
    }

    set(transformMatrix: Array<number>) {
        if (this.shaderType == shaderType.LAMBERT) {
            this.setLambert(transformMatrix);
        }
    }

    async cloneFromConstructor(): Promise<Shader> {
        let sh = new Shader(this.gl, this.shaderType);
        await sh.init();
        return sh;
    }

    private async initLambert() {
        this.program = await utils.createAndCompileShaders(
            this.gl, [this.shaderDir + 'lambert_vs.glsl', this.shaderDir + 'lambert_fs.glsl']);
        this.gl.useProgram(this.program);
        this.normalMatrixUniform = this.gl.getUniformLocation(this.program, 'u_normal_matrix');
    }

    private setLambert(transformMatrix: Array<number>, diffuseColorMaterial: Array<number> = null) {
        this.gl.useProgram(this.program);
        let posMatrix = utils.transposeMatrix(transformMatrix);
        this.gl.uniformMatrix4fv(this.matrixUniform, false, posMatrix);
        let normalMatrix = utils.invertMatrix(posMatrix);
        this.gl.uniformMatrix4fv(this.normalMatrixUniform, false, normalMatrix);
    }
}

class Light {
    public shader: Shader;
    // locations
    private lightDirectionUniform: WebGLUniformLocation;
    private lightColorUniform: WebGLUniformLocation;
    private materialDiffuseColorUniform: WebGLUniformLocation;

    constructor(public type: lightType,
        public lightDirection: Array<number> = null, public lightColor: Array<number> = null,
        public diffuseColorMaterial: Array<number> = null,) { }

    linkShader(shader: Shader) {
        this.shader = shader;
        this.shader.gl.useProgram(this.shader.program);
        this.lightDirectionUniform = this.shader.gl.getUniformLocation(this.shader.program, 'u_light_direction');
        this.lightColorUniform = this.shader.gl.getUniformLocation(this.shader.program, 'u_light_color');
        this.materialDiffuseColorUniform = this.shader.gl.getUniformLocation(this.shader.program, 'u_diffuse_color');
        if (this.diffuseColorMaterial != null) {
            this.shader.gl.uniform3fv(this.materialDiffuseColorUniform, this.diffuseColorMaterial);
        }
    }

    set(lightDirection: Array<number> = null, lightColor: Array<number> = null) {
        if (this.type == lightType.DIRECTIONAL) {
            this.setDirectional(lightDirection, lightColor);
        }
    }

    cloneFromConstructor(): Light {
        let li = new Light(this.type, this.lightDirection, this.lightColor, this.diffuseColorMaterial);
        return li;
    }

    // the shader will pass the normal matrix, which transforms also the light
    private setDirectional(lightDirection: Array<number> = null, lightColor: Array<number> = null) {
        let dir = this.lightDirection;
        let color = this.lightColor;
        if (lightDirection != null) {
            dir = lightDirection;
        }
        if (lightColor != null) {
            color = lightColor;
        }
        this.shader.gl.uniform3fv(this.lightColorUniform, color);
        this.shader.gl.uniform3fv(this.lightDirectionUniform, dir);
    }
}


class Texture {
    shader: Shader;
    // texture
    texture: WebGLTexture;
    // locations
    uvAttributeLocation: number;
    textureUniform: WebGLUniformLocation;

    constructor(public textureFile: string) { }

    linkShader(shader: Shader) {
        this.shader = shader;
        // signal that there is a texture
        this.shader.gl.useProgram(this.shader.program);
        this.shader.gl.uniform1i(this.shader.gl.getUniformLocation(this.shader.program, "u_has_texture"), 1);
        this.uvAttributeLocation = this.shader.gl.getAttribLocation(this.shader.program, "in_uv");
        this.textureUniform = this.shader.gl.getUniformLocation(this.shader.program, "u_texture");
        this.loadTexture(this.textureFile);
    }

    cloneFromConstructor(): Texture {
        let te = new Texture(this.textureFile);
        return te;
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