import { utils } from '../libs/utils.js';
import { Entity } from './object.js';
import { Collider } from '../movement/collision.js'

class SceneGraphNode {
    private _isDummy: boolean;
    private _parent: SceneGraphNode;
    private _children: Array<any>;
    private _localMatrix: Array<number>;
    private _worldMatrix: Array<number>;

    constructor(public entity: Entity = null, public readonly id: string = null, public collider: Collider = null) {
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
            // no matrix was passed in so just copy
            utils.copy(this._localMatrix, this._worldMatrix);
        }
        // now process all the children
        var worldMatrix = { ...this._worldMatrix };
        if (this.hasCollider()) {
            this.collider.setLocation(utils.multiplyMatrixVector(worldMatrix, [0, 0, 0, 1]).splice(0, 3));
        }
        this._children.forEach(function (child) {
            child.updateWorldMatrix(worldMatrix);
        });
    };

    setLocalMatrix(matrix: Array<number>) {
        this._localMatrix = matrix;
        if (this.hasCollider()) {
            this.collider.setLocation(utils.multiplyMatrixVector(matrix, [0, 0, 0, 1]).splice(0, 3));
        }
    }

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

    hasCollider(): boolean {
        return this.collider != null;
    }
}
export { SceneGraphNode };