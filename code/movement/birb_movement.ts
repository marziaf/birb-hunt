import { utils } from "../libs/utils.js";
import { SceneGraphNode } from "../structures/scene_graph.js";
import { mov } from "../movement/scene_object_movement.js";
import { Quaternion } from "../libs/quaternion.js";
import { formatDiagnosticsWithColorAndContext } from "typescript";

class Birb {
    private radius = 2;
    private frequency = 10;
    private amplitude = 0.5;
    private angularSpeed = 5 * 360 / 60;
    private height = 2;
    private rotationAngle = 0;

    constructor(private birb: SceneGraphNode) { };

    public randomWalk(dT: number, VP: Array<number>) {
        if (dT > 10) return;
        let deltaAngle = dT * this.angularSpeed;

        this.rotationAngle = this.rotationAngle + deltaAngle;
        // look direction
        let look = utils.MakeRotateYMatrix(90);
        // Rotate around center
        let displacement = utils.MakeTranslateMatrix(this.radius, this.height + this.amplitude * Math.cos(this.frequency * this.rotationAngle * Math.PI / 180), 0);
        let rotation = utils.MakeRotateYMatrix(this.rotationAngle);

        let movement = utils.multiplyMatrices(displacement, look);
        movement = utils.multiplyMatrices(rotation, movement);
        this.birb.setLocalMatrix(movement);
    }
}

export { Birb };