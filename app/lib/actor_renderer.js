import {camera, cameraBuffer, setCameraMatrix} from "./camera.js";
import {createAllShaders} from "./shaders.js";

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
        this.cameraBuffer = null;
        this.bindGroup = null;

        this.initialize_shader_pipeline(device);
        this.initialize_buffers(device)
    }

    initialize_shader_pipeline(device){
        this.pipeline = createAllShaders(device);
    }

    initialize_buffers(device){
        /*this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        const positionLocation = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        this.positionLocation = positionLocation;

        this.boneIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.boneIndexBuffer);
        const boneIndexLocation = gl.getAttribLocation(this.program, 'a_JOINTS');
        gl.enableVertexAttribArray(boneIndexLocation);
        gl.vertexAttribPointer(boneIndexLocation, 4, gl.FLOAT, false, 0, 0);
        this.boneIndexLocation = boneIndexLocation;

        this.boneWeightBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.boneWeightBuffer);
        const boneWeightLocation = gl.getAttribLocation(this.program, 'a_WEIGHTS');
        gl.enableVertexAttribArray(boneWeightLocation);
        gl.vertexAttribPointer(boneWeightLocation, 4, gl.FLOAT, false, 0, 0);
        this.boneWeightLocation = boneWeightLocation;

        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        const normalLocation = gl.getAttribLocation(this.program, 'a_normal');
        gl.enableVertexAttribArray(normalLocation);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
        this.normalLocation = normalLocation;
       
        this.lineIndexBuffer = gl.createBuffer();
        this.uniformArrayLocation = gl.getUniformLocation(this.program, 'u_uniformArray');*/

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

        this.cameraBuffer = device.createBuffer ({
            label: "uniform camera buffer",
            size: ( 4 * 4 ) * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.uniformArrayLocation = device.createBuffer({
            label : "Uniform Array Buffer",
            size : 384 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.bindGroup = device.createBindGroup({
            layout : this.pipeline.getBindGroupLayout(0),
            entries : [{
                binding : 0,
                resource: {buffer: cameraBuffer}
            }, {
                binding: 1,
                resource: {buffer: this.uniformArrayLocation}
            }]
        })


    }

    /*load_buffers(gl, A_matrix){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positions), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.boneIndexBuffer);
        gl.enableVertexAttribArray(this.boneIndexLocation);
        gl.vertexAttribPointer(this.boneIndexLocation, 4, gl.FLOAT, false, 0, 0);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.boneInds), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.boneWeightBuffer);
        gl.enableVertexAttribArray(this.boneWeightLocation);
        gl.vertexAttribPointer(this.boneWeightLocation, 4, gl.FLOAT, false, 0, 0);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.boneWeights), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.enableVertexAttribArray(this.normalLocation);
        gl.vertexAttribPointer(this.normalLocation, 3, gl.FLOAT, false, 0, 0);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);

        gl.uniform1fv(this.uniformArrayLocation, A_matrix);
    }*/
    
    drawTris(gl){
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.lineIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.faceInds, gl.STATIC_DRAW);

        gl.drawElements(gl.TRIANGLES, this.faceInds.length, gl.UNSIGNED_SHORT, 0);
    }

    render(device, pass, canvas, A_matrix){
        // Data structure: SceneGraph tree (depth first traversal of tree, convert local->global transform, 
        // draw when you find a drawable mesh geom)
        // console.log("Rendering actor.");
        //setCameraMatrix(device, canvas, this.cameraBuffer);

        //this.load_buffers(gl, A_matrix); // TODO: dont copy these every time, only copy A_matrix
        device.queue.writeBuffer (this.uniformArrayLocation, 0, A_matrix);
        pass.setPipeline(this.pipeline);
        pass.setVertexBuffer(0, this.positionBuffer);
        pass.setVertexBuffer(1, this.boneIndexBuffer);
        pass.setVertexBuffer(2, this.boneWeightBuffer);
        pass.setVertexBuffer(3, this.normalBuffer);
        pass.setIndexBuffer (this.lineIndexBuffer, "uint16");
        pass.setBindGroup(0, this.bindGroup);
        pass.drawIndexed(this.faceInds.length);

    }
}