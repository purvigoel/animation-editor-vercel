import {camera, setCameraMatrix} from "./camera.js";
import {createAllShaders} from "./shaders.js";

export class ActorRenderer{
    constructor(gl, body){ 
        this.program = null;
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

        this.initialize_shader_program(gl);
        this.initialize_buffers(gl)
    }

    initialize_shader_program(gl){
        const program = createAllShaders(gl);
        this.program = program;
    }

    initialize_buffers(gl){
        this.positionBuffer = gl.createBuffer();
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
        this.uniformArrayLocation = gl.getUniformLocation(this.program, 'u_uniformArray');

        this.translationArrayLocation = gl.getUniformLocation(this.program, 'u_transArray');
    }

    load_buffers(gl, A_matrix, trans_matrix){
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
        gl.uniform1fv(this.translationArrayLocation, trans_matrix);
    }
    
    drawTris(gl){
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.lineIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.faceInds, gl.STATIC_DRAW);

        gl.drawElements(gl.TRIANGLES, this.faceInds.length, gl.UNSIGNED_SHORT, 0);
    }

    render(gl, A_matrix, trans_matrix){
        // Data structure: SceneGraph tree (depth first traversal of tree, convert local->global transform, 
        // draw when you find a drawable mesh geom)
        gl.useProgram(this.program);
        this.load_buffers(gl, A_matrix, trans_matrix); // TODO: dont copy these every time, only copy A_matrix
        setCameraMatrix(gl, this.program);
        this.drawTris( gl);
    }
}