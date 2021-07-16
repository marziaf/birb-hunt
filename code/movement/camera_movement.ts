import { utils } from '../libs/utils.js';
import { SceneGraphNode } from '../structures/scene_graph.js';
import { Collider, SphereCollider } from './collision.js';

class Camera {
    // Keep track of position and orientation
    private _canvas: HTMLCanvasElement;
    public translation: { x: number, y: number, z: number };
    private _lastValidTranslation: { x: number, y: number, z: number };
    private _angles: { direction: number, elevation: number };
    private _deltaTime: number;
    private _keyState: Map<string, boolean>;
    // Movement settings
    private _translationSpeed: number;
    private _rotationSpeed: { x: number, y: number };
    private _elevationBoundaries: { low: number, high: number };
    // Camera perspective
    private _perspectiveMatrix: Array<number>;


    constructor(canvas: HTMLCanvasElement, private root: SceneGraphNode, height: number = 2, translationSpeed: number = 25, rotationSpeed = { x: 30, y: 30 }) {
        this._canvas = canvas;
        this._translationSpeed = translationSpeed;
        this._rotationSpeed = rotationSpeed;
        this.translation = { x: 0, y: height, z: 0 };
        this._lastValidTranslation = { x: 0, y: height, z: 0 };
        this._angles = { direction: 0, elevation: 0 };
        this.setCameraParameters(-200, 1, 0.1, 2000);
        this._elevationBoundaries = { low: -40, high: 80 };
        this._keyState = new Map;
        this._initInteraction();
    }

    setCameraParameters(fovy: number, aspectRatio: number, nearPlane: number, farPlane: number) {
        this._perspectiveMatrix = utils.MakePerspective(fovy, aspectRatio, nearPlane, farPlane);
    }

    /**
     * Deal with key press and muose movement
     */
    private _initInteraction() {
        this._canvas.onclick = this._canvas.requestPointerLock;

        window.addEventListener("keydown", (e) => {
            this._keyState[e.key] = true;
            this._keyFunction();
        });
        window.addEventListener("keyup", (e) => {
            this._keyState[e.key] = false;
        })
        window.addEventListener("mousemove", pointerFunction.bind(this));


        function pointerFunction(e) {
            let deltaRotation = {
                x: -e.movementX * this._deltaTime * this._rotationSpeed.x,
                y: -e.movementY * this._deltaTime * this._rotationSpeed.y
            };
            this._angles.direction += deltaRotation.x;
            // Clamp elevation
            this._angles.elevation = Math.max(this._elevationBoundaries.low, Math.min(this._angles.elevation + deltaRotation.y, this._elevationBoundaries.high));
        }
    }

    /**
     * Read key press and move the camera
     */
    private _keyFunction() {
        let deltaLinearSpace = this._deltaTime * this._translationSpeed;
        // move according to current camera direction, considering the angle wrt z axis (rotation on y)
        let z = 0;
        let x = 0;
        if (this._keyState['ArrowDown'] || this._keyState['s']) {
            z--;
        }
        if (this._keyState['ArrowUp'] || this._keyState['w']) {
            z++;
        }
        if (this._keyState['ArrowRight'] || this._keyState['d']) {
            x++;
        }
        if (this._keyState['ArrowLeft'] || this._keyState['a']) {
            x--;
        }
        // update position only if it does not cause collisions
        // check collisions in local space
        let resAngle = Math.atan2(x, -z) + this._angles.direction * Math.PI / 180;
        this.translation.x += Math.sin(resAngle) * deltaLinearSpace;
        this.translation.z += Math.cos(resAngle) * deltaLinearSpace;
    }

    /**
     * Returns the inverse of the VP matrix
     * @param deltaTime 
     * @returns view, view-projection matrices
     */
    getViewProjectionMatrix(deltaTime: number) {
        this._deltaTime = deltaTime;

        // makeview already contains the inversion of the translation
        let view = utils.MakeView(this.translation.x, this.translation.y, this.translation.z, this._angles.elevation, this._angles.direction);
        let viewProjection = utils.multiplyMatrices(this._perspectiveMatrix, view);
        return { viewProjection, view };
    }

    updateLastValidPosition(player: Collider, root: SceneGraphNode) {
        player.setLocation([this.translation.x, this.translation.y, this.translation.z]);
        if (player.collidingAny(root)) this.translation = this._lastValidTranslation;
        else this._lastValidTranslation = this.translation;
    }
}
export { Camera };