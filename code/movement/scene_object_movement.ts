import { utils } from '../libs/utils.js';
import { SceneGraphNode } from '../structures/scene_graph.js';
import { Quaternion } from '../libs/quaternion.js'

var mov = {
    initGroupPosition: function (node: SceneGraphNode, tx: number, ty: number, tz: number, rx: number = 0, ry: number = 0, rz: number = 0, s: number = 1) {
        node.updateWorldMatrix(utils.MakeWorld(tx, ty, tz, rx, ry, rz, s));
    },

    initLocalPosition: function (node: SceneGraphNode, tx: number, ty: number, tz: number, rx: number = 0, ry: number = 0, rz: number = 0, s: number = 1) {
        node.setLocalMatrix(utils.MakeWorld(tx, ty, tz, rx, ry, rz, s));
    },

    initRandomLocalPosition: function (node: SceneGraphNode) {
        mov.initLocalPosition(node,
            Math.random() * Math.sign(Math.random() - 0.5) * 40, 0, Math.random() * Math.sign(Math.random() - 0.5) * 40, // translation
            Math.random() * Math.random() * 360, 0, 0, //rotation
            0.9 + Math.random() * 0.8); // scale
    }

};
export { mov };