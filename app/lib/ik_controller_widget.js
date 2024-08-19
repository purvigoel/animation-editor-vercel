import { vec3, vec4, mat3, mat4, quat } from 'gl-matrix';
import * as tf from '@tensorflow/tfjs';

export class IKControllerWidget {
    constructor(origin, gl, angleControllerRenderer, id, actor) {
        this.origin = origin;
        this.gl = gl;
        this.show = false;
        this.renderer = angleControllerRenderer;
        this.id = id;
        this.actor = actor;
        this.done_ik = 0;

        if(this.id == 20){
            this.kinematic_chain = [16, 18];
        } else if(this.id == 21){
            this.kinematic_chain = [17, 19];
        } else if (this.id == 7){
            this.kinematic_chain = [1, 4];
        } else if (this.id == 8){
            this.kinematic_chain = [2, 5];
        }
    }

    get_local_pose(currFrame, joint){
        let poseArray = this.actor.smpl.full_pose; 
        let poseMat = poseArray[0][currFrame][joint];
        poseMat = tf.tensor(poseMat, [3, 3]);
        return poseMat;
    }

    transposeMat(mat){
        let transposeMat = mat3.create();
        mat3.transpose(transposeMat, mat);
        return transposeMat;
    }

    invertQuat(quat1){
        let invQuat = quat.create();
        quat.invert(invQuat, quat1);
        return invQuat;
    }
    
    mulQuat(quat1, quat2){
        let mulQuat = quat.create();
        quat.multiply(mulQuat, quat1, quat2);
        return mulQuat;
    }

    mulMat(mat1, mat2){
        let mulMat = mat3.create();
        mat3.multiply(mulMat, mat1, mat2);
        return mulMat;
    }

    mulVec(mat, vec){
        //let mulVec = vec3.create();
        //vec3.transformMat3(mulVec, vec, mat);
        vec = tf.tensor([vec[0], vec[1], vec[2]], [3, 1]);
        let out = tf.matMul(mat, vec).arraySync();
        let mulVec_out =vec3.fromValues(out[0][0], out[1][0], out[2][0]);
        return mulVec_out;
    }

    mulVecs(vec1, vec2){
        let mulVec = vec3.create();
        vec3.multiply(mulVec, vec1, vec2);
        return mulVec;
    }

    cMulVecs(vec1, c){
        let outVec = vec3.create();
        let mulVec = vec3.fromValues(c, c, c);
        vec3.cross(outVec, vec1, mulVec);
        return outVec;
    }

    quaternion_to_matrix(quat){
        let quat_values = quat; //quat.getValues();
        let r  = quat_values[3];
        let i = quat_values[0];
        let j = quat_values[1];
        let k = quat_values[2];

        let two_s = 2 / ( r * r + i * i + j* j+ k*k);
        let a = 1 - two_s * (j * j + k * k);
        let b = two_s * (i * j - k * r);
        let c = two_s * (i * k + j * r);
        let d = two_s * (i * j + k * r);
        let e = 1 - two_s * (i * i + k * k);
        let f = two_s * (j * k - i * r);
        let g = two_s * (i * k - j * r);
        let h = two_s * (j * k + i * r)
        let i_out = 1 - two_s * (i * i + j * j);
        let mat_out = mat3.fromValues(a, b, c, d, e, f, g, h, i_out);
        return mat_out;
    }


    toQuat(vec){
        let quat_out = quat.create();
        quat.fromVec3(quat_out, vec);
        return quat_out;
    }

    axis_angle_to_quaternion(axis_angle, mag){
        let angles = vec3.create();
        vec3.normalize(angles, axis_angle);
        let quat_out = quat.create();
        quat.setAxisAngle(quat_out, angles, mag);
        return quat_out;
    }

