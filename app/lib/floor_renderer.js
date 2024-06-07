import {setCameraMatrix} from "./camera.js";

export class FloorRenderer {
    constructor(gl){
        this.program = null;
        this.positionBuffer = null;
        this.normalBuffer = null;

        this.initialize_shader_program(gl);
        this.initialize_buffers(gl);
    }
    
    initialize_shader_program(gl) {
        const vertexShaderSource = `
            attribute vec3 a_position2;
            attribute vec3 a_normal;
            uniform mat4 u_matrix;
            varying vec3 vNormal;
            varying vec3 vPosition;

            void main() {
                vNormal = a_normal;
                vPosition = (u_matrix * vec4(a_position2, 1.0)).xyz;
                gl_Position = u_matrix * vec4(a_position2, 1.0);
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            varying vec3 vNormal;
            varying vec3 vPosition;

            void main() {
                vec3 vLightPosition = vec3(0.0, 3.0, 0.0);
        
                vec3 norm = normalize(vNormal);
                vec3 lightDir = normalize(vLightPosition - vPosition);

                float diff = max(dot(norm, lightDir), 0.0);
                vec3 diffuse = diff * vec3(0.8, 0.8, 0.8);
                vec3 ambient = vec3(0.2, 0.2, 0.2);
                gl_FragColor = vec4(ambient + diffuse, 1.0);
            }
        `;

        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        this.program = this.createProgram(gl, vertexShader, fragmentShader);
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

    initialize_buffers(gl) {
        const positions = new Float32Array([
            -100, -1.1, -100,
             100, -1.1, -100,
            -100, -1.1,  100,
             100, -1.1,  100,
        ]);

        const normals = new Float32Array([
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
        ]);

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
    }

    render(gl) {
        gl.useProgram(this.program);

        const positionLocation = gl.getAttribLocation(this.program, 'a_position2');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        const normalLocation = gl.getAttribLocation(this.program, 'a_normal');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.enableVertexAttribArray(normalLocation);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

        setCameraMatrix(gl, this.program);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

} 