import * as tf from '@tensorflow/tfjs';

export async function lbs_frame(betas, pose, v_template, shapedirs, posedirs, J_regressor, parents, lbs_weights, pose2rot = true) {
    tf.setBackend("cpu");
    const batch_size = Math.max(betas.shape[0], pose.shape[0]);

    // Add shape contribution
    let v_shaped = v_template.add(blendShapes_frame(betas, shapedirs));
    
    // // Get the joints
    let J = vertices2joints_frame(J_regressor, v_shaped);
    

    const ident = tf.eye(3);
    let rot_mats, pose_feature, pose_offsets;
        
    pose_feature = pose.slice([0, 1, 0, 0], [-1, -1, -1, -1]) - ident;
    rot_mats = pose.reshape([batch_size, -1, 3, 3]);
    
    // pose_offsets = tf.matMul(pose_feature.reshape([batch_size, -1]), posedirs).reshape([batch_size, -1, 3]);
    
    // const v_posed = pose_offsets.add(v_shaped);
  
    const [J_transformed, A] = await batchRigidTransform_frame(rot_mats, J, parents);

    return [J_transformed, A];
}

function vertices2joints_frame(J_regressor, vertices) {
    return tf.einsum('bik,ji->bjk', vertices, J_regressor);
}

function blendShapes_frame(betas, shape_disps) {
    return tf.einsum('bl,mkl->bmk', betas, shape_disps);
}

function batchRodrigues_frame(rot_vecs, epsilon = 1e-8) {
    const batch_size = rot_vecs.shape[0];
    const angle = rot_vecs.norm('euclidean', 1).add(epsilon).expandDims(1);
    const rot_dir = rot_vecs.div(angle);

    const cos = angle.cos().expandDims(1);
    const sin = angle.sin().expandDims(1);

    const [rx, ry, rz] = rot_dir.unstack(1);
    const zeros = tf.zeros([batch_size, 1]);
    const K = tf.stack([
        zeros, rz.neg(), ry,
        rz, zeros, rx.neg(),
        ry.neg(), rx, zeros
    ], 1).reshape([batch_size, 3, 3]);

    const ident = tf.eye(3).expandDims(0);
    const rot_mat = ident.add(sin.mul(K)).add(tf.matMul(K, K).mul(1 - cos));
    return rot_mat;
}

function transformMat_frame(R, t) {
    const num_frames = 1;
    const num_joints = R.shape[0];
    const shape = [num_joints, 4,4];
    
    let values = [];
    R = R.arraySync();
    t = t.arraySync();
    
    
    
    for(var joint = 0; joint < num_joints * num_frames; joint++){
        for(var i = 0; i < 3; i++){
            for (var j = 0; j < 3; j++){
                values.push(R[joint][ i][ j]);
            }
            values.push(t[joint][i]);

        }
        
        values.push(0);
        values.push(0);
        values.push(0);
        values.push(1);
    }

    return tf.tensor(values, shape);
}

async function batchRigidTransform_frame(rot_mats, joints, parents) {
    let joints_expanded = joints.clone();
    //let joints_expanded = tf.tensor(joints.dataSync(), [3, 24]).transpose();

    // Clone the tensor for further manipulation
    let tensorData = joints_expanded.arraySync();
    let rel_joints = joints_expanded.arraySync();

    // Get the parents data as a nested array
    let parentsData = parents.arraySync();

    // Get the number of joints from the original 'joints' tensor
    const num_joints = joints.shape[1];

    // Iterate through each joint starting from the second one (index 1)
    for (let j = 1; j < joints_expanded.shape[1]; j++) {
        // Calculate the relative position of the current joint to its parent joint
        let relative_joint = tensorData[0][j].map((value, index) => value - tensorData[0][parentsData[j]][index]);

        // Update the rel_joints array with the calculated relative positions
        rel_joints[0][j] = relative_joint;
    }

    // Convert rel_joints back to a tensor if needed for further TensorFlow.js operations
    let rel_joints_tensor = tf.tensor(rel_joints);

    rel_joints = rel_joints_tensor;
   
    let transforms_mat = transformMat_frame(
        rot_mats.reshape([-1, 3, 3]),
        rel_joints.reshape([-1, 3, 1])
    ).reshape([-1, num_joints, 4, 4]);
    

    const transform_chain = [transforms_mat.slice([0, 0], [-1, 1]).reshape([-1, 4, 4])];
    for (let i = 1; i < num_joints; i++) {
        const parent_index = parentsData[i];
        const curr_res = tf.matMul(transform_chain[parent_index], transforms_mat.slice([0, i], [-1, 1]).reshape([-1, 4, 4]));

        transform_chain.push(curr_res);
    }

    const transforms = tf.stack(transform_chain, 1);

    const joints_homogen = tf.pad(joints_expanded, [[0, 0], [0, 0], [0, 1]], 0).expandDims(-1);
    
    const transforms_mul_joints = tf.matMul(transforms, joints_homogen);
    
    const padded_joints = tf.pad(
        transforms_mul_joints,
        [[0,0], [0,0], [0,0], [3,0]],
        0
    );
    const rel_transforms = transforms.sub(padded_joints);

    
    const posed_joints = transforms.slice([0, 0, 0, 3], [-1, -1, 3, 1]).squeeze([3]);
    return [posed_joints, rel_transforms];
}