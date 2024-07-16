import {camera, cameraBuffer, setCameraMatrix} from "./camera.js";
import {lightBuffer, shadowDepthTextureView} from "./light.js";
import {createAllShaders} from "./shaders.js";
import {createShadowPipeline} from "./shadow_shader.js";

export let bindGroupLayout;

export class ActorRenderer{
    constructor(device, body){ 
        this.positionBuffer = null;
        this.boneIndexBuffer = null;
        this.boneWeightBuffer = null;
        this.normalBuffer = null;
        this.uniformArray = null;
        this.lineIndexBuffer = null;

        this.boneWeights = body.bone_weights;
        this.boneInds = body.bone_indices;
        this.normals = body.template_normals;
        this.positions = body.template_positions;
        this.faceInds = body.template_faces;

        this.positionLocation = null;
        this.boneIndexLocation = null;
        this.boneWeightLocation = null;
        this.normalLocation = null;

        this.pipeline = null;
        this.shadowPipeline = null;

        this.bindGroupLayout = null;
        this.bindGroup = null;

        this.initialize_shader_pipeline(device);
        this.initialize_buffers(device)
    }

    initialize_shader_pipeline(device){
        bindGroupLayout = device.createBindGroupLayout ({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: 'uniform',
                    },
                },
                {
                    binding: 1,
                    label: "Lighting",
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform',
                    },
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: 'uniform',
                    },
                },   
                {
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform',
                    },
                },           
            ]
        });

        this.pipeline = createAllShaders(device);
        this.shadowPipeline = createShadowPipeline(device);
    }

    initialize_buffers(device){

        this.positionBuffer = device.createBuffer({
            label: "Actor positions",
            size: this.positions.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });

        device.queue.writeBuffer (this.positionBuffer, 0, this.positions);

        this.boneIndexBuffer = device.createBuffer({
            label: "Actor bone indices",
            size: this.boneInds.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });

        device.queue.writeBuffer (this.boneIndexBuffer, 0, this.boneInds);

        this.boneWeightBuffer = device.createBuffer({
            label: "Actor bone weights",
            size: this.boneWeights.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });

        device.queue.writeBuffer (this.boneWeightBuffer, 0, this.boneWeights);

        this.normalBuffer = device.createBuffer({
            label: "Actor normals",
            size: this.normals.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });

        device.queue.writeBuffer (this.normalBuffer, 0, this.normals);

        this.lineIndexBuffer = device.createBuffer({
            label : "Line Index Buffer",
            size: this.faceInds.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        });

        device.queue.writeBuffer (this.lineIndexBuffer, 0, this.faceInds);

        this.uniformArrayLocation = device.createBuffer({
            label : "Uniform Array Buffer",
            size : 384 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.colorBuffer = device.createBuffer ({
            label : "Uniform color buffer",
            size: 4 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.bindGroup = device.createBindGroup({
            layout : this.pipeline.getBindGroupLayout(0),
            entries : [{
                binding : 0,
                resource: {buffer: cameraBuffer}
            }, {
                binding: 1,
                resource: {buffer: lightBuffer}
            }, {
                binding: 2,
                resource: {buffer: this.uniformArrayLocation}
            }, {
                binding: 3,
                resource: {buffer: this.colorBuffer}
            }]
        })

    }

    renderShadow(pass) {
        pass.setPipeline(this.shadowPipeline);
        pass.setVertexBuffer(0, this.positionBuffer);
        pass.setVertexBuffer(1, this.boneIndexBuffer);
        pass.setVertexBuffer(2, this.boneWeightBuffer);
        pass.setVertexBuffer(3, this.normalBuffer);
        pass.setIndexBuffer (this.lineIndexBuffer, "uint16");
        pass.setBindGroup(0, this.bindGroup);
        pass.drawIndexed(this.faceInds.length);
    }

    render(pass){
        // Data structure: SceneGraph tree (depth first traversal of tree, convert local->global transform, 
        // draw when you find a drawable mesh geom)
        // console.log("Rendering actor.");

        //this.load_buffers(gl, A_matrix); // TODO: dont copy these every time, only copy A_matrix
        pass.setPipeline(this.pipeline);
        pass.setVertexBuffer(0, this.positionBuffer);
        pass.setVertexBuffer(1, this.boneIndexBuffer);
        pass.setVertexBuffer(2, this.boneWeightBuffer);
        pass.setVertexBuffer(3, this.normalBuffer);
        pass.setIndexBuffer (this.lineIndexBuffer, "uint16");
        pass.setBindGroup(0, this.bindGroup);
        pass.drawIndexed(this.faceInds.length);

    }

    updateUniformArray (device, A_matrix) {
        device.queue.writeBuffer (this.uniformArrayLocation, 0, A_matrix);
    }
}