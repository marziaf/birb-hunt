import { utils } from '../libs/utils.js';

class Camera {
    // Keep track of position and orientation
    private _translation: { x: number, y: number, z: number };
    private _angles: { direction: number, elevation: number };
    private _deltaTime: number;
    // Movement settings
    private _translationSpeed: number;
    private _rotationSpeed: { x: number, y: number };
    private _lastCursorPosition: { x: number, y: number };
    private _elevationBoundaries: { low: number, high: number };
    // Camera perspective
    private _perspectiveMatrix: Array<number>;

    constructor(height: number = 2, translationSpeed: number = 5, rotationSpeed = { x: 30, y: 30 }) {
        this._translationSpeed = translationSpeed;
        this._rotationSpeed = rotationSpeed;
        this._translation = { x: 0, y: height, z: 1 };
        this._angles = { direction: 0, elevation: 0 };
        this.setCameraParameters(80, 1, 0.1, 2000);
        this._elevationBoundaries = { low: -40, high: 80 };
        this._initInteraction();
    }

    setCameraParameters(fovy: number, aspectRatio: number, nearPlane: number, farPlane: number) {
        this._perspectiveMatrix = utils.MakePerspective(fovy, aspectRatio, nearPlane, farPlane);
    }

    /**
     * Deal with key press and muose movement
     */
    private _initInteraction() {
        window.addEventListener("keydown", keyFunction.bind(this));
        window.addEventListener("mousemove", pointerFunction.bind(this));
        function keyFunction(e) {
            let deltaLinearSpace = this._deltaTime * this._translationSpeed;
            // move according to current camera direction, considering the angle wrt z axis (rotation on y)
            let movementAngle;
            if (e.key == 'ArrowDown' || e.key == 's') {
                // step back
                movementAngle = (180 + this._angles.direction) * Math.PI / 180;
            }
            else if (e.key == 'ArrowUp' || e.key == 'w') {
                // step front
                movementAngle = (this._angles.direction) * Math.PI / 180;
            }
            else if (e.key == 'ArrowRight' || e.key == 'd') {
                // step right
                movementAngle = (this._angles.direction - 90) * Math.PI / 180;
            }
            else if (e.key == 'ArrowLeft' || e.key == 'a') {
                // step left
                movementAngle = (90 + this._angles.direction) * Math.PI / 180;
            } else { return }

            this._translation.x -= Math.sin(movementAngle) * deltaLinearSpace;
            this._translation.z -= Math.cos(movementAngle) * deltaLinearSpace;
            console.log(movementAngle);

        }

        function pointerFunction(e) {
            let xc = e.screenX;
            let yc = e.screenY;
            if (this._lastCursorPosition == null || this._lastCursorPosition.x == null || this._lastCursorPosition.y == null) {
                this._lastCursorPosition = { x: xc, y: yc };
            }

            let deltaRotation = {
                x: (this._lastCursorPosition.x - xc) * this._deltaTime * this._rotationSpeed.x,
                y: (this._lastCursorPosition.y - yc) * this._deltaTime * this._rotationSpeed.y
            };

            this._lastCursorPosition = { x: xc, y: yc };

            this._angles.direction += deltaRotation.x;
            // Clamp elevation
            this._angles.elevation = Math.max(this._elevationBoundaries.low, Math.min(this._angles.elevation + deltaRotation.y, this._elevationBoundaries.high));

        }
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
        return utils.invertMatrix(viewProjection);
    }
}
export { Camera };