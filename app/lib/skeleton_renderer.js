import { getViewMatrix, getCameraMatrix, setCameraMatrix } from "./camera.js";
import {m4} from "./m4.js";

export class SkeletonRenderer {
    constructor(gl, total_frames, actor){
        this.gl = gl;
        this.total_frames = total_frames;
        this.num_joints = actor.skeleton.num_joints;
        this.joint_program = null;
        this.skel_program = null;
        this.joint_buffer = [];
        this.joint_pos = [];
        this.position_buffer = null;
        this.index_buffer = null;

        this.sphere = this.createSphere(0.025, 16, 16);
        
        this.kinematic_tree = [ [0, 2], [0, 1], [0, 3], [2, 5], [5, 8], [8, 11], [1, 4], [4, 7], [7, 10], [3, 6], [6, 9], [9, 12], [12, 15],
        [9, 13], [13,16], [16, 18], [18,20], [9, 14], [14,17], [17,19],[19,21]];
        this.joints_to_buffer(actor.skeleton.curr_joints.arraySync());
        this.initializeShaderProgram(gl);
        this.initializeBuffers(gl);

        
    }

    initializeShaderProgram(gl){
        const vertexShaderSource = `
        attribute vec2 a_position;
        uniform mat4 u_matrix;

        void main() {
            gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
        }
        `;

        const fragmentShaderSource = `
            precision mediump float;

            void main() {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
        `;

        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        this.joint_program = this.createProgram(gl, vertexShader, fragmentShader);

        const skel_vertexShaderSource = `
        attribute vec3 a_position;
        uniform mat4 u_matrix;

        void main() {
            gl_Position = u_matrix * vec4(a_position, 1.0);
        }
        `;

        const skel_fragmentShaderSource = `
            precision mediump float;

            void main() {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
        `;

        const skel_vertexShader = this.createShader(gl, gl.VERTEX_SHADER, skel_vertexShaderSource);
        const skel_fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, skel_fragmentShaderSource);
        this.skel_program = this.createProgram(gl, skel_vertexShader, skel_fragmentShader);
    }

    createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
            return null;
        }
        return program;
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
        this.joint_buffer = all_joints;
        this.joint_pos = joint_array;
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
    

    initializeBuffers(gl){
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.joint_buffer[0]), gl.STATIC_DRAW);


        this.sphereBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sphereBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.sphere.positions, gl.STATIC_DRAW);

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.sphere.indices, gl.STATIC_DRAW);

    }

    render(gl, time){
        gl.useProgram(this.skel_program);
        const skel_positionLocation = gl.getAttribLocation(this.skel_program, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.joint_buffer[time]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(skel_positionLocation);
        gl.vertexAttribPointer(skel_positionLocation, 3, gl.FLOAT, false, 0, 0);

        setCameraMatrix(gl, this.skel_program);
        gl.drawArrays(gl.LINES, 0, this.joint_buffer[0].length / 3);

        
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
            
            
            gl.drawElements(gl.TRIANGLES, this.sphere.indices.length,  gl.UNSIGNED_SHORT, 0);
        }

    }

}


