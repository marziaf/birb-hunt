/**
 * Contains useful data for an object of the scene
 */
import { OBJFile } from '../libs/obj-parser.js';
import { utils } from "../libs/utils.js"

class Entity {
    // files
    private _file_obj: string;
    private _textureFile: string;
    // opengl
    private _gl: WebGL2RenderingContext;
    private _program_shaders: WebGLProgram;
    // shader var location
    private _position_glsl_location: number;
    private _normals_glsl_location: number;
    private _uv_glsl_location: number;
    // shader uniform location
    private _matrix_glsl_location: WebGLUniformLocation;
    private _texture_glsl_location: WebGLUniformLocation;
    // obj data
    vao: WebGLVertexArrayObject;
    private _numVertices: number;
    private _texture: WebGLTexture;


    constructor(file: string, gl_program: any, textureFile: string) {
        this._file_obj = file;
        this._textureFile = textureFile;
        this._gl = gl_program.gl;
        this._program_shaders = gl_program.pr;
        this._position_glsl_location = this._gl.getAttribLocation(this._program_shaders, "in_position");
        this._normals_glsl_location = this._gl.getAttribLocation(this._program_shaders, "in_normal")
        this._matrix_glsl_location = this._gl.getUniformLocation(this._program_shaders, "u_matrix");
        this._texture_glsl_location = this._gl.getUniformLocation(this._program_shaders, "u_texture");
        this._uv_glsl_location = this._gl.getAttribLocation(this._program_shaders, "in_uv");
        console.assert(this._position_glsl_location >= 0 &&
            this._normals_glsl_location >= 0 &&
            this._matrix_glsl_location != null &&
            this._texture_glsl_location != null &&
            this._uv_glsl_location >= 0);
    }

    /**
     * Complete the construction with async elements
     *  */
    async create() {
        this.vao = await this._buildVAO();
        this._loadTexture();
    }

    /**
     * Draw the object on scene
     * @param projectionMatrix 
     */
    draw(matrixTransform: Array<number>) {
        this._gl.useProgram(this._program_shaders);
        // send the projection matrix
        this._gl.uniformMatrix4fv(this._matrix_glsl_location, false, utils.transposeMatrix(matrixTransform));
        // bind obj vao and draw
        this._gl.bindVertexArray(this.vao);
        this._gl.drawElements(this._gl.TRIANGLES, this._numVertices, this._gl.UNSIGNED_SHORT, 0);
    }

    private _loadTexture() {
        // create and bind texture
        this._texture = this._gl.createTexture();
        var image = new Image();
        image.src = this._textureFile;
        var gl = this._gl;
        var texture = this._texture;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        //gl.generateMipmap(gl.TEXTURE_2D);
        image.onload = function () {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        }
    }

    /**
     * Parse an obj file
     * @returns {promise} - the parsed object with all the data from the file
     */
    private async _readObj(): Promise<any> {
        var obj_data = await fetch(this._file_obj).then(response => response.text()).then(data => { return data });
        const objFile = new OBJFile(obj_data);
        return objFile.parse();
    };


    /**
     * Re-index to have a common index for each unique vertex
     * @param faces 
     * @param positionUnpacked 
     * @param normalsUnpacked 
     * @param uvUnpacked 
     * @returns 
     */
    private _packFaces(faces: Array<any>, positionUnpacked: Array<Array<object>>, normalsUnpacked: Array<Array<object>>, uvUnpacked: Array<Array<object>>) {
        var pos = [];
        var norm = [];
        var uv = [];
        var indices = [];
        var memory = new Map();
        var uniqueVertCount = 0;
        faces.forEach(triang => {
            console.assert(typeof triang != 'undefined');
            triang.vertices.forEach(vertex => {
                let pi = vertex.vertexIndex - 1;
                let ni = vertex.vertexNormalIndex - 1;
                let ti = vertex.textureCoordsIndex - 1;
                let tuple: any = { pi, ni, ti };
                let inx = memory.get(tuple);
                // if new vertex, insert
                if (typeof inx == 'undefined') {
                    let p: any = positionUnpacked[pi];
                    let n: any = normalsUnpacked[pi];
                    let t: any = uvUnpacked[pi];
                    pos.push(p.z, p.y, p.x);
                    norm.push(n.z, n.y, n.x);
                    uv.push(t.u, t.v);
                    indices.push(uniqueVertCount);
                    memory[tuple] = uniqueVertCount;
                    uniqueVertCount++;
                }
                // if already present, update only the indices vector
                else {
                    indices.push(inx);
                }
            })
        })
        return { pos, norm, uv, indices };
    }




    /**
     * Build the VAO
     * @returns Promise<WebGLVertexArrayObject>
     */
    private async _buildVAO(): Promise<WebGLVertexArrayObject> {
        var data = await this._readObj();
        let posData = data.models[0].vertices;
        let normalData = data.models[0].vertexNormals;
        let uvData = data.models[0].textureCoords;
        let indicesData = data.models[0].faces;
        console.assert(typeof indicesData != 'undefined' && typeof uvData != 'undefined' &&
            typeof normalData != 'undefined' && typeof posData != 'undefined' && typeof data != 'undefined');

        let { pos, norm, uv, indices } = this._packFaces(indicesData, posData, normalData, uvData);

        // create and use the vertex array object for the current obj
        var vao = this._gl.createVertexArray();
        this._gl.bindVertexArray(vao)

        // create the buffers
        let posCoordBuffer = this._gl.createBuffer();
        let normCoordBuffer = this._gl.createBuffer();
        let uvCoordBuffer = this._gl.createBuffer();
        let indBuffer = this._gl.createBuffer();

        // POSITION
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, posCoordBuffer);
        this._gl.bufferData(this._gl.ARRAY_BUFFER, new Float32Array(pos), this._gl.STATIC_DRAW);
        this._gl.enableVertexAttribArray(this._position_glsl_location);
        this._gl.vertexAttribPointer(this._position_glsl_location, 3, this._gl.FLOAT, false, 0, 0);

        // NORMALS
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, normCoordBuffer);
        this._gl.bufferData(this._gl.ARRAY_BUFFER, new Float32Array(norm), this._gl.STATIC_DRAW);
        this._gl.enableVertexAttribArray(this._normals_glsl_location);
        this._gl.vertexAttribPointer(this._normals_glsl_location, 3, this._gl.FLOAT, false, 0, 0);

        // UV
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, uvCoordBuffer);
        this._gl.bufferData(this._gl.ARRAY_BUFFER, new Float32Array(uv), this._gl.STATIC_DRAW);
        this._gl.enableVertexAttribArray(this._uv_glsl_location);
        this._gl.vertexAttribPointer(this._uv_glsl_location, 2, this._gl.FLOAT, false, 0, 0);

        // INDICES
        this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, indBuffer);
        this._gl.bufferData(this._gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this._gl.STATIC_DRAW);

        this._numVertices = indices.length;

        return vao;
    }



}
export { Entity };