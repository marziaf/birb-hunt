import { utils } from "../libs/utils";
import { SceneGraphNode } from "../structures/scene_graph";

abstract class Collider {
    protected location: Array<number>;

    constructor(protected radius: number) { }

    setLocation(x: number, y: number, z: number) {
        this.location = [x, y, z];
    }

    getLocation() {
        return this.location;
    }

    getRadius() {
        return this.radius;
    }

    // check if this object collides with another (unidirectional check)
    colliding(other: Collider): boolean { return false; };

    // check if two objects are colliding with each other (bidirectional)
    collidingAny(root: SceneGraphNode): boolean {
        if (root.hasCollider()) {
            if (this.colliding(root.collider) &&
                root.collider.colliding(this)) return true;
        }
        root.getChildren().forEach(child => this.collidingAny(child));
        return false;
    }
}

class CylinderCollider extends Collider {
    colliding(other: Collider): boolean {
        let proj1 = this.location.slice(0, 2);
        let proj2 = other.getLocation().slice(0, 2);
        let distance = utils.distance(proj1, proj2);
        if (distance < this.radius) return true;
        return false;
    }
}

class SphereCollider extends Collider {
    colliding(other: Collider): boolean {
        let distance = utils.distance(this.location, other.getLocation());
        if (distance < this.radius) return true;
        return false;
    }
}

export { Collider, CylinderCollider, SphereCollider };