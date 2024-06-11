import * as tf from "@tensorflow/tfjs";
import { quat, mat3 } from 'gl-matrix';


export class InterpolationWidget{
    constructor(params){
        this.params = params;
    }

    async interpolate_between_keyframes(actor, keyframe_lo_time, keyframe_hi_time, force_refresh){
        let keyframe_lo = actor.get_keyframe_at_time(keyframe_lo_time);
        let keyframe_hi = actor.get_keyframe_at_time(keyframe_hi_time);
        
        for (let i = keyframe_lo_time; i < keyframe_hi_time; i++) {
            let alpha = (i - keyframe_lo_time) / (keyframe_hi_time - keyframe_lo_time);
            let interpolated_val = [];
    
            for (let j = 0; j < 24; j++) {
                let q_lo = keyframe_lo[j]; 
                let q_hi = keyframe_hi[j]; 
                
                q_lo = mat3.fromValues(q_lo[0][0], q_lo[0][1], q_lo[0][2], q_lo[1][0], q_lo[1][1], q_lo[1][2], q_lo[2][0], q_lo[2][1], q_lo[2][2]);
                q_hi = mat3.fromValues(q_hi[0][0], q_hi[0][1], q_hi[0][2], q_hi[1][0], q_hi[1][1], q_hi[1][2], q_hi[2][0], q_hi[2][1], q_hi[2][2]);
                let q_lo_quat = quat.create();
                let q_hi_quat = quat.create();
                quat.fromMat3(q_lo_quat, mat3.transpose([], q_lo));
                quat.fromMat3(q_hi_quat, mat3.transpose([],q_hi));

                let q_interpolated = quat.slerp([], q_lo_quat, q_hi_quat, alpha);
                let q_interpolated_mat = mat3.fromQuat([], q_interpolated);

                interpolated_val.push(tf.tensor(  mat3.transpose([], q_interpolated_mat), [3, 3]));
            }
    
            interpolated_val = tf.stack(interpolated_val)
            actor.set_keyframe_at_time(i, interpolated_val);
        }

        if(force_refresh){
            await actor.update_all_poses();
            actor.skeleton_renderer.update_joints_all();
        }
        
    }

    async interpolate_all_frames(actor){
        this.params.keyframe_inds.sort();
        for (let i = 0; i < this.params.keyframe_inds.length-1; i++) {
            console.log(this.params.keyframe_inds[i],this.params.keyframe_inds[i+1] )
            await this.interpolate_between_keyframes(actor, this.params.keyframe_inds[i], this.params.keyframe_inds[i+1], false);
        }
        await actor.update_all_poses();
        actor.skeleton_renderer.update_joints_all();
    }
}


