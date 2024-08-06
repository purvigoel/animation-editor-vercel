import {shadowBindGroupLayout} from "./light.js";
import {bindGroupLayout} from "./actor_renderer.js";

const vertexShaderSource = `
    struct VertexOutput {
        @builtin(position) vPosition : vec4f,
        @location(0) vNormal : vec3f,
        @location(1) fragPos : vec3f,
        @location(2) posFromLight : vec4f
    }

    struct LightingInput {
        light_matrix : mat4x4f,
        light_pos : vec4f
    };

    @group(0) @binding(0) var<uniform> u_matrix : mat4x4f;
    @group(0) @binding(1) var<uniform> u_lightInfo : LightingInput;
    @group(0) @binding(2) var<uniform> u_uniformArray : array<vec4f, 384/4>;
    @group(0) @binding(4) var<uniform> u_transArray : array<vec4f, 1>;

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

        var pos = (skinPosition);
        // + vec4(u_transArray[0].x, u_transArray[0].y, u_transArray[0].z, 0.0)
        output.posFromLight = u_lightInfo.light_matrix * pos;
        var temp : mat4x4f = skinMatrix;
        output.vNormal = mat3x3f (temp[0].xyz, temp[1].xyz, temp[2].xyz) * a_normal;
        output.vPosition = u_matrix * (pos) ;
        output.fragPos = skinPosition.xyz;
        // xoutput.fragPos = output.vPosition.xyz;
        return output;
    }    
`;
const fragmentShaderSource = `
    struct LightingInput {
        light_matrix : mat4x4f,
        light_pos : vec4f
    };
    @group(0) @binding(1) var<uniform> u_lightInfo : LightingInput;
    @group(0) @binding(3) var<uniform> actorColor : vec4f;

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
                      @location(2) posFromLight : vec4f) -> @location(0) vec4f {
        var uLightColor : vec3f = vec3f(1.0, 1.0, 1.0);
        var vLightPosition : vec3f = u_lightInfo.light_pos.xyz;

        var ambientStrength : f32 = 0.2;
        ambientStrength = 0.4;
        var ambient : vec3f = ambientStrength * uLightColor;
        
        // Lambertian (diffuse)
        var norm : vec3f = normalize (vNormal);
        var lightDir : vec3f = normalize (vLightPosition - vPosition);
        var diff : f32 = max (dot (norm, lightDir), 0.0);
        // diff = 1.0;
        var diffuse : vec3f = discretize(diff) * uLightColor;

        
        var oneOverS = 1/4096.;
        var shadowPos = vec3f (
            posFromLight.x / posFromLight.w * 0.5 + 0.5,
            posFromLight.y / posFromLight.w * -0.5 + 0.5,
            posFromLight.z / posFromLight.w
        );

        // Shadow
        var bias = max (0.0005 * (1.0 - max (dot (norm, lightDir), 0.0)), 0.0007);
        
        var visibility = 0.0;
        for (var i = -2; i <= 2; i++) {
            for (var j = -2; j <= 2; j++) {
                var offset : vec2f = vec2f(f32(i), f32(j)) * oneOverS;
                visibility += textureSampleCompare(shadowMap, shadowSampler, shadowPos.xy + offset, shadowPos.z - .005);
            }
        }
        visibility /= 25;
        // visibility = textureSampleCompare(shadowMap, shadowSampler, shadowPos.xy, shadowPos.z - bias);
        visibility = discretize (visibility);
        
        if (shadowPos.x < 0 || shadowPos.x > 1 || shadowPos.y < 0 || shadowPos.y > 1) {
            visibility = 1;
        } 

        /* if (diff == 0.0) {
            visibility = 0;
        } */
        

        var spec :  f32 = pow(max(dot(norm, lightDir), 0), 32);
        spec = discretize (spec);
        var specular : vec3f = 0.75 * spec * uLightColor;
 
        var result : vec3f = (ambient + visibility * (diffuse + specular)) * actorColor.xyz;
        /*if (diff * visibility == 0) {
            result = vec3f(0.5, 0, 0.5);
        }*/
        // return vec4(vec3f(diff * visibility), 1);
        return vec4(result, 1.0);
    }
`;

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