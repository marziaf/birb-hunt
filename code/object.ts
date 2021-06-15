/**
 * Contains useful data for an object of the scene
 */
import { OBJFile } from './libs/obj-parser.js';
import { utils } from "./libs/utils.js"

class Entity {
    file_obj: string;
    textureFile: string;
    gl: WebGL2RenderingContext;
    program_shaders: WebGLProgram;
    position_glsl_location: number;
    matrix_glsl_location: WebGLUniformLocation;
    vao: WebGLVertexArrayObject;
    numVertices: number;


    constructor(file: string, gl_program: any, textureFile: string) {
        this.file_obj = file;
        this.textureFile = textureFile;
        this.gl = gl_program.gl;
        this.program_shaders = gl_program.pr;
        this.position_glsl_location = this.gl.getAttribLocation(this.program_shaders, "in_position");
        this.matrix_glsl_location = this.gl.getUniformLocation(this.program_shaders, "matrix");
    }

    async create() {
        this.vao = await this._getVAO();
    }

    draw(projectionMatrix: Array<number>) {
        this.gl.useProgram(this.program_shaders);
        this.gl.uniformMatrix4fv(this.matrix_glsl_location, false, utils.transposeMatrix(projectionMatrix));
        this.gl.bindVertexArray(this.vao);
        this.gl.drawElements(this.gl.TRIANGLES, this.numVertices, this.gl.UNSIGNED_SHORT, 0);
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
    _getVertexArray(vertices: Array<any>): Array<number> {
        var vertArr = new Array();
        vertices.forEach(vertex => {
            console.assert(typeof vertex != 'undefined')
            vertArr.push(vertex.x, vertex.y, vertex.z);
        });
        return vertArr;
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


    /**
     * Build the VAO
     * @returns Promise<WebGLVertexArrayObject>
     */
    async _getVAO(): Promise<WebGLVertexArrayObject> {
        var data = await this._readObj();
        console.assert(typeof data != 'undefined')
        let verticesData = data.models[0].vertices;
        console.assert(typeof verticesData != 'undefined')
        let indicesData = data.models[0].faces;
        console.assert(typeof indicesData != 'undefined')

        let verticesArray = this._getVertexArray(verticesData);
        console.assert(typeof verticesArray != 'undefined');
        let { vert: indVertices, uv: indUV, norm: indNorm, num: numVert } = this._getIndicesArray(indicesData);
        this.numVertices = numVert;

        // create and use the vertex array object for the current obj
        var vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao)
        // bind the position buffer array to the glgs attribute and put data in it
        let positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(verticesArray), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.position_glsl_location);
        this.gl.vertexAttribPointer(this.position_glsl_location, 3, this.gl.FLOAT, false, 0, 0);
        let indexVertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexVertexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indVertices), this.gl.STATIC_DRAW);
        // TODO normals... (and alto transform normals on draw)

        return vao;
    }

    _loadTexture() {
        // create and bind texture
        var texture: WebGLTexture = this.gl.createTexture();
        var gl = this.gl;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // load the image
        var image = new Image();
        image.src = this.textureFile;
        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

            gl.generateMipmap(gl.TEXTURE_2D);
        }
    }

}
export { Entity };