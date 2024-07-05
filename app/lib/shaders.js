const vertexShaderSource = `
    struct Uniforms {
        u_matrix : mat4x4f,
    }
    
    struct VertexOutput {
        @builtin(position) vPosition : vec4f,
        @location(0) vNormal : vec3f,
        @location(1) vViewPosition : vec3f,
        @location(2) fragPos : vec3f
    }

    @group(0) @binding(0) var<uniform> u_matrix : mat4x4f;
    @group(0) @binding(1) var<uniform> u_uniformArray : array<vec4f, 384/4>;

    fn getBoneMatrix (jointNdx : i32) -> mat4x4f {
        var v : i32 = jointNdx * 4 ;
        return mat4x4f (
            u_uniformArray[v].x, u_uniformArray[v + 1].x, u_uniformArray[v + 2].x, u_uniformArray[v + 3].x,
            u_uniformArray[v].y, u_uniformArray[v + 1].y, u_uniformArray[v + 2].y, u_uniformArray[v + 3].y,
            u_uniformArray[v].z, u_uniformArray[v + 1].z, u_uniformArray[v + 2].z, u_uniformArray[v + 3].z,
            u_uniformArray[v].w, u_uniformArray[v + 1].w, u_uniformArray[v + 2].w, u_uniformArray[v + 3].w,
        ); 
       /* return mat4x4f (
            u_uniformArray[v], u_uniformArray[v + 4], u_uniformArray[v + 8], u_uniformArray[v + 12],
            u_uniformArray[v + 1], u_uniformArray[v + 5], u_uniformArray[v + 9], u_uniformArray[v + 13],
            u_uniformArray[v + 2], u_uniformArray[v + 6], u_uniformArray[v + 10], u_uniformArray[v + 14],
            u_uniformArray[v + 3], u_uniformArray[v + 7], u_uniformArray[v + 11], u_uniformArray[v + 15]
        ); */
    }

    @vertex
    fn vertexMain( @location(0) a_position: vec3f,
                    @location(1) a_JOINTS : vec4f,
                    @location(2) a_WEIGHTS : vec4f,
                    @location(3) a_normal : vec3f) ->
        VertexOutput {
        var output : VertexOutput;
        output.fragPos = a_position;
        var skinPosition : vec4f = vec4f(0.0);
        var skinMatrix : mat4x4f = mat4x4f();

        for (var i = 0; i < 4; i++) {
            var jointIndex : i32 = i32(a_JOINTS[i]);
            var weight : f32 = a_WEIGHTS[i];
            skinPosition += weight * (getBoneMatrix(jointIndex) * vec4f (a_position, 1.0f) );
            skinMatrix += weight * (getBoneMatrix(jointIndex));
        }
    
        var temp : mat4x4f = u_matrix * skinMatrix;
        output.vNormal = mat3x3f (temp[0].xyz, temp[1].xyz, temp[2].xyz) * a_normal;
        output.vPosition = (u_matrix * skinPosition);
        output.vViewPosition = (u_matrix * vec4f(0.0, 0, 0, 1)).xyz;
        return output;
    }    
`;
const fragmentShaderSource = `
    @fragment
    fn fragmentMain( @location(0) vNormal : vec3f,
                    @location(1) vViewPosition : vec3f, @location(2) vPosition : vec3f) -> @location(0) vec4f {
        //return vec4(vViewPosition, 1.0f);
        var uLightColor : vec3f = vec3f(1.0, 1.0, 1.0);
        var vLightPosition : vec3f = vec3f(0, 1.5, 0);
        var uObjectColor : vec3f = vec3f(1.0, 0.0, 0.0);

        var ambientStrength : f32 = 0.4;
        var ambient : vec3f = ambientStrength * uLightColor;
        
        var norm : vec3f = normalize (vNormal);
        var lightDir : vec3f = normalize (vLightPosition - vPosition);
        var diff : f32 = max (dot (norm, lightDir), 0.0);
        var diffuse : vec3f = diff * uLightColor;

        var result : vec3f = (ambient + diffuse) * uObjectColor;
        return vec4(result, 1.0);
        //return vec4f(testR, 0, 0, 1);
    }
`;
/*const vertexShaderSource = `
    attribute vec3 a_position;
    attribute vec4 a_JOINTS;
    attribute vec4 a_WEIGHTS;
    attribute vec3 a_normal;

    uniform mat4 u_matrix;
    uniform sampler2D u_textureW;
    uniform float u_uniformArray[384];
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

        gl_Position = u_matrix * skinPosition;
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
`;*/

export function createAllShaders(device){
    const vertexShaderModule = device.createShaderModule ({
        label: "Vertex Shader",
        code: vertexShaderSource
    });
    const fragmentShaderModule = device.createShaderModule ({
        label: "Fragment Shader",
        code: fragmentShaderSource
    });

    const pipeline = device.createRenderPipeline ({
        label : "Pipeline",
        layout: "auto",
        vertex: {
            module: vertexShaderModule,
            entryPoint: "vertexMain",
            buffers: [
                // Position Buffer
                {
                    arrayStride: 3 * 4,
                    attributes: [{
                      format: "float32x3",
                      offset: 0,
                      shaderLocation: 0, // Position, see vertex shader
                    }],
                },
                // joints buffer
                {
                    arrayStride: 4 * 4,
                    attributes: [{
                        format: "float32x4",
                        offset: 0,
                        shaderLocation: 1, 
                    }],
                },
                // weights buffer
                {
                    arrayStride: 4 * 4,
                    attributes: [{
                        format: "float32x4",
                        offset: 0,
                        shaderLocation: 2,
                    }],
                },
                // normals buffer
                {
                    arrayStride: 3 * 4,
                    attributes: [{
                        format: "float32x3",
                        offset: 0,
                        shaderLocation: 3,
                    }],
                }
            ]
        },
        fragment: {
            module: fragmentShaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: navigator.gpu.getPreferredCanvasFormat()
            }]
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: "less",
            format: "depth24plus"
        }
    })
    return pipeline;
}