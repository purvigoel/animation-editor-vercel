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
        this.global_translation = null;
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

    async forward( ){
        let full_pose = await this.n.load( "/data/identity.npy" );
        full_pose = tf.tensor(full_pose.data, full_pose.shape);
        let vertices2joints_precompute = await this.n.load("/data/identity_vertices2joints_precompute.npy")
        vertices2joints_precompute = tf.tensor(vertices2joints_precompute.data, vertices2joints_precompute.shape);

        let global_translation = await this.n.load("/data/translation.npy");
        global_translation = tf.tensor(global_translation.data, global_translation.shape);
        this.global_translation = global_translation.arraySync();

        this.full_pose = full_pose.clone().arraySync();
        let betas = tf.zeros([1, 10]);

        let mesh, T;
        [this.curr_joints, mesh, this.curr_As, this.skinned_J] = await lbs(betas, full_pose, vertices2joints_precompute, this.v_template, this.shapedirs, this.posedirs, this.J_regressor, this.parents, this.lbs_weights, false);
        this.v_shaped = mesh;
        
        let global_translation_expanded = this.global_translation;//.arraySync();
        global_translation_expanded = global_translation_expanded[0];
        global_translation_expanded = tf.tensor(global_translation_expanded, [60, 1, 3]);
        this.curr_joints = tf.add(this.curr_joints, global_translation_expanded);
        
        return [this.curr_joints, mesh, this.curr_As, this.global_translation];
    }

    async forward_interpolated( ){
        let betas = tf.zeros([1, 10]);

        let mesh, T;
        [this.curr_joints, mesh, this.curr_As, T] = await lbs_update(betas, tf.tensor(this.full_pose), this.J_regressor, this.parents, this.v_shaped, this.skinned_J)
        
        let global_translation_expanded = this.global_translation;//.arraySync();
        global_translation_expanded = global_translation_expanded[0];
        global_translation_expanded = tf.tensor(global_translation_expanded, [60, 1, 3]);
        this.curr_joints = tf.add(this.curr_joints, global_translation_expanded);

        return [this.curr_joints, this.curr_As];
    }

    async update_translation(currFrame, translate_by, coord){
        let old_global_translation = tf.tensor(this.global_translation).clone().arraySync();
        //this.global_translation = this.global_translation; //.arraySync();

        this.global_translation[0][currFrame][coord] = tf.add(this.global_translation[0][currFrame][coord], translate_by).arraySync();
        //this.global_translation = tf.tensor(this.global_translation, [1,60,3]);

        let global_translation_expanded = this.global_translation; //.arraySync();
        global_translation_expanded = global_translation_expanded[0];
        global_translation_expanded = tf.tensor(global_translation_expanded, [60, 1, 3]);

        old_global_translation = old_global_translation[0];
        old_global_translation = tf.tensor(old_global_translation, [60, 1, 3]); 

        this.curr_joints = tf.add(this.curr_joints, tf.sub(global_translation_expanded, old_global_translation ));
        
        return [this.curr_joints, this.curr_As, this.global_translation];
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

        let global_translation_expanded = this.global_translation; //.arraySync();
        global_translation_expanded = global_translation_expanded[0];
        global_translation_expanded = tf.tensor(global_translation_expanded, [60, 1, 3]);
        this.curr_joints = tf.add(this.curr_joints, global_translation_expanded);

        return this.curr_joints;
        
    }

    async update_pose_skinning(currFrame, rotmat, joint){
        let poseArray = this.full_pose;
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

        let global_translation_expanded = this.global_translation; //.arraySync();
        global_translation_expanded = global_translation_expanded[0];
        global_translation_expanded = tf.tensor(global_translation_expanded, [60, 1, 3]);
        this.curr_joints = tf.add(this.curr_joints, global_translation_expanded);

        return [this.curr_joints, this.curr_As];
        
    }
    
}

