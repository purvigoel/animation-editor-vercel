import { getViewMatrix, cameraBuffer, getCameraMatrix, setCameraMatrix } from "./camera.js";
import {m4} from "./m4.js";
import { Clickable } from "./clickable.js";
import {click_id} from "./mouse_handler.js";

const matrixSize = 4 * 4;
const numInstances = 24;

export class SkeletonRenderer {
    constructor(gl, total_frames, actor){
        this.gl = gl;
        this.total_frames = total_frames;
        this.num_joints = actor.skeleton.num_joints;
        this.joint_program = null;
        this.skel_program = null;
        this.jointBuffer = [];
        this.joint_pos = [];
        this.positionBuffer = null;
        this.indexBuffer = null;
        this.actor = actor;

        this.sphere = this.createSphere(0.025, 16, 16);
        this.is_clickable = true;
        this.clickables = [];
    
        this.jointTransformsData = new Float32Array (matrixSize * numInstances);
        this.jointHoveredData = new Int32Array (numInstances);
        this.jointTransformsBuffer = null;

        this.linePipeline = null;
        this.spherePipeline = null;
        
        this.kinematic_tree = [ [0, 2], [0, 1], [0, 3], [2, 5], [5, 8], [8, 11], [1, 4], [4, 7], [7, 10], [3, 6], [6, 9], [9, 12], [12, 15],
        [9, 13], [13,16], [16, 18], [18,20], [9, 14], [14,17], [17,19],[19,21]];
        this.joints_to_buffer(actor.smpl.curr_joints.arraySync());
        this.initializeShaderProgram(gl);
        this.initializeBuffers(gl);
    }

    getClickables() {
        return this.clickables;
    }

