import { utils } from '../libs/utils.js';
import { SceneGraphNode } from '../structures/scene_graph.js';
import { Quaternion } from '../libs/quaternion.js'

function initGroupPosition(node: SceneGraphNode, tx: number, ty: number, tz: number, rx: number = 0, ry: number = 0, rz: number = 0, s: number = 0) {
    node.updateWorldMatrix(utils.MakeWorld(tx, ty, tz, rx, ry, rz, s));
}

function initLocalPosition(node: SceneGraphNode, tx: number, ty: number, tz: number, rx: number = 0, ry: number = 0, rz: number = 0, s: number = 0) {
    node.setLocalMatrix(utils.MakeWorld(tx, ty, tz, rx, ry, rz, s));
}

