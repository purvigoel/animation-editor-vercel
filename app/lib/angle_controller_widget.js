import { AngleControllerRenderer } from "./angle_controller_renderer";
import {m4} from "./m4.js";
import {vec3} from "gl-matrix";
import {angle_to_rotmat, angle_axis_rotmat} from "./angle_controller";
import * as tf from '@tensorflow/tfjs';

let axes = [ vec3.fromValues(1, 0, 0),
         vec3.fromValues (0, 1, 0),
         vec3.fromValues (0, 0, 1) ];

export class AngleControllerWidget {
    constructor(origin, gl, angleControllerRenderer) {
        this.origin = origin;
        this.gl = gl;
        this.show = false;
        this.renderer = angleControllerRenderer;

        this.children = [];
        this.parent_rotation = tf.tensor ([[1,0,0],[0,1,0],[0,0,1]]);
        this.current_rotation = tf.tensor ([[1,0,0],[0,1,0],[0,0,1]]);

        this.rotation_angles = [0, 0, 0];
        this.rotation_matrices = [angle_to_rotmat (0, 0),
                                  angle_to_rotmat (1, 0),
                                  angle_to_rotmat (2, 0)];


    }

    update_children (rotmat) {
        for (var child of this.children) {
            child.parent_rotation = tf.matMul (child.parent_rotation, rotmat);
            child.update_children (rotmat);
        }
    }

    update_rotmat (axis, angle) {
        const current_rotmat = tf.matMul(this.parent_rotation, this.current_rotation);
        let world_axis = vec3.create();
        vec3.transformMat3(world_axis, axes[axis], current_rotmat.arraySync().flat());
        vec3.normalize (world_axis, world_axis);
        console.log(world_axis);
        let rotmat = angle_axis_rotmat (world_axis, angle);
        this.update_children (rotmat);

        this.current_rotation = tf.matMul (this.current_rotation, rotmat);
        console.log(this.current_rotation );
        return rotmat;
    }

    render(device, origin, pos, show_translation){
        if(this.show){
            this.renderer.render(device, origin, pos, show_translation);
        }
    }
}

