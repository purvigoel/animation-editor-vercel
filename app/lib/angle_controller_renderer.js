import { getCameraMatrix } from "./camera";
import {m4} from "./m4.js";

export class AngleControllerRenderer{
    constructor(gl){
        this.gl = gl;
        this.arrowProgram = null;
        this.ringProgram = null;
        this.arrowVertices = null;
        this.ringVerticesXY = null;
        this.ringVerticesYZ = null;
        this.ringVerticesXZ = null;
        this.initializeShaderProgram(this.gl);
        this.controller = this.initializeShaders(this.gl);


    }

    createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error('Shader compile failed with: ' + gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }
        return shader;
    }

    createProgram(gl, vertexShaderSource, fragmentShaderSource) {
        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          console.error('Program failed to link: ' + gl.getProgramInfoLog(program));
          gl.deleteProgram(program);
          return null;
        }
        return program;
      }

    initializeShaderProgram(gl){
        const arrowVertexShaderSource = `
        attribute vec4 a_position;
        uniform mat4 u_mvpMatrix;
        
        
        void main() {
          gl_Position = u_mvpMatrix * a_position;
        }`;  // Add your arrow vertex shader source here
        const arrowFragmentShaderSource = `
        precision mediump float;
        uniform vec4 u_color;
        void main() {
          gl_FragColor = u_color; //vec4(1.0, 0.0, 0.0, 1.0);  // Red color for arrows
        }`;  // Add your arrow fragment shader source here

        const ringVertexShaderSource = `
        attribute vec4 a_position;
        uniform mat4 u_mvpMatrix;
        
        void main() {
          gl_Position = u_mvpMatrix * a_position;
        }`;  // Add your ring vertex shader source here
        const ringFragmentShaderSource = `
        precision mediump float;

        void main() {
        gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);  // Green color for rings
        }`;  // Add your ring fragment shader source here

        this.arrowProgram = this.createProgram(gl, arrowVertexShaderSource, arrowFragmentShaderSource);
        this.ringProgram = this.createProgram(gl, ringVertexShaderSource, ringFragmentShaderSource);
      
    }

    initializeShaders(gl) {
        // Create buffers for the translation arrows
        const arrowBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, arrowBuffer);
        const arrowVertices = new Float32Array([
            // X-axis arrow (red)
            0.0, 0.0, 0.0,  1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,  0.9, 0.1, 0.0,
            1.0, 0.0, 0.0,  0.9, -0.1, 0.0,
            // Y-axis arrow (green)
            0.0, 0.0, 0.0,  0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,  0.1, 0.9, 0.0,
            0.0, 1.0, 0.0,  -0.1, 0.9, 0.0,
            // Z-axis arrow (blue)
            0.0, 0.0, 0.0,  0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,  0.0, 0.1, 0.9,
            0.0, 0.0, 1.0,  0.0, -0.1, 0.9,
          ]);
        gl.bufferData(gl.ARRAY_BUFFER, arrowVertices, gl.STATIC_DRAW);
        this.arrowVertices = arrowVertices;
        
        const createRingVertices = (radius, segments, plane) => {
            const vertices = [];
            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * 2 * Math.PI;
                if (plane === 'XY') {
                    vertices.push(radius * Math.cos(theta), radius * Math.sin(theta), 0.0);
                } else if (plane === 'YZ') {
                    vertices.push(0.0, radius * Math.cos(theta), radius * Math.sin(theta));
                } else if (plane === 'XZ') {
                    vertices.push(radius * Math.cos(theta), 0.0, radius * Math.sin(theta));
                }
            }
            return new Float32Array(vertices);
        };
        
        const ringVerticesXY = createRingVertices(1.0, 36, 'XY');
        const ringVerticesYZ = createRingVertices(1.0, 36, 'YZ');
        const ringVerticesXZ = createRingVertices(1.0, 36, 'XZ');

        const ringBufferXY = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ringBufferXY);
        gl.bufferData(gl.ARRAY_BUFFER, ringVerticesXY, gl.STATIC_DRAW);

        const ringBufferYZ = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ringBufferYZ);
        gl.bufferData(gl.ARRAY_BUFFER, ringVerticesYZ, gl.STATIC_DRAW);

        const ringBufferXZ = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ringBufferXZ);
        gl.bufferData(gl.ARRAY_BUFFER, ringVerticesXZ, gl.STATIC_DRAW);

        this.ringVerticesXY = ringVerticesXY;
        this.ringVerticesYZ = ringVerticesYZ;
        this.ringVerticesXZ = ringVerticesXZ;

        return {
            arrowBuffer,
            ringBufferXY,
            ringBufferYZ,
                ringBufferXZ,
            };
    }

    render(gl, joint_location) {
        const { arrowBuffer, ringBufferXY, ringBufferYZ, ringBufferXZ } = this.controller;
        let cameraMatrix = getCameraMatrix(gl);

        // Arrow Rendering
        gl.useProgram(this.arrowProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, arrowBuffer);
        const positionLocation = gl.getAttribLocation(this.arrowProgram, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        
        const colors = [
            [1.0, 0.0, 0.0, 1.0], // Red
            [0.0, 1.0, 0.0, 1.0], // Green
            [0.0, 0.0, 1.0, 1.0]  // Blue
        ];

        for (let i = 0; i < 3; i++) {
            let modelMatrix = m4.create();
            let scaleMatrix = m4.create();

            modelMatrix = m4.translate(scaleMatrix, scaleMatrix, joint_location);
            scaleMatrix = m4.scale(scaleMatrix, modelMatrix, [0.5, 0.5, 0.5]);

            const mvpMatrix = m4.multiply(cameraMatrix, scaleMatrix);
            const mvpMatrixLocation = gl.getUniformLocation(this.arrowProgram, 'u_mvpMatrix');
            gl.uniformMatrix4fv(mvpMatrixLocation, false, mvpMatrix);

            const colorLocation = gl.getUniformLocation(this.arrowProgram, 'u_color');
            gl.uniform4fv(colorLocation, colors[i]);

            gl.drawArrays(gl.LINES, i * 6, 6);
        }
        // Ring Rendering
        
        gl.useProgram(this.ringProgram);
      
        let modelMatrix = m4.create();
        let scaleMatrix = m4.create();

        modelMatrix = m4.translate(scaleMatrix, scaleMatrix, joint_location);
        scaleMatrix = m4.scale(scaleMatrix, modelMatrix, [0.25, 0.25, 0.25]);

        let ringMvpMatrix = m4.multiply(cameraMatrix, scaleMatrix);

        const ringMvpMatrixLocation = gl.getUniformLocation(this.ringProgram, 'u_mvpMatrix');
        gl.uniformMatrix4fv(ringMvpMatrixLocation, false, ringMvpMatrix);
      
        // Render XY ring
        gl.bindBuffer(gl.ARRAY_BUFFER, ringBufferXY);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINE_LOOP, 0, this.ringVerticesXY.length / 3);
      
        // Render YZ ring
        gl.bindBuffer(gl.ARRAY_BUFFER, ringBufferYZ);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINE_LOOP, 0, this.ringVerticesYZ.length / 3);
      
        // Render XZ ring
        gl.bindBuffer(gl.ARRAY_BUFFER, ringBufferXZ);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINE_LOOP, 0, this.ringVerticesXZ.length / 3);
        
      }

}