    update_position(translate_by, axis, frame){
        if( !this.done_ik ){
            //this.done_ik += 1;
            //translate_by = 0.02;
            
            let local_joints = this.actor.get_joints_at_time(frame);
            
        
            this.origin = [local_joints[this.id][0] - local_joints[0][0], local_joints[this.id][1] - local_joints[0][1], local_joints[this.id][2] - local_joints[0][2]];
            //console.log("origin", this.origin)
            if(axis == 0){
                this.origin[0] += translate_by;
            }
            else if(axis == 1){
                this.origin[1] += translate_by;
            }
            else if(axis == 2){
                this.origin[2] += translate_by;
            }

            // a = root joint local
            let a = [local_joints[this.kinematic_chain[0]][0] - local_joints[0][0], local_joints[this.kinematic_chain[0]][1] - local_joints[0][1], local_joints[this.kinematic_chain[0]][2] - local_joints[0][2]];
            // b = mid joint local
            let b = [local_joints[this.kinematic_chain[1]][0] - local_joints[0][0], local_joints[this.kinematic_chain[1]][1] - local_joints[0][1], local_joints[this.kinematic_chain[1]][2] - local_joints[0][2]];
            // c = end effector local
            let c = [local_joints[this.id][0] - local_joints[0][0], local_joints[this.id][1] - local_joints[0][1], local_joints[this.id][2] - local_joints[0][2]];

            //console.log("curr c ",  c)
            // t = target
            let t = [this.origin[0], this.origin[1], this.origin[2]];

            //console.log("target", t)
            // eps = 0.01
            let eps = 0.01;
            // a_gr = a global rotation
            
            // a_lr = a local rotation
            let a_lr = this.get_local_pose(frame, this.kinematic_chain[0]);
            // b_lr = b local rotation
            let b_lr = this.get_local_pose(frame, this.kinematic_chain[1]);

            let root_lr = this.get_local_pose(frame, 0);
            // root inverse
            let a_gr = tf.transpose(root_lr);
            // inverse (root * hip)
            // b_gr = b global rotation
            let b_gr = tf.transpose(tf.matMul(root_lr, a_lr));

            // console.log("a", a);
            // console.log("b", b)
            // console.log("c", c)
            // console.log("target", t);
            // console.log("a_lr", a_lr.arraySync());
            // console.log("b_lr", b_lr.arraySync());
            // console.log("root_lr", root_lr.arraySync())
            // console.log("b_lr, 2", tf.matMul(root_lr, a_lr).arraySync());

            let {a_lr_mat, b_lr_mat} = this.twoJointIK(a, b, c, t, eps, a_gr, b_gr, a_lr, b_lr);
            
            a_lr_mat = tf.tensor( a_lr_mat, [3, 3]);
            b_lr_mat = tf.tensor( b_lr_mat, [3, 3]);
            //console.log("a_lr_mat", a_lr_mat.arraySync());
            // console.log("b_lr_mat", b_lr_mat.arraySync());
           

            return {success: true, a_lr_mat: a_lr_mat, b_lr_mat: b_lr_mat};
        }
        return {success: false, a_lr_mat: 0.0, b_lr_mat: 0.0};
    }

    

    mat_to_list(mat1){
        let mat_list = [];
        let counter = 0;
        for(let i = 0; i < 3; i++){
            let mini_mat_list = [];
            for(let j = 0; j < 3; j++){
                mini_mat_list.push(mat1[counter]);
                counter += 1;
            }
            mat_list.push(mini_mat_list);
        }
        return mat_list;
    }

    _sqrt_positive_part(x){
        if(x > 0){
            return Math.sqrt(x);
        }
        return 0;
    }

    _copy_sign(x, y){
        if(y >= 0){
            return x;
        }
        return -x;
    }

    mat_to_quat(mat_in){
        let mat1 = mat_in.arraySync(); //this.mat_to_list(mat_in);
        let m00 = mat1[0][0];
        let m11 = mat1[1][1];
        let m22 = mat1[2][2];

        let o0 = 0.5 * this._sqrt_positive_part(1 + m00 + m11 + m22);
        let x = 0.5 * this._sqrt_positive_part(1 + m00 - m11 - m22);
        let y = 0.5 * this._sqrt_positive_part(1 - m00 + m11 - m22);
        let z = 0.5 * this._sqrt_positive_part(1 - m00 - m11 + m22);
        let o1 = this._copy_sign(x, mat1[2][1] - mat1[1][2]);
        let o2 = this._copy_sign(y, mat1[0][2] - mat1[2][0]);
        let o3 = this._copy_sign(z, mat1[1][0] - mat1[0][1]);
        let quat_out = quat.create();
        quat.set(quat_out, o1, o2, o3, o0);
        return quat_out;
    }

    quatMult(quat1, quat2){
        let quat_values = quat1;
        let w0  = quat_values[3];
        let x0 = quat_values[0];
        let y0 = quat_values[1];
        let z0 = quat_values[2];

        quat_values = quat2;
        let w1  = quat_values[3];
        let x1 = quat_values[0];
        let y1 = quat_values[1];
        let z1 = quat_values[2];

        let w = -x1 * x0 - y1 * y0 - z1 * z0 + w1 * w0;
        let x = x1 * w0 + y1 * z0 - z1 * y0 + w1 * x0;
        let y = -x1 * z0 + y1 * w0 + z1 * x0 + w1 * y0;
        let z = x1 * y0 - y1 * x0 + z1 * w0 + w1 * z0;

        let quat_out = quat.create();
        quat.set(quat_out, x, y, z, w);
        return quat_out;
    }

