import * as tf from '@tensorflow/tfjs';
import npyjs from "npyjs";

import {lbs, lbs_update} from "./lbs_batched.js";
import {lbs_frame} from "./lbs_frame.js";

export class SMPL{
    constructor (){
        this.J_regressor = null;
        this.v_template = null;
        this.shapedirs = null;
        this.posedirs = null;
        this.parents = null;
        this.lbs_weights = null;
        this.full_pose = null;
        this.betas = tf.zeros([1, 10]);
        this.faces = null;
        this.curr_joints = null;
        this.curr_As = null;
        this.v_shaped = null;
        this.skinned_J = null;
        this.n = new npyjs();
    }

    async init_smpl(){
        this.J_regressor =  await this.n.load("/data/J_regressor.npy");
        this.J_regressor = tf.tensor(this.J_regressor.data, [6890, 24]).transpose();

        this.v_template =  await this.n.load("/data/v_template.npy");
        this.v_template = tf.tensor(this.v_template.data, this.v_template.shape);

        this.shapedirs =  await this.n.load("/data/shapedirs.npy");
        this.shapedirs = tf.tensor(this.shapedirs.data, this.shapedirs.shape);

        this.posedirs =  await this.n.load("/data/posedirs.npy");
        this.posedirs = tf.tensor(this.posedirs.data, this.posedirs.shape);

        this.parents =  await this.n.load("/data/parents.npy");
        this.parents = tf.tensor(this.parents.data, this.parents.shape);

        this.lbs_weights =  await this.n.load("/data/lbs_weights.npy");
        this.lbs_weights = tf.tensor(this.lbs_weights.data, this.lbs_weights.shape);

        this.faces = await this.n.load("/data/faces.npy");
        this.faces = tf.tensor(this.faces.data, this.faces.shape);
        
    }

    // async forward_all(){
    //     let full_pose = await this.n.load( "/data/full_pose2.npy" );
    //     let tot_frames = full_pose.shape[1];
    //     full_pose = tf.tensor(full_pose.data, full_pose.shape);
    //     this.full_pose = full_pose.clone().arraySync();
    //     full_pose = full_pose.arraySync();

    //     let betas = tf.zeros([1, 10]);
    //     let joints_out = [];
    //     for(var i = 0; i < tot_frames; i++){
    //         let frame_pos = tf.tensor(full_pose[0][i], [ 24, 3, 3]).expandDims(0);
    //         let joints = await lbs(betas, frame_pos, this.v_template, this.shapedirs, this.posedirs, this.J_regressor, this.parents, this.lbs_weights, false);
    //         joints_out.push(joints);
    //     }
    //     joints_out = tf.stack(joints_out);
    //     return joints_out;
    // }

    async forward( ){
        let full_pose = await this.n.load( "/data/full_pose2.npy" );
        full_pose = tf.tensor(full_pose.data, full_pose.shape);
        this.full_pose = full_pose.clone().arraySync();
        console.log(this.full_pose);
        let betas = tf.zeros([1, 10]);

        let mesh, T;
        [this.curr_joints, mesh, this.curr_As, this.skinned_J] = await lbs(betas, full_pose, this.v_template, this.shapedirs, this.posedirs, this.J_regressor, this.parents, this.lbs_weights, false);
        this.v_shaped = mesh;
        return [this.curr_joints, mesh, this.curr_As, this.skinned_J];
    }

    async forward_interpolated( ){
        let betas = tf.zeros([1, 10]);

        let mesh, T;
        [this.curr_joints, mesh, this.curr_As, T] = await lbs_update(betas, tf.tensor(this.full_pose), this.J_regressor, this.parents, this.v_shaped, this.skinned_J)
            
        return [this.curr_joints, this.curr_As];
    }

    async update_pose(currFrame, rotmat, joint){
        let poseArray = this.full_pose; //.arraySync();

        let poseMat = tf.tensor(poseArray[0][currFrame][joint], [3,3]);
        let newPose = tf.matMul(poseMat, rotmat);
        
        poseArray[0][currFrame][joint] = tf.matMul(poseMat , rotmat).arraySync();
        
        this.full_pose = tf.tensor(poseArray); // this.full_pose.shape);
        this.full_pose.arraySync();
        
        let single_frame_pose = tf.tensor(poseArray[0][currFrame], [24, 3, 3]).expandDims(0);
        let frame_joints = await lbs_frame(this.betas, single_frame_pose, this.v_template, this.shapedirs, this.posedirs, this.J_regressor, this.parents, this.lbs_weights, false);
        frame_joints = frame_joints.arraySync();
        this.curr_joints = this.curr_joints.arraySync();
        this.curr_joints[currFrame] = frame_joints[0];

        this.curr_joints = tf.tensor(this.curr_joints, [60, 24, 3]);

        return this.curr_joints;
        
    }

    async update_pose_skinning(currFrame, rotmat, joint){
        let poseArray = this.full_pose;//.arraySync();
        let poseMat = tf.tensor(poseArray[0][currFrame][joint], [3,3]);
        let newPose = tf.matMul(poseMat, rotmat);
        
        poseArray[0][currFrame][joint] = tf.matMul(poseMat , rotmat).arraySync();
        
        let single_frame_pose = tf.tensor(poseArray[0][currFrame], [24, 3, 3]).expandDims(0);
        
        let [frame_joints, A] = await lbs_frame(this.betas, single_frame_pose, this.v_template, this.shapedirs, this.posedirs, this.J_regressor, this.parents, this.lbs_weights, false);
        A = A.arraySync();
        frame_joints = frame_joints.arraySync();

        this.curr_As = this.curr_As.arraySync();
        this.curr_As[currFrame] = A[0];

        this.curr_As = tf.tensor(this.curr_As, [60, 24, 4, 4]);

        this.curr_joints = this.curr_joints.arraySync();

        this.curr_joints[currFrame] = frame_joints[0];

        this.curr_joints = tf.tensor(this.curr_joints, [60, 24, 3]);

        return [this.curr_joints, this.curr_As];
        
    }
    
}

