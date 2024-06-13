import {SMPL} from "./SMPL.js";
import {Skeleton} from "./skeleton.js";
import {ActorRenderer} from "./actor_renderer.js";
import {SkeletonRenderer} from "./skeleton_renderer.js";

export class Actor {
    constructor(tot_frames, gl){
        this.smpl = null;
        this.skeleton = null;
        this.template_positions = null;
        this.template_faces = null;
        this.template_normals = null;
        this.bone_weights = null;
        this.bone_indices = null;
        this.tot_frames = tot_frames;
        this.gl = gl;
        this.actorRenderer = null; //new ActorRenderer(gl, this);
        this.skeletonRenderer = null; //new SkeletonRenderer(gl, tot_frames, this);
       
    }

    async init(){
        let smpl = new SMPL();
        await smpl.init_smpl();

        let [joints, mesh, A, T] = await smpl.forward();

        let skel = new Skeleton(joints, this.tot_frames, mesh, A, joints, true);
        await skel.init_skel();

        this.smpl = smpl;
        this.skeleton = skel;

        this.template_positions = new Float32Array( this.skeleton.mesh[0].flat());
        this.template_faces = new Uint16Array(this.smpl.faces.arraySync().flat());
        this.template_normals = this.calculateNormals(this.smpl.v_template.arraySync().flat(), this.smpl.faces.arraySync().flat());
        this.bone_weights = null;
        this.bone_indices = null;
        [this.bone_indices, this.bone_weights] = this.get_bone_indices();

        this.actorRenderer = new ActorRenderer(this.gl, this);
        this.skeletonRenderer = new SkeletonRenderer(this.gl, this.tot_frames, this);
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
        return [inds, bone_weights];
    }

    get_skel_at_time(time){
        return this.skeleton.A[time].flat();
    }

    get_joints_at_time(time){
        return this.skeleton.J[time];
    }

    get_keyframe_at_time(time){
        return this.smpl.full_pose[0][time];
    }

    set_keyframe_at_time(time, keyframe){
        this.smpl.full_pose[0][time] = keyframe.arraySync();
    }

    async update_all_poses(){
        console.log("updating poses")
        let [joints, A] = await this.smpl.forward_interpolated();
        this.skeleton.update_skel_skinning(A, joints);
        console.log("done updating poses")
    }

    async update_pose(frame, rotmat, joint){
        let [joints, A] = await this.smpl.update_pose_skinning(frame, rotmat, joint);
        this.skeleton.update_skel_skinning(A, joints);
        var J_matrix = this.get_joints_at_time(frame);
        await this.skeletonRenderer.update_joints(J_matrix, frame);
        
    }
}

