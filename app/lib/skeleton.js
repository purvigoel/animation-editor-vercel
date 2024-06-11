export class Skeleton {
    constructor (curr_joints, total_frames, mesh, A, J, from_rot){
        this.np_arr = null; 
        this.joints = null;
        this.mesh = mesh.arraySync();
        this.A = A.arraySync();
        this.J = J.arraySync();
        this.from_rot = from_rot;
        this.total_frames = total_frames;
        this.num_joints = -1;
        this.kinematic_tree = [ [0, 2], [0, 1], [0, 3], [2, 5], [5, 8], [8, 11], [1, 4], [4, 7], [7, 10], [3, 6], [6, 9], [9, 12], [12, 15],
    [9, 13], [13,16], [16, 18], [18,20], [9, 14], [14,17], [17,19],[19,21]];
        //this.curr_joints = curr_joints;
    }

    get_joints(){
        return this.joints;
    }

    async init_skel(){
        try {
            console.log("init skel", this.from_rot)
            
            //let promise_arr = this.curr_joints.dataSync();
            this.num_joints = 24;
            //this.joints = await this.convert_np_to_skele({"data": promise_arr});
            console.log("init")
        
        } catch (error) {
            console.error("Error initializing skel", error);
        }
    }

    async update_skel(curr_joints){
        this.curr_joints = curr_joints;
        let promise_arr = this.curr_joints.dataSync();
        this.joints = await this.convert_np_to_skele({"data": promise_arr});
    }

    async update_skel_skinning(A_matrix, J){
        this.A = A_matrix.arraySync();
        this.J = J.arraySync();
    }

    async convert_np_to_skele(promise_arr){
        try {
            
            const result = await this.conversion_helper(promise_arr);
            return result;
        } catch (error) {
            console.error("Error converting np to skeleton", error);
        }
    }

    async conversion_helper(arr){
        let all_joints = [];
        for(var fr = 0; fr < this.total_frames; fr++){
            let joints = [];
            for(var i = 0; i < this.kinematic_tree.length; i++){
                let start_joint = this.kinematic_tree[i][0];
                let end_joint = this.kinematic_tree[i][1];

                joints.push( arr.data[fr * (this.num_joints * 3) + start_joint * 3] );
                joints.push( arr.data[fr * (this.num_joints * 3)  + start_joint * 3 + 1] );
                joints.push( arr.data[fr * (this.num_joints * 3)  + start_joint * 3 + 2] );

                joints.push( arr.data[fr * (this.num_joints * 3)  + end_joint * 3] );
                joints.push( arr.data[fr * (this.num_joints * 3)  + end_joint * 3 + 1] );
                joints.push( arr.data[fr * (this.num_joints * 3)  + end_joint * 3 + 2] );
            }
            all_joints.push(joints)
        }
        return all_joints;
        
    }

    async conversion_helper_array(arr){
        let all_joints = [];
        for(var fr = 0; fr < this.total_frames; fr++){
            let joints = [];
            for(var i = 0; i < this.kinematic_tree.length; i++){
                let start_joint = this.kinematic_tree[i][0];
                let end_joint = this.kinematic_tree[i][1];

                joints.push( arr.data[fr][start_joint][0] );
                joints.push( arr.data[fr][start_joint][1] );
                joints.push( arr.data[fr][start_joint][2] );

                joints.push( arr.data[fr ][ end_joint][0] );
                joints.push( arr.data[fr ][end_joint][ 1] );
                joints.push( arr.data[fr ][end_joint ][ 2] );
            }
            all_joints.push(joints)
        }
        return all_joints;  
    }


}