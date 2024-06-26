const vertexShaderSource = `
    attribute vec3 a_position;
    attribute vec4 a_JOINTS;
    attribute vec4 a_WEIGHTS;
    attribute vec3 a_normal;

    uniform mat4 u_matrix;
    uniform sampler2D u_textureW;
    uniform float u_uniformArray[384];
    uniform float u_transArray[3];
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    // these offsets assume the texture is 4 pixels across
    #define ROW0_U ((0.5 + 0.0) / 4.)
    #define ROW1_U ((0.5 + 1.0) / 4.)
    #define ROW2_U ((0.5 + 2.0) / 4.)
    #define ROW3_U ((0.5 + 3.0) / 4.)

    mat4 getBoneMatrix(float jointNdx) {
        int v = int(jointNdx * 16.0); //(jointNdx + 0.5) / 24.0;
        return mat4(
            u_uniformArray[v], u_uniformArray[v + 4], u_uniformArray[v + 8], u_uniformArray[v + 12],
            u_uniformArray[v + 1], u_uniformArray[v + 5], u_uniformArray[v + 9], u_uniformArray[v + 13],
            u_uniformArray[v + 2], u_uniformArray[v + 6], u_uniformArray[v + 10], u_uniformArray[v + 14],
            u_uniformArray[v + 3], u_uniformArray[v + 7], u_uniformArray[v + 11], u_uniformArray[v + 15]
        );
    }

    void main() {
        vec4 skinPosition = vec4(0.0);
        mat4 skinMatrix = mat4(0.0);
        for (int i = 0; i < 4; i++) {
            int jointIndex = int(a_JOINTS[i]);
            float weight = a_WEIGHTS[i];
            skinPosition += weight * (getBoneMatrix(a_JOINTS[i]) * vec4(a_position, 1.0));
            skinMatrix +=  weight * (getBoneMatrix(a_JOINTS[i]));
        }
        vNormal = mat3(u_matrix * skinMatrix)  * a_normal;
        vPosition = (u_matrix * skinPosition).xyz;
        vViewPosition = (u_matrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; 

        gl_Position = u_matrix * (skinPosition + vec4(u_transArray[0], u_transArray[1], u_transArray[2], 0.0)) ;
    }
`;


const fragmentShaderSource = `
    precision mediump float;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
        vec3 uLightColor = vec3(1.0, 1.0, 1.0);
        vec3 uViewPosition = vViewPosition;
        vec3 uObjectColor = vec3(1.0, 0.0, 0.0);
        vec3 vLightPosition = vec3(0.0, 3.0, 0.0);

        float ambientStrength = 0.4;
        vec3 ambient = ambientStrength * uLightColor;

        vec3 norm = normalize(vNormal);
        vec3 lightDir = normalize(vLightPosition - vPosition);
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 diffuse = diff * uLightColor;

        // Combine results
        vec3 result = (ambient + diffuse ) * uObjectColor;
        gl_FragColor = vec4(result, 1.0);
        
    }
`;

export function createShader(gl, type, source) {
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

export function createProgram(gl, vertexShader, fragmentShader) {
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

export function createAllShaders(gl){
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);
    return program;
}