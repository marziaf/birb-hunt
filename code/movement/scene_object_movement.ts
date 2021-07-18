import { utils } from '../libs/utils.js';
import { SceneGraphNode } from '../structures/scene_graph.js';
import { Quaternion } from '../libs/quaternion.js'

var mov = {
    initGlobalPosition: function (node: SceneGraphNode, radius: number = 60, distance: number = 5) {
        let m = mov.getRandomMatrix(radius, distance);
        node.setLocalMatrix(m)
        node.updateWorldMatrix();
    },

    initRandomLocalPosition: function (node: SceneGraphNode) {
        node.setLocalMatrix(mov.getRandomMatrix());
    },

    getRandomMatrix(radius: number = 60, distance: number = 5) {
        let m = utils.MakeWorld(
            distance + Math.random() * radius * 2 - radius, 0, distance + Math.random() * radius * 2 - radius, // translation
            Math.random() * Math.random() * 360, 0, 0, //rotation
            1); // scale
        return m;
    }

};
export { mov };