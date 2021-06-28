import { utils } from '../libs/utils.js';

class Camera {
    // Keep track of position and orientation
    private _canvas: HTMLCanvasElement;
    private _translation: { x: number, y: number, z: number };
    private _angles: { direction: number, elevation: number };
    private _deltaTime: number;
    private _keyState: Map<string, boolean>;
    // Movement settings
    private _translationSpeed: number;
    private _rotationSpeed: { x: number, y: number };
    private _elevationBoundaries: { low: number, high: number };
    // Camera perspective
    private _perspectiveMatrix: Array<number>;

    constructor(canvas: HTMLCanvasElement, height: number = 2, translationSpeed: number = 5, rotationSpeed = { x: 30, y: 30 }) {
        this._canvas = canvas;
        this._translationSpeed = translationSpeed;
        this._rotationSpeed = rotationSpeed;
        this._translation = { x: 0, y: height, z: 0 };
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
    _keyFunction() {
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

        let movementAngle = Math.atan2(z, x);

        this._translation.x += Math.sin(movementAngle) * deltaLinearSpace;
        this._translation.z += Math.cos(movementAngle) * deltaLinearSpace;
    }

    /**
     * Returns the inverse of the VP matrix
     * @param deltaTime 
     * @returns 
     */
    getViewProjectionMatrix(deltaTime: number) {
        this._deltaTime = deltaTime;

        let view = utils.MakeView(this._translation.x, this._translation.y, this._translation.z, this._angles.elevation, this._angles.direction);

        let viewProjection = utils.multiplyMatrices(this._perspectiveMatrix, view);
        return viewProjection;
    }
}
export { Camera };