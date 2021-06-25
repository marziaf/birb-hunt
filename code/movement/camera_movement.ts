import { utils } from '../libs/utils.js'

class Camera {
    // Keep track of position and orientation
    private _translationSpeed: number;
    private _translation: { x: number, y: number, z: number };
    private _deltaTime: number;
    // Camera perspective
    private _perspectiveMatrix: Array<number>;

    constructor(height: number = 3, translationSpeed: number = 0.00001) {
        this._translationSpeed = translationSpeed;
        this._translation = { x: 0, y: height, z: 1 };
        // human fovx = 220 fovy = 130
        this.setCameraParameters(180, 16 / 9, 1, 2000);
        this._initInteraction();
    }

    setCameraParameters(fovy: number, aspectRatio: number, nearPlane: number, farPlane: number) {
        this._perspectiveMatrix = utils.MakePerspective(fovy, aspectRatio, nearPlane, farPlane);
    }

    private _initInteraction() {

        window.addEventListener("keydown", keyFunction.bind(this));
        function keyFunction(e) {
            let deltaLinearSpace = 0.1;//this._deltaTime * this._translationSpeed;
            if (e.key == 'ArrowDown' || e.key == 's') {
                this._translation.z += deltaLinearSpace;
            }
            if (e.key == 'ArrowUp' || e.key == 'w') {
                this._translation.z -= deltaLinearSpace;
            }
            if (e.key == 'ArrowRight' || e.key == 'd') {
                this._translation.x += deltaLinearSpace;
            }
            if (e.key == 'ArrowLeft' || e.key == 'a') {
                this._translation.x -= deltaLinearSpace;
            }
        }
    }

    /**
     * Returns the inverse of the VP matrix
     * @param deltaTime 
     * @returns 
     */
    getNewCameraMatrixInv(deltaTime: number) {
        this._deltaTime = deltaTime;
        let view = utils.MakeWorld(this._translation.x, this._translation.y, this._translation.z, 0, 0, 0, 1);
        let viewProjection = utils.multiplyMatrices(utils.invertMatrix(this._perspectiveMatrix), utils.invertMatrix(view))
        return viewProjection;
    }
}
export { Camera };