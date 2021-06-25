/**
 * Contains useful data for an object of the scene
 */
import { OBJFile } from './libs/obj-parser.js';
import { utils } from "./libs/utils.js"

class Entity {
    // files
    file_obj: string;
    textureFile: string;
    // opengl
    gl: WebGL2RenderingContext;
    program_shaders: WebGLProgram;
    // shader var location
    position_glsl_location: number;
    normals_glsl_location: number;
    uv_glsl_location: number;
    // shader uniform location
    matrix_glsl_location: WebGLUniformLocation;
    texture_glsl_location: WebGLUniformLocation;
    // obj data
    vao: WebGLVertexArrayObject;
    numVertices: number;
    texture: WebGLTexture;


    constructor(file: string, gl_program: any, textureFile: string) {
        this.file_obj = file;
        this.textureFile = textureFile;
        this.gl = gl_program.gl;
        this.program_shaders = gl_program.pr;
        this.position_glsl_location = this.gl.getAttribLocation(this.program_shaders, "in_position");
        this.normals_glsl_location = this.gl.getAttribLocation(this.program_shaders, "in_normal")
        this.matrix_glsl_location = this.gl.getUniformLocation(this.program_shaders, "u_matrix");
        this.texture_glsl_location = this.gl.getUniformLocation(this.program_shaders, "u_texture");
        this.uv_glsl_location = this.gl.getAttribLocation(this.program_shaders, "in_uv");
        console.assert(this.position_glsl_location >= 0 &&
            this.normals_glsl_location >= 0 &&
            this.matrix_glsl_location != null &&
            this.texture_glsl_location != null &&
            this.uv_glsl_location >= 0);
    }

    /**
     * Complete the construction with async elements
     *  */
    async create() {
        this.vao = await this._getVAO();
        this._loadTexture();
    }

    /**
     * Draw the object on scene
     * @param projectionMatrix 
     */
    draw(projectionMatrix: Array<number>) {
        this.gl.useProgram(this.program_shaders);
        // send the projection matrix
        this.gl.uniformMatrix4fv(this.matrix_glsl_location, false, utils.transposeMatrix(projectionMatrix));
        // bind obj vao and draw
        this.gl.bindVertexArray(this.vao);
        this.gl.drawElements(this.gl.TRIANGLES, this.numVertices, this.gl.UNSIGNED_SHORT, 0);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.uniform1i(this.texture_glsl_location, 0);

    }

    _loadTexture() {
        // create and bind texture
        this.texture = this.gl.createTexture();
        var image = new Image();
        image.src = this.textureFile;
        var gl = this.gl;
        var texture = this.texture;

        image.onload = function () {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
        }
    }

    /**
     * Parse an obj file
     * @returns {promise} - the parsed object with all the data from the file
     */
    async _readObj(): Promise<any> {
        var obj_data = await fetch(this.file_obj).then(response => response.text()).then(data => { return data });
        const objFile = new OBJFile(obj_data);
        return objFile.parse();
    };

    /**
     * Put the vertices in an array of floats
     * @param {Array<{x,y,z}>} vertices - array of vertices in the form {x:..., y:..., z:...}
     * @returns {Array} - an array of floats representing the vertices coordinates
     */
    _getCoordsArray(coords: Array<any>): Array<number> {
        var coordArray = new Array();
        coords.forEach(coord => {
            console.assert(typeof coord != 'undefined');
            coordArray.push(coord.x, coord.y, coord.z);
        });
        return coordArray;
    }
    _getUVArray(uv: Array<any>): Array<number> {
        var uvArray = new Array();
        uv.forEach(coord => {
            console.assert(typeof coord != 'undefined');
            uvArray.push(coord.u, coord.v);
        });
        return uvArray;
    }


    /**
     * Re-index to have a common index for each unique vertex
     * @param faces 
     * @param positionUnpacked 
     * @param normalsUnpacked 
     * @param uvUnpacked 
     * @returns 
     */
    _packFaces(faces: Array<any>, positionUnpacked: Array<Array<object>>, normalsUnpacked: Array<Array<object>>, uvUnpacked: Array<Array<object>>) {
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
                    pos.push(p.x, p.y, p.z);
                    norm.push(n.x, n.y, n.z);
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
    async _getVAO(): Promise<WebGLVertexArrayObject> {
        var data = await this._readObj();
        let posData = data.models[0].vertices;
        let normalData = data.models[0].vertexNormals;
        let uvData = data.models[0].textureCoords;
        let indicesData = data.models[0].faces;
        console.assert(typeof indicesData != 'undefined' && typeof uvData != 'undefined' &&
            typeof normalData != 'undefined' && typeof posData != 'undefined' && typeof data != 'undefined');

        let { pos, norm, uv, indices } = this._packFaces(indicesData, posData, normalData, uvData);


        // create and use the vertex array object for the current obj
        var vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao)

        // create the buffers
        let posCoordBuffer = this.gl.createBuffer();
        let normCoordBuffer = this.gl.createBuffer();
        let uvCoordBuffer = this.gl.createBuffer();
        let indBuffer = this.gl.createBuffer();

        // POSITION
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, posCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(pos), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.position_glsl_location);
        this.gl.vertexAttribPointer(this.position_glsl_location, 3, this.gl.FLOAT, false, 0, 0);

        // NORMALS
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, normCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(norm), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.normals_glsl_location);
        this.gl.vertexAttribPointer(this.normals_glsl_location, 3, this.gl.FLOAT, false, 0, 0);

        // UV
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, uvCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(uv), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.uv_glsl_location);
        this.gl.vertexAttribPointer(this.uv_glsl_location, 2, this.gl.FLOAT, false, 0, 0);

        // INDICES
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

        this.numVertices = indices.length;

        return vao;
    }



}
export { Entity };