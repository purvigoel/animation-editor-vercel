import { AngleControllerRenderer } from "./angle_controller_renderer";
import {m4} from "./m4.js";
import {vec3} from "gl-matrix";
import {angle_to_rotmat, angle_axis_rotmat} from "./angle_controller";
import * as tf from '@tensorflow/tfjs';

let axes = [ vec3.fromValues(1, 0, 0),
         vec3.fromValues (0, 1, 0),
         vec3.fromValues (0, 0, 1) ];

export class AngleControllerWidget {
    constructor(origin, gl) {
        this.origin = origin;
        this.gl = gl;
        this.show = false;
        this.renderer = new AngleControllerRenderer(this.gl);

        this.rotation_angles = [0, 0, 0];
        this.rotation_matrices = [angle_to_rotmat (0, 0),
                                  angle_to_rotmat (1, 0),
                                  angle_to_rotmat (2, 0)];


    }

    update_rotmat (axis, angle) {
        const current_rotmat = this.renderer.rotation;
        let world_axis = vec3.create();
        vec3.transformMat4(world_axis, axes[axis], current_rotmat);
        //console.log(world_axis);
        let rotmat_ = angle_axis_rotmat (world_axis, angle);
        let rotmat = rotmat_.arraySync().flat();
        console.log (rotmat);
        let rotmat_temp = [
            rotmat[0], rotmat[1], rotmat[2], 0,
            rotmat[3], rotmat[4], rotmat[5], 0,
            rotmat[6], rotmat[7], rotmat[8], 0,
            0, 0, 0, 1
        ];
        console.log (rotmat_temp);
        console.log (this.renderer.rotation);
        this.renderer.rotation = m4.multiply (rotmat_temp, this.renderer.rotation);
        console.log(this.renderer.rotation);
        return rotmat_;
    }

    /* update_rotmat (axis, angle) {
        // console.log(axis);
        this.rotation_angles[axis] += angle;
        // console.log (this.rotation_angles);
        this.rotation_matrices[axis] = angle_to_rotmat (axis, this.rotation_angles[axis]);
        
        let rotmat = tf.matMul(this.rotation_matrices[2], 
                                 tf.matMul (this.rotation_matrices[1], 
                                            this.rotation_matrices[0]));
        this.renderer.rotation = rotmat.arraySync();
        console.log (rotmat.arraySync());
        return rotmat;

    }*/ 

    render(device, origin, pos){
        // console.log ("angle_controller_widget render");
        if(this.show){
            // console.log ("this.show is true; angel controller rendering");
            this.renderer.render(device, origin, pos);
        }
    }
}

