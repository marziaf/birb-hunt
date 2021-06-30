/**
 * Contains useful data for an object of the scene
 */
import { EnumMember, isAssertionExpression } from 'typescript';
import { OBJFile } from '../libs/obj-parser.js';
import { utils } from "../libs/utils.js"
import { Shader } from "../libs/shader_handler.js"

class Entity {
    // obj data
    vao: WebGLVertexArrayObject;
    private numVertices: number;


    constructor(private file_obj: string, private shader: Shader) { }

    /**
     * Complete the construction with async elements
     *  */
    async create() {
        this.vao = await this._buildVAO();
    }

    /**
     * Draw the object on scene
     * @param projectionMatrix 
     */
    draw(matrixTransform: Array<number>) {
        this.shader.gl.useProgram(this.shader.program);
        // send the projection matrix
        this.shader.set(matrixTransform);
        // bind obj vao and draw
        this.shader.gl.bindVertexArray(this.vao);
        this.shader.gl.drawElements(this.shader.gl.TRIANGLES, this.numVertices, this.shader.gl.UNSIGNED_SHORT, 0);
    }

    /**
     * Parse an obj file
     * @returns {promise} - the parsed object with all the data from the file
     */
    private async _readObj(): Promise<any> {
        var obj_data = await fetch(this.file_obj).then(
            response => response.text()).then(data => { return data });
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
    private _packFaces(faces: Array<any>, positionUnpacked: Array<Array<object>>,
        normalsUnpacked: Array<Array<object>>, uvUnpacked: Array<Array<object>>) {
        var pos = []; var norm = []; var uv = []; var indices = [];
        // memory: store the vertices (pos, norm, uv) already inserted
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
                    let n: any = normalsUnpacked[ni];
                    let t: any = uvUnpacked[ti];
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
     * Build the VAO (position + normals + uv + indices)
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
        var vao = this.shader.gl.createVertexArray();
        this.shader.gl.bindVertexArray(vao)

        // create the buffers
        let posCoordBuffer = this.shader.gl.createBuffer();
        let normCoordBuffer = this.shader.gl.createBuffer();
        let uvCoordBuffer = this.shader.gl.createBuffer();
        let indBuffer = this.shader.gl.createBuffer();

        // POSITION
        this.shader.gl.bindBuffer(this.shader.gl.ARRAY_BUFFER, posCoordBuffer);
        this.shader.gl.bufferData(this.shader.gl.ARRAY_BUFFER, new Float32Array(pos), this.shader.gl.STATIC_DRAW);
        this.shader.gl.enableVertexAttribArray(this.shader.positionAttributeLocation);
        this.shader.gl.vertexAttribPointer(this.shader.positionAttributeLocation, 3, this.shader.gl.FLOAT, false, 0, 0);

        // NORMALS
        this.shader.gl.bindBuffer(this.shader.gl.ARRAY_BUFFER, normCoordBuffer);
        this.shader.gl.bufferData(this.shader.gl.ARRAY_BUFFER, new Float32Array(norm), this.shader.gl.STATIC_DRAW);
        this.shader.gl.enableVertexAttribArray(this.shader.normalAttributeLocation);
        this.shader.gl.vertexAttribPointer(this.shader.normalAttributeLocation, 3, this.shader.gl.FLOAT, false, 0, 0);

        // UV
        this.shader.gl.bindBuffer(this.shader.gl.ARRAY_BUFFER, uvCoordBuffer);
        this.shader.gl.bufferData(this.shader.gl.ARRAY_BUFFER, new Float32Array(uv), this.shader.gl.STATIC_DRAW);
        this.shader.gl.enableVertexAttribArray(this.shader.uvAttributeLocation);
        this.shader.gl.vertexAttribPointer(this.shader.uvAttributeLocation, 2, this.shader.gl.FLOAT, false, 0, 0);

        // INDICES
        this.shader.gl.bindBuffer(this.shader.gl.ELEMENT_ARRAY_BUFFER, indBuffer);
        this.shader.gl.bufferData(this.shader.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.shader.gl.STATIC_DRAW);

        this.numVertices = indices.length;

        return vao;
    }



}
export { Entity };