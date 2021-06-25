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
     * Get the indices to the coordinates of vertices, texture and normals
     * @param {Array} faces - array of vertices indexes in the form of three indices {ivertex, itexture, inormal}
     * @returns {Array} - 3 array of int representing the indices to vertices, uvcoord, normals
     */
    _getIndicesArray(faces: Array<any>) {
        var indVertices = new Array();
        var indUV = new Array();
        var indNorm = new Array();
        var numVertices = 0;
        faces.forEach(triang => {
            console.assert(typeof triang != 'undefined');
            triang.vertices.forEach(vertex => {
                numVertices++;
                indVertices.push(vertex.vertexIndex);
                indUV.push(vertex.textureCoordsIndex);
                indNorm.push(vertex.vertexNormalIndex);
            })

        });

        return { vert: indVertices, uv: indUV, norm: indNorm, num: numVertices };
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
     * Build the VAO
     * @returns Promise<WebGLVertexArrayObject>
     */
    async _getVAO(): Promise<WebGLVertexArrayObject> {
        var data = await this._readObj();
        console.assert(typeof data != 'undefined')
        let verticesData = data.models[0].vertices;
        console.assert(typeof verticesData != 'undefined')
        let normalData = data.models[0].vertexNormals;
        console.assert(typeof normalData != 'undefined')
        let uvData = data.models[0].textureCoords;
        console.assert(typeof uvData != 'undefined')
        let indicesData = data.models[0].faces;
        console.assert(typeof indicesData != 'undefined')

        let verticesArray = this._getCoordsArray(verticesData);
        let normalsArray = this._getCoordsArray(normalData);
        let uvArray = this._getUVArray(uvData);
        let { vert: indVertices, uv: indUV, norm: indNorm, num: numVert } = this._getIndicesArray(indicesData);
        this.numVertices = numVert;

        // create and use the vertex array object for the current obj
        var vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao)

        // create the buffers
        let posCoordBuffer = this.gl.createBuffer();
        let normCoordBuffer = this.gl.createBuffer();
        let uvCoordBuffer = this.gl.createBuffer();
        let posIndBuffer = this.gl.createBuffer();
        let normIndBuffer = this.gl.createBuffer();
        let uvIndBuffer = this.gl.createBuffer();

        // POSITION
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, posCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(verticesArray), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.position_glsl_location);
        this.gl.vertexAttribPointer(this.position_glsl_location, 3, this.gl.FLOAT, false, 0, 0);
        //
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, posIndBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indVertices), this.gl.STATIC_DRAW);

        // NORMALS
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, normCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normalsArray), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.normals_glsl_location);
        this.gl.vertexAttribPointer(this.normals_glsl_location, 3, this.gl.FLOAT, false, 0, 0);
        //
        //this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, normIndBuffer);
        //this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indNorm), this.gl.STATIC_DRAW);

        // UV
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, uvCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(uvArray), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.uv_glsl_location);
        this.gl.vertexAttribPointer(this.uv_glsl_location, 2, this.gl.FLOAT, false, 0, 0);
        //
        //this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, uvIndBuffer);
        //this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indUV), this.gl.STATIC_DRAW);


        return vao;
    }



}
export { Entity };