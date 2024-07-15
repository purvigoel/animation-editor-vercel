import {shadowBindGroupLayout} from "./light.js";
import {bindGroupLayout} from "./actor_renderer.js";

const vertexShaderSource = `
    struct VertexOutput {
        @builtin(position) vPosition : vec4f,
        @location(0) vNormal : vec3f,
        @location(1) fragPos : vec3f,
        @location(2) shadowPos : vec3f
    }

    @group(0) @binding(0) var<uniform> u_matrix : mat4x4f;
    @group(0) @binding(1) var<uniform> light_matrix : mat4x4f;
    @group(0) @binding(2) var<uniform> u_uniformArray : array<vec4f, 384/4>;

    fn getBoneMatrix (jointNdx : i32) -> mat4x4f {
        var v : i32 = jointNdx * 4 ;
        return mat4x4f (
            u_uniformArray[v].x, u_uniformArray[v + 1].x, u_uniformArray[v + 2].x, u_uniformArray[v + 3].x,
            u_uniformArray[v].y, u_uniformArray[v + 1].y, u_uniformArray[v + 2].y, u_uniformArray[v + 3].y,
            u_uniformArray[v].z, u_uniformArray[v + 1].z, u_uniformArray[v + 2].z, u_uniformArray[v + 3].z,
            u_uniformArray[v].w, u_uniformArray[v + 1].w, u_uniformArray[v + 2].w, u_uniformArray[v + 3].w,
        ); 
    }

    @vertex
    fn vertexMain( @location(0) a_position: vec3f,
                    @location(1) a_JOINTS : vec4f,
                    @location(2) a_WEIGHTS : vec4f,
                    @location(3) a_normal : vec3f) ->
        VertexOutput {
        var output : VertexOutput;
        var skinPosition : vec4f = vec4f(0.0);
        var skinMatrix : mat4x4f = mat4x4f();

        for (var i = 0; i < 4; i++) {
            var jointIndex : i32 = i32(a_JOINTS[i]);
            var weight : f32 = a_WEIGHTS[i];
            skinPosition += weight * (getBoneMatrix(jointIndex) * vec4f (a_position, 1.0f) );
            skinMatrix += weight * (getBoneMatrix(jointIndex));
        }

        let lightPos = light_matrix * skinPosition;

        // Convert to texture coordinates for tex sampling in frag shader
        output.shadowPos = vec3 (
            lightPos.xy/lightPos.w * vec2(0.5, -0.5) + vec2(0.5),
            lightPos.z/lightPos.w
        );

        //var temp : mat4x4f = u_matrix * skinMatrix;
        var temp : mat4x4f = skinMatrix;
        output.vNormal = mat3x3f (temp[0].xyz, temp[1].xyz, temp[2].xyz) * a_normal;
        output.vPosition = (u_matrix * skinPosition);
        output.fragPos = skinPosition.xyz;
        //output.fragPos = output.vPosition.xyz;
        return output;
    }    
`;
const fragmentShaderSource = `
    @group(1) @binding(0) var shadowMap: texture_depth_2d;
    @group(1) @binding(1) var shadowSampler: sampler_comparison;

    fn discretize (n : f32) -> f32 {
        if (n >= 0.66) {
            return 1;
        } else if (n >= 0.33) {
            return 0.5;
        } else {
            return 0.0;
        }
    }

    @fragment
    fn fragmentMain( @location(0) vNormal : vec3f,
                     @location(1) vPosition : vec3f,
                     @location(2) shadowPos : vec3f) -> @location(0) vec4f {
        //return vec4f(vec3f(vPosition.z), 1);
        var uLightColor : vec3f = vec3f(1.0, 1.0, 1.0);
        var vLightPosition : vec3f = vec3f(0.001, 4, 0.001);
        var uObjectColor : vec3f = vec3f(0.89, 0.47, 0.44);

        var ambientStrength : f32 = 0.2;
        var ambient : vec3f = ambientStrength * uLightColor;
        
        // Lambertian (diffuse)
        var norm : vec3f = normalize (vNormal);
        var lightDir : vec3f = normalize (vLightPosition - vPosition);
        var diff : f32 = max (dot (norm, lightDir), 0.0);
        var diffuse : vec3f = discretize(diff) * uLightColor;

        //return vec4f(vec3f(vPosition.z), 1);

       /* if (vPosition.z == shadowPos.z) {
            return vec4f(1, 0, 0, 1);
        } else {
            return vec4f(0, 0, 0, 1);
        }

        */
        //return vec4f(vec3f(textureSample(shadowMap, shadowSampler, shadowPos.xy)), 1);
        
        var oneOverS = 1/4096.;
        //return vec4(vec3f(textureSample(shadowMap, shadowSampler, shadowPos.xy)), 1);
        // Shadow
        var visibility = 0.0;
        for (var i = -2; i <= 2; i++) {
            for (var j = -2; j <= 2; j++) {
                var offset : vec2f = vec2f(f32(i), f32(j)) * oneOverS;
                visibility += textureSampleCompare(shadowMap, shadowSampler, shadowPos.xy + offset, shadowPos.z - .007);
            }
        }
        visibility /= 25;
        visibility = discretize (visibility);
        // visibility = 1;

        var spec :  f32 = pow(max(dot(norm, lightDir), 0), 32);
        spec = discretize (spec);
        var specular : vec3f = 0.75 * spec * uLightColor;
 
        // return vec4(vec3f(visibility), 1);
       // var result = visibility * uObjectColor;
        var result : vec3f = (ambient + visibility * (diffuse + specular)) * uObjectColor;
        return vec4(result, 1.0);
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
        layout: device.createPipelineLayout ({
            bindGroupLayouts: [
                bindGroupLayout,
                shadowBindGroupLayout
            ]
        }),
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
        },
        multisample: {
            count: 4,
        },
    })
    return pipeline;
}