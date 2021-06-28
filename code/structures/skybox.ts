import { utils } from '../libs/utils.js'
class Skybox {
    private _faceInfos: Array<{ target: GLenum, url: string }>;
    private _gl: WebGL2RenderingContext;
    private _program: WebGLProgram;
    private _skyboxTexture: WebGLTexture;
    private _skyboxTexHandle: WebGLUniformLocation;
    private _inverseViewProjMatrixHandle: WebGLUniformLocation;
    vao: WebGLVertexArrayObject;

    constructor(baseDir: string, gl: WebGL2RenderingContext, prog: WebGLProgram,
        px: string, nx: string, py: string, ny: string, pz: string, nz: string) {
        this._gl = gl;
        this._program = prog;
        this._faceInfos = [
            {
                target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                url: baseDir + px,
            },
            {
                target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
                url: baseDir + nx,
            },
            {
                target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
                url: baseDir + py,
            },
            {
                target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                url: baseDir + ny,
            },
            {
                target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
                url: baseDir + pz,
            },
            {
                target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
                url: baseDir + nz,
            },
        ];

        this._loadTexture();
        this._skyboxTexHandle = gl.getUniformLocation(prog, "u_texture");
        this._inverseViewProjMatrixHandle = gl.getUniformLocation(prog, "inverseViewProjMatrix");
    }


    draw(matr: Array<number>) {
        this._gl.useProgram(this._program);
        // send projection matrix
        this._gl.uniformMatrix4fv(this._inverseViewProjMatrixHandle, false, utils.transposeMatrix(matr));
        // bind vao
        this._gl.bindVertexArray(this.vao);

        // draw if the incoming value is less than or equal to the depth buffer value
        this._gl.depthFunc(this._gl.LEQUAL);
        this._gl.uniform1i(this._skyboxTexHandle, 0);
        this._gl.activeTexture(this._gl.TEXTURE0);
        console.assert(typeof this._skyboxTexture != 'undefined');
        this._gl.bindTexture(this._gl.TEXTURE_CUBE_MAP, this._skyboxTexture);

        this._gl.drawArrays(this._gl.TRIANGLES, 0, 6);
    }

    _loadTexture() {
        var gl = this._gl;
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 512;
        const height = 512;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;

        // position the texture on the margins of the clip space
        var skyboxVertPos = [
            -1, -1, 1.0,
            1, -1, 1.0,
            -1, 1, 1.0,
            -1, 1, 1.0,
            1, -1, 1.0,
            1, 1, 1.0,
        ];

        // create vao
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        var skyboxVertGlslLocation = gl.getAttribLocation(this._program, "in_position");

        var positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(skyboxVertPos), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(skyboxVertGlslLocation);
        gl.vertexAttribPointer(skyboxVertGlslLocation, 3, gl.FLOAT, false, 0, 0);

        this._skyboxTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this._skyboxTexture);

        var thisref = this;

        this._faceInfos.forEach((faceInfo) => {
            const { target, url } = faceInfo;

            // setup the face so it's immediately renderable
            gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

            // Asynchronously load an image
            const image = new Image();
            image.src = url;
            image.addEventListener('load', function () {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, thisref._skyboxTexture);
                gl.texImage2D(target, level, internalFormat, format, type, image);
                gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
            });
        });
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
}
export { Skybox }