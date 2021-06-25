import { utils } from '../libs/utils.js';
import { Entity } from './object.js';

class SceneGraphNode {
    entity: Entity;
    id: string;
    private _isDummy: boolean;
    private _parent: SceneGraphNode;
    private _children: Array<any>;
    private _localMatrix: Array<number>;
    private _worldMatrix: Array<number>;

    constructor(entity: Entity = null, id: string = null) {
        if (entity == null) {
            this.entity = null;
            this._isDummy = true;
        }
        else {
            this.entity = entity;
            this._isDummy = false;
        }
        this.id = id;
        this._children = [];
        this._localMatrix = utils.identityMatrix();
        this._worldMatrix = utils.identityMatrix();
    };

    setParent(parent: SceneGraphNode) {
        // remove us from our parent
        if (this._parent) {
            var ndx = this._parent._children.indexOf(this);
            if (ndx >= 0) {
                this._parent._children.splice(ndx, 1);
            }
        }
        // Add us to our new parent
        if (parent) {
            parent._children.push(this);
        }
        this._parent = parent;
    };

    updateWorldMatrix(matrix: Array<number> = null) {
        if (matrix) {
            // a matrix was passed in so do the math
            this._worldMatrix = utils.multiplyMatrices(matrix, this._localMatrix);
        } else {
            // no matrix was passed in so just copy.
            utils.copy(this._localMatrix, this._worldMatrix);
        }
        // now process all the children
        var worldMatrix = this._worldMatrix;
        this._children.forEach(function (child) {
            child.updateWorldMatrix(worldMatrix);
        });
    };

    // world matrix: local -> global
    getWorldMatrix() {
        return this._worldMatrix;
    }

    isDummy() {
        return this._isDummy;
    }

    getChildren() {
        return this._children;
    }
}
export { SceneGraphNode };