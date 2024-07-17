/* This file contains the vertex shader for the shadow render pass... */
import {bindGroupLayout} from "./actor_renderer.js";
const shaderSource = `
    struct LightingInput {
        light_matrix : mat4x4f,
        light_pos : vec4f
    };

    @group(0) @binding(0) var<uniform> u_matrix : mat4x4f;
    @group(0) @binding(1) var<uniform> u_lightInfo : LightingInput;
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
        @builtin(position) vec4f {
        var skinPosition : vec4f = vec4f(0.0);

        for (var i = 0; i < 4; i++) {
            var jointIndex : i32 = i32(a_JOINTS[i]);
            var weight : f32 = a_WEIGHTS[i];
            skinPosition += weight * (getBoneMatrix(jointIndex) * vec4f (a_position, 1.0f) );
        }

        var result = u_lightInfo.light_matrix * skinPosition;
        return result;
    }    
`;

export function createShadowPipeline(device) {
  return device.createRenderPipeline({
    label: "Shadow Pipeline",
    layout: device.createPipelineLayout ({
      bindGroupLayouts: [
          bindGroupLayout,
      ]
  }),
    vertex: {
      module: device.createShaderModule({
        code: shaderSource
      }),
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
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth32float',
    },
    primitive: {
      cullMode: 'back'
    }
  })
}