import { isAssertionExpression } from "typescript";
import { utils } from "../libs/utils.js";
import { SceneGraphNode } from "../structures/scene_graph.js";

abstract class Collider {
    protected location: Array<number> = [0, 0, 0];

    constructor(protected radius: number) { }

    setLocation(loc: Array<number>) {
        this.location = loc;
    }

    getLocation() {
        return this.location;
    }

    getRadius() {
        return this.radius;
    }

    // check if this object collides with another (unidirectional check)
    colliding(other: Collider): boolean {
        console.assert(false);
        return false;
    };

    // check if two objects are colliding with each other (bidirectional)
    collidingAny(root: SceneGraphNode): boolean {
        if (root.hasCollider() && !(this === root.collider)) {
            if (this.colliding(root.collider) ||
                root.collider.colliding(this)) {
                console.log("collision with ", root.id);
                return true;
            }
        }
        root.getChildren().forEach(child => this.collidingAny(child));

        return false;
    }
}

/*
class CylinderCollider extends Collider {
    colliding(other: Collider): boolean {
        let proj1 = [this.location[0], this.location[2]];
        let proj2 = [other.getLocation()[0], other.getLocation()[2]];
        let distance = utils.distance(proj1, proj2);
        if (distance < this.radius) return true;
        return false;
    }
}
*/
class SphereCollider extends Collider {
    colliding(other: Collider): boolean {
        let distance = utils.distance(this.location, other.getLocation());
        // console.log(this.getLocation(), other.getLocation(), distance);

        if (distance < this.radius) return true;
        return false;
    }
}

export { Collider, SphereCollider };