    twoJointIK(a, b, c, t, eps, a_gr, b_gr, a_lr, b_lr) {
        // Calculate lengths of the segments
        const lab = vec3.length(vec3.subtract([], b, a));
        const lcb = vec3.length(vec3.subtract([], b, c));
        const lat = Math.max(eps, Math.min(vec3.length(vec3.subtract([], t, a)), lab + lcb - eps));
    
        // if(vec3.length(vec3.subtract([], t, a)) > lab + lcb - eps){
        //     console.log("rewrite target?", vec3.length(vec3.subtract([], t, a)), lab + lcb - eps, lab, lcb);
        // }

        let c_a = vec3.subtract([], c, a);
        let b_a = vec3.subtract([], b, a);
        let t_a = vec3.subtract([], t, a);
        let c_b = vec3.subtract([], c, b);
        let a_b = vec3.subtract([], a, b);
        // NOTES: need some way to include root rotation.

        let norm_c_a = vec3.create();
        vec3.normalize(norm_c_a, c_a);
        let norm_b_a = vec3.create();
        vec3.normalize(norm_b_a, b_a);
        let norm_t_a = vec3.create();
        vec3.normalize(norm_t_a, t_a);
        let norm_c_b = vec3.create();
        vec3.normalize(norm_c_b, c_b);
        let norm_a_b = vec3.create();
        vec3.normalize(norm_a_b, a_b);
        
        // Calculate initial angles between vectors
        const ac_ab_0 = Math.acos(this.clamp(vec3.dot(norm_c_a, norm_b_a), -1, 1));
        const ba_bc_0 = Math.acos(this.clamp(vec3.dot(norm_a_b, norm_c_b), -1, 1));
        const ac_at_0 = Math.acos(this.clamp(vec3.dot(norm_c_a, norm_t_a), -1, 1));
        //console.log("intermediates", norm_b_a, b_a)
        // Calculate target angles
        const ac_ab_1 = Math.acos(this.clamp((lcb * lcb - lab * lab - lat * lat) / (-2 * lab * lat), -1, 1));
        const ba_bc_1 = Math.acos(this.clamp((lat * lat - lab * lab - lcb * lcb) / (-2 * lab * lcb), -1, 1));
       
        // Calculate axes of rotation
        const axis0 = vec3.normalize([], vec3.cross([], vec3.subtract([], c, a), vec3.subtract([], b, a)));
        const axis1 = vec3.normalize([], vec3.cross([], vec3.subtract([], c, a), vec3.subtract([], t, a)));
        
        // console.log("axes", axis0, axis1)
        // console.log("a_gr", a_gr.arraySync());
        // console.log("b_gr", b_gr.arraySync());
        const r0_mulVec = this.mulVec( a_gr, axis0);
        const r1_mulVec = this.mulVec(b_gr, axis0);
        const r2_mulVec = this.mulVec(a_gr, axis1);

        // console.log("mulVecs:r0", r0_mulVec)
        // console.log("mulVecs:r1", r1_mulVec)
        // console.log("mulVecs:r2", r2_mulVec)

        const r0 = quat.setAxisAngle([], r0_mulVec, ac_ab_1 - ac_ab_0);
        const r1 = quat.setAxisAngle([], r1_mulVec, ba_bc_1 - ba_bc_0);
        const r2 = quat.setAxisAngle([], r2_mulVec, ac_at_0);
        
        // console.log("radii", ac_ab_1 - ac_ab_0, ba_bc_1 - ba_bc_0,  ac_at_0)
        // console.log("r0 quat", r0)
        // console.log("r1 quat", r1)
        // console.log("r2 quat", r2)
        
        // Apply rotations
        // let a_lr_quat = this.matrixToQuat(a_lr);
        // let b_lr_quat = this.matrixToQuat(b_lr);

        let a_lr_quat = this.mat_to_quat(a_lr);
        let b_lr_quat = this.mat_to_quat(b_lr);

        //console.log("quat before mult", a_lr_quat, b_lr_quat);
        a_lr_quat = this.quatMult(a_lr_quat, this.quatMult(r0, r2));
        b_lr_quat = this.quatMult(b_lr_quat, r1);
        
        //console.log("quats post", a_lr_quat, b_lr_quat);
        let a_lr_mat_out = this.quaternion_to_matrix(a_lr_quat) ; //this.toMat(a_lr_quat);
        let b_lr_mat_out = this.quaternion_to_matrix(b_lr_quat); //this.toMat(b_lr_quat);
        //console.log("mats", a_lr_mat_out, b_lr_mat_out)
        return {a_lr_mat: a_lr_mat_out, b_lr_mat: b_lr_mat_out};
    }
    
    // Helper function to clamp a value between min and max
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

}