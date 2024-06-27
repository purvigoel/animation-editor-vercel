import {setCameraMatrix} from "./camera.js";
function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
  }
export class FloorRenderer {
    constructor(gl){
        this.program = null;
        this.positionBuffer = null;
        this.normalBuffer = null;
        this.texCoordsBuffer = null;
        this.texture = null;

        //this.initialize_texture(gl);
        this.initialize_shader_program(gl);
        this.initialize_buffers(gl);
    }


    /*
        https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
    */
    load_textures(gl) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;

        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue

        gl.texImage2D (
            gl.TEXTURE_2D,
            level,
            internalFormat,
            width,
            height,
            border,
            srcFormat,
            srcType,
            pixel,
        );
        
        // Load the image.
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Google_Chrome_icon_%28February_2022%29.svg/800px-Google_Chrome_icon_%28February_2022%29.svg.png";
        image.onload = () => {
            console.log ("Image loaded.");
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D (
                gl.TEXTURE_2D,
                level,
                internalFormat,
                srcFormat,
                srcType,
                image,
            )

            if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                // Yes, it's a power of 2. Generate mips.
                gl.generateMipmap(gl.TEXTURE_2D);
            } else {
                // No, it's not a power of 2. Turn off mips and set
                // wrapping to clamp to edge
                //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
        };

        return texture;
    }
    
    initialize_shader_program(gl) {
        const vertexShaderSource = `
            attribute vec3 a_position2;
            attribute vec2 a_texCoord;
            attribute vec3 a_normal;
            uniform mat4 u_matrix;

            varying vec3 vNormal;
            varying vec3 vPosition;
            varying highp vec2 vTexCoord;

            void main() {
                vNormal = a_normal;
                vPosition = (u_matrix * vec4(a_position2, 1.0)).xyz;
                gl_Position = u_matrix * vec4(a_position2, 1.0);

                vTexCoord = a_texCoord;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying highp vec2 vTexCoord;
            uniform sampler2D u_sampler;

            void main() {
                vec3 vLightPosition = vec3(0.0, 3.0, 0.0);
        
                vec3 norm = normalize(vNormal);
                vec3 lightDir = normalize(vLightPosition - vPosition);

                float diff = max(dot(norm, lightDir), 0.0);
                vec4 diffuse = diff * vec4(0.8, 0.8, 0.8, 0.0);
                // vec3 ambient = vec3(0.2, 0.2, 0.2);
                vec4 ambient = texture2D (u_sampler, vTexCoord);
                gl_FragColor = ambient + diffuse;
                //gl_FragColor = texture2D (u_sampler, vTexCoord);
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

        const texCoords = new Float32Array([
            0.0, 0.0,
            10.0, 0.0,
            0.0, 10.0,
            10.0, 10.0
        ]);

        this.texture = this.load_textures(gl);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

        this.texCoordsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
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

        const texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsBuffer);
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture (gl.TEXTURE0);
        gl.bindTexture (gl.TEXTURE_2D, this.texture);
        gl.uniform1i (gl.getUniformLocation(this.program, "u_sampler"), 0);

        setCameraMatrix(gl, this.program);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

} 