    initializeShaderProgram(device){
        const lineShaderModule = device.createShaderModule ( {
            label : "Skeleton line shader",
            code:
            `
                @group(0) @binding(0) var<uniform> u_matrix : mat4x4f;
                @vertex
                fn vertexMain(@location(0) pos: vec3f) ->
                    @builtin(position) vec4f {
                    return u_matrix * vec4(pos, 1);
                }
                

                @fragment
                fn fragmentMain() -> @location(0) vec4f {
                    return vec4f (0, 0, 0, 1);
                    /*if (is_hovered) {
                        return vec4f (1, 1, 0, 1);
                    } else {
                        return vec4f (0, 0, 0, 1);
                    }*/
        
                }
            `
        }
        );

        const jointShaderModule = device.createShaderModule ( {
            label : "Skeleton joint shader",
            code:
            `   struct VertexOutput {
                    @builtin(position) vPosition : vec4f,
                    @location(0) @interpolate(flat) isHovered : u32
                }

                @group(0) @binding(0) var<uniform> u_jointTransforms : array<mat4x4f, 24>;
                @group(0) @binding(1) var<uniform> u_isHovered : array<vec4u, 6>;
                @vertex
                fn vertexMain(@builtin(instance_index) instanceIdx : u32,
                            @location(0) pos: vec3f) -> VertexOutput {
                    var output : VertexOutput;
                    output.vPosition =  u_jointTransforms[instanceIdx] * vec4(pos, 1);
                    output.isHovered = u_isHovered[instanceIdx/4 ][instanceIdx % 4];
                    return output;
                }

                @fragment
                fn fragmentMain(@location(0) @interpolate(flat) isHovered : u32) -> @location(0) vec4f {
                    if (isHovered == 1) {
                        return vec4f (1, 1, 0, 1);
                    } else {
                        return vec4f (0, 0, 0, 1);
                    }
        
                }
            `
        }
        );

        /*this.cameraBindGroupLayout = device.createBindGroupLayout({
            entries : [{
                binding : 0,
                visibility : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {}
            }]
        });

        this.jointTransformsBindGroupLayout = device.createBindGroupLayout({
            entries : [{
                binding : 0,
                visibility : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {}
            }]
        });*/

        /*this.pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [this.cameraBindGroupLayout]
        });*/

        this.linePipeline = device.createRenderPipeline({
            label : "Skeleton Pipeline (Lines)",
            layout : "auto",
            vertex: {
                module: lineShaderModule,
                entryPoint : "vertexMain",
                buffers: [
                    // Position Buffer
                    {
                        arrayStride: 3 * 4,
                        attributes: [{
                        format: "float32x3",
                        offset: 0,
                        shaderLocation: 0, // Position, see vertex shader
                        }],
                    }
                ]
            },
            fragment: {
                module: lineShaderModule,
                entryPoint: "fragmentMain",
                targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat()
                }]
            },
            primitive: {
                topology: "line-list"
            },
            depthStencil: {
                depthWriteEnabled: false,
                depthCompare: "always",
                format: "depth24plus"
            },
            multisample: {
                count: 4,
            }
        });

        this.spherePipeline = device.createRenderPipeline({
            label : "Skeleton Pipeline (Spheres)",
            layout : "auto",
            vertex: {
                module: jointShaderModule,
                entryPoint : "vertexMain",
                buffers: [
                    // Position Buffer
                    {
                        arrayStride: 3 * 4,
                        attributes: [{
                        format: "float32x3",
                        offset: 0,
                        shaderLocation: 0, // Position, see vertex shader
                        }],
                    }
                ]
            },
            fragment: {
                module: jointShaderModule,
                entryPoint: "fragmentMain",
                targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat()
                }]
            },
            depthStencil: {
                depthWriteEnabled: false,
                depthCompare: "always",
                format: "depth24plus"
            },
            multisample: {
                count: 4,
            }
        });
    }


    joints_to_buffer(joint_array){
        let all_joints = [];
        for(var fr = 0; fr < this.total_frames; fr++){
            let joints = [];
            for(var i = 0; i < this.kinematic_tree.length; i++){
                let start_joint = this.kinematic_tree[i][0];
                let end_joint = this.kinematic_tree[i][1];

                joints.push( joint_array[fr][start_joint][0] );
                joints.push( joint_array[fr][start_joint][1] );
                joints.push( joint_array[fr][start_joint][2] );

                joints.push( joint_array[fr][end_joint][0] );
                joints.push( joint_array[fr][end_joint][1] );
                joints.push( joint_array[fr][end_joint][2] );
            }
            all_joints.push(joints)
        }
        this.jointBuffer = all_joints;
        this.joint_pos = joint_array;
    }

    async update_joints(joint_array, curr_time){
        let fr = curr_time;
        let joints = [];
        for(var i = 0; i < this.kinematic_tree.length; i++){
            let start_joint = this.kinematic_tree[i][0];
            let end_joint = this.kinematic_tree[i][1];

            joints.push( joint_array[start_joint][0] );
            joints.push( joint_array[start_joint][1] );
            joints.push( joint_array[start_joint][2] );

            joints.push( joint_array[end_joint][0] );
            joints.push( joint_array[end_joint][1] );
            joints.push( joint_array[end_joint][2] );
        }
        this.jointBuffer[fr] = joints;
        this.joint_pos[fr] = joint_array;
    }

    async update_joints_all(){
        this.joints_to_buffer(this.actor.smpl.curr_joints.arraySync());
     }

    createSphere(radius, latitudeBands, longitudeBands) {
        const positions = [];
        const colors = [];
        const indices = [];
    
        for (let latNumber = 0; latNumber <= latitudeBands; latNumber++) {
            const theta = latNumber * Math.PI / latitudeBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
    
            for (let longNumber = 0; longNumber <= longitudeBands; longNumber++) {
                const phi = longNumber * 2 * Math.PI / longitudeBands;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
    
                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;
                const u = 1 - (longNumber / longitudeBands);
                const v = 1 - (latNumber / latitudeBands);
    
                positions.push(radius * x);
                positions.push(radius * y);
                positions.push(radius * z);
    
                colors.push(u, v, 0.5, 1.0);
            }
        }
    
        for (let latNumber = 0; latNumber < latitudeBands; latNumber++) {
            for (let longNumber = 0; longNumber < longitudeBands; longNumber++) {
                const first = (latNumber * (longitudeBands + 1)) + longNumber;
                const second = first + longitudeBands + 1;
    
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }
    
        return {
            positions: new Float32Array(positions),
            colors: new Float32Array(colors),
            indices: new Uint16Array(indices),
        };
    }
    

    initializeBuffers(device){
        var positions = new Float32Array(this.jointBuffer[0]);
        this.positionBuffer = device.createBuffer({
            label: "Skeleton positions",
            size: positions.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });

        device.queue.writeBuffer (this.positionBuffer, 0, positions);

        this.sphereBuffer = device.createBuffer({
            label: "Sphere positions",
            size: this.sphere.positions.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        })

        device.queue.writeBuffer (this.sphereBuffer, 0, this.sphere.positions);

        // Index Buffer for sphere
        this.index_buffer = device.createBuffer({
            label : "Sphere Index Buffer",
            size: this.sphere.indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        });

        device.queue.writeBuffer (this.index_buffer, 0, this.sphere.indices);

        for (let i = 0; i < 24; i ++) {
            this.clickables.push(new Clickable([-100, -100, -100], 0.025, i, device, this.actor));
        }

        this.lineBindGroup = device.createBindGroup({
            layout : this.linePipeline.getBindGroupLayout(0),
            entries : [{
                binding : 0,
                resource: {buffer: cameraBuffer}
            }]
        })

        this.jointTransformsBuffer = device.createBuffer({
            label: "Joint transforms",
            size: this.jointTransformsData.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.jointHoveredBuffer = device.createBuffer({
            label: "Joint transforms",
            size: this.jointHoveredData.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        

        this.sphereBindGroup = device.createBindGroup({
            layout : this.spherePipeline.getBindGroupLayout(0),
            entries : [{
                binding : 0,
                resource: {buffer : this.jointTransformsBuffer}
            }, {
                binding : 1,
                resource: {buffer : this.jointHoveredBuffer}
            }]
        })
    }

    updateJointTransforms (time, canvas) {
        const camMat = getCameraMatrix(canvas);
        for (let i = 0; i < this.joint_pos[time].length; i++) {
            //console.log("i: %d\n", i);
            const modelMatrix = m4.translation(this.joint_pos[time][i][0], this.joint_pos[time][i][1], this.joint_pos[time][i][2]);
            const mvpMatrix = m4.multiply(camMat, modelMatrix); 
            //console.log("offset: %d\n", matrixSize * i);
            this.jointTransformsData.set(mvpMatrix, matrixSize * i);
            this.clickables[i].origin[0] = this.joint_pos[time][i][0];
            this.clickables[i].origin[1] = this.joint_pos[time][i][1];
            this.clickables[i].origin[2] =  this.joint_pos[time][i][2];

            if(this.clickables[i].isHovered || this.clickables[i].isClicked){
                this.jointHoveredData[i] = 1;
            } else {
                this.jointHoveredData[i] = 0;
            }
        }
    }

    render(device, pass, canvas, time) {
        pass.setPipeline(this.linePipeline);
        device.queue.writeBuffer (this.positionBuffer, 0, new Float32Array(this.jointBuffer[time])); 
        pass.setVertexBuffer(0, this.positionBuffer);
        pass.setBindGroup(0, this.lineBindGroup);
        //device.queue.writeBuffer(this.cameraBuffer, 0, new Float32Array(camMat));
        // pass.setVertexBuffer(1, this.normalBuffer);
        
        pass.draw (this.jointBuffer[0].length/3);

        // Draws the joints (spheres)

        pass.setPipeline(this.spherePipeline);
        pass.setBindGroup (0, this.sphereBindGroup);
        pass.setVertexBuffer(0, this.sphereBuffer);
        pass.setIndexBuffer(this.index_buffer, "uint16");

        this.updateJointTransforms (time, canvas);
        device.queue.writeBuffer(this.jointTransformsBuffer, 0, this.jointTransformsData);
        device.queue.writeBuffer(this.jointHoveredBuffer, 0, this.jointHoveredData);
        pass.drawIndexed(this.sphere.indices.length, numInstances);
        /*for (let i = 0; i < this.joint_pos[time].length; i++) {
            //console.log("i: %d\n", i);
            const modelMatrix = m4.translation(this.joint_pos[time][i][0], this.joint_pos[time][i][1], this.joint_pos[time][i][2]);
            const mvpMatrix = m4.multiply(camMat, modelMatrix); 
            //device.queue.writeBuffer (this.cameraBuffer, 0, new Float32Array(mvpMatrix));
            this.clickables[i].origin[0] = this.joint_pos[time][i][0];
            this.clickables[i].origin[1] = this.joint_pos[time][i][1];
            this.clickables[i].origin[2] =  this.joint_pos[time][i][2];
            pass.drawIndexed(this.sphere.indices.length);
        }*/

        

        /*gl.useProgram(this.skel_program);
        const skel_positionLocation = gl.getAttribLocation(this.skel_program, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.jointBuffer[time]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(skel_positionLocation);
        gl.vertexAttribPointer(skel_positionLocation, 3, gl.FLOAT, false, 0, 0);

        setCameraMatrix(gl, this.skel_program);
        gl.drawArrays(gl.LINES, 0, this.jointBuffer[0].length / 3);

        
        const camMat = getCameraMatrix(gl)
        const positionLocation = gl.getAttribLocation(this.skel_program, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sphereBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);


        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.sphere.indices, gl.STATIC_DRAW);
        
        for (let i = 0; i < this.joint_pos[time].length; i ++) {
            const modelMatrix = m4.translation(this.joint_pos[time][i][0], this.joint_pos[time][i][1], this.joint_pos[time][i][2]);
            const mvpMatrix = m4.multiply(camMat, modelMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(this.skel_program, 'u_matrix'), false, mvpMatrix);
            this.clickables[i].origin[0] = this.joint_pos[time][i][0];
            this.clickables[i].origin[1] = this.joint_pos[time][i][1];
            this.clickables[i].origin[2] =  this.joint_pos[time][i][2];
            
            if(this.clickables[i].isHovered || this.clickables[i].isClicked){
                gl.uniform1i(gl.getUniformLocation(this.skel_program, 'is_hovered'), 1);
            } else {
                gl.uniform1i(gl.getUniformLocation(this.skel_program, 'is_hovered'), 0);
            }
            gl.drawElements(gl.TRIANGLES, this.sphere.indices.length,  gl.UNSIGNED_SHORT, 0);
            
        }*/

        if (click_id != -1) {
            this.clickables[click_id].angleController.render(device, pass, this.joint_pos[time][click_id]);
        }

        /*for(let i = 0; i < this.joint_pos[time].length; i++){
            this.clickables[i].angleController.render(gl, this.clickables[i].origin);
        }*/
       /*console.log ("Rendering clickables");*/
        /*for (let i = 0; i < this.joint_pos[time].length; i++) {
            this.clickables[i].angleController.render(pass);
        }*/
    }

}


