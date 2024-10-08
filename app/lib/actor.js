import {SMPL} from "./SMPL.js";
import {Skeleton} from "./skeleton.js";
import {ActorRenderer} from "./actor_renderer.js";
import {SkeletonRenderer} from "./skeleton_renderer.js";
import { AngleControllerRenderer } from "./angle_controller_renderer";
import * as tf from '@tensorflow/tfjs';

export class Actor {
    constructor(tot_frames, device){
        this.smpl = null;
        this.skeleton = null;
        this.template_positions = null;
        this.template_faces = null;
        this.template_normals = null;
        this.bone_weights = null;
        this.bone_indices = null;
        this.tot_frames = tot_frames;
        this.device = device;
        this.actorRenderer = null; //new ActorRenderer(gl, this);
        this.skeletonRenderer = null; //new SkeletonRenderer(gl, tot_frames, this);
        this.angleControllerWidget = null;
       
    }

    async init(){
        let smpl = new SMPL(this.tot_frames);
        await smpl.init_smpl();

        let [joints, mesh, A, trans] = await smpl.forward();

        let skel = new Skeleton(joints, this.tot_frames, mesh, A, joints, trans, true);
        await skel.init_skel();

        this.smpl = smpl;
        this.skeleton = skel;

        this.template_positions = new Float32Array( this.skeleton.mesh[0].flat());
        this.template_faces = new Uint16Array(this.smpl.faces.arraySync().flat());
        this.template_normals = this.calculateNormals(this.smpl.v_template.arraySync().flat(), this.smpl.faces.arraySync().flat());
        this.bone_weights = null;
        this.bone_indices = null;
        [this.bone_indices, this.bone_weights] = this.get_bone_indices();

        this.angleControllerRenderer = new AngleControllerRenderer (this.device);
        this.actorRenderer = new ActorRenderer(this.device, this);
        this.skeletonRenderer = new SkeletonRenderer(this.device, this.tot_frames, this);
    }

    calculateNormals(vertices, indices) {
        const normals = new Float32Array(vertices.length);
        for (let i = 0; i < indices.length; i += 3) {
            const v0 = indices[i] * 3;
            const v1 = indices[i + 1] * 3;
            const v2 = indices[i + 2] * 3;
    
            const p0 = [vertices[v0], vertices[v0 + 1], vertices[v0 + 2]];
            const p1 = [vertices[v1], vertices[v1 + 1], vertices[v1 + 2]];
            const p2 = [vertices[v2], vertices[v2 + 1], vertices[v2 + 2]];
    
            const edge1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
            const edge2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    
            const normal = [
                edge1[1] * edge2[2] - edge1[2] * edge2[1],
                edge1[2] * edge2[0] - edge1[0] * edge2[2],
                edge1[0] * edge2[1] - edge1[1] * edge2[0]
            ];
    
            for (let j = 0; j < 3; j++) {
                normals[v0 + j] += normal[j];
                normals[v1 + j] += normal[j];
                normals[v2 + j] += normal[j];
            }
        }
    
        for (let i = 0; i < normals.length; i += 3) {
            const length = Math.sqrt(normals[i] * normals[i] + normals[i + 1] * normals[i + 1] + normals[i + 2] * normals[i + 2]);
            normals[i] /= length;
            normals[i + 1] /= length;
            normals[i + 2] /= length;
        }
        console.log(normals.length);
        return normals;
    }



    get_bone_indices(){
        let weights = this.smpl.lbs_weights.arraySync();
        let inds = [];
        let bone_weights = [];
        console.log(this.smpl.lbs_weights.shape);
        for(let i = 0; i < 6890; i++){
            let weightSum = 0;
            for(let j = 0; j < 24; j++){
                if(weights[i][j] > 0){
                    inds.push(j);
                    bone_weights.push(weights[i][j]);
                    weightSum += weights[i][j];
                }
            }
            if (Math.abs(weightSum - 1.0) > 0.01) {
                console.warn(`Vertex ${i} weights do not sum to 1: ${weightSum}`);
            }
        }
        
        console.log(inds.length == bone_weights.length);
        return [Float32Array.from(inds), Float32Array.from(bone_weights)];
    }

    get_skel_at_time(time){
        //console.log (time);
        return [this.skeleton.A[time].flat(), this.skeleton.translation[0][time].flat()];
    }

    get_joints_at_time(time){
        return this.skeleton.J[time];
    }

    get_keyframe_at_time(time){
        return [this.smpl.full_pose[0][time], this.smpl.global_translation[0][time].flat()];
    }

    transfer_keyframes (oldTime, newTime) {
        /*this.skeleton.A[newTime] = this.skeleton.A[oldTime];
        this.skeleton.translation[0][newTime] = this.skeleton.translation[0][oldTime];
        this.skeleton.J[newTime] = this.skeleton.J[oldTime];

        this.skeletonRenderer.jointBuffer[newTime] = this.skeletonRenderer.jointBuffer[oldTime];
        this.skeletonRenderer.joint_pos[newTime] = this.skeletonRenderer.joint_pos[oldTime];*/

        console.log (this.smpl.full_pose[0][oldTime]);
        this.smpl.full_pose[0][newTime] = tf.tensor(this.smpl.full_pose[0][oldTime]).arraySync();
        console.log (this.smpl.full_pose[0][newTime]);
        this.smpl.global_translation[0][newTime] = tf.tensor(this.smpl.global_translation[0][oldTime]).arraySync();
        console.log (this.smpl.global_translation[0][newTime]);
        this.update_pose (newTime, tf.tensor([[1, 0, 0], [0, 1, 0], [0, 0, 1]]), 0);
    }

    set_keyframe_at_time(time, keyframe, trans){
        this.smpl.full_pose[0][time] = keyframe.arraySync();
        this.smpl.global_translation[0][time] = trans.arraySync();
    }

    set_keyframe_all(keyframes, trans){
        this.smpl.full_pose[0] = keyframes.arraySync();
        this.smpl.global_translation[0] = trans.arraySync();
    }

    async update_all_poses(){
        console.log("updating poses")
        let [joints, A] = await this.smpl.forward_interpolated();
        
        this.skeleton.update_skel_skinning(A, joints);

        this.skeletonRenderer.update_joints_all();
        console.log("done updating poses")
    }

    async update_pose(frame, rotmat, joint){
        let [joints, A] = await this.smpl.update_pose_skinning(frame, rotmat, joint);
        // console.log("placed", joints.arraySync()[0][20]);
        this.skeleton.update_skel_skinning(A, joints);
        var J_matrix = this.get_joints_at_time(frame);
        await this.skeletonRenderer.update_joints(J_matrix, frame);
    }

    async update_pose_ik(frame, rotmat, joint){
        let [joints, A] = await this.smpl.update_pose_skinning_ik(frame, rotmat, joint);
        //console.log("placed", joints.arraySync()[0][20]);
        this.skeleton.update_skel_skinning(A, joints);
        var J_matrix = this.get_joints_at_time(frame);
        await this.skeletonRenderer.update_joints(J_matrix, frame);
    }

    async update_trans(frame, translate_by, coord){
        let [joints, A, translation] = await this.smpl.update_translation(frame, translate_by, coord);
        
        this.skeleton.update_translation(translation);
        this.skeleton.update_skel_skinning(A, joints);
        var J_matrix = this.get_joints_at_time(frame);
        await this.skeletonRenderer.update_joints(J_matrix, frame);
    }
}

