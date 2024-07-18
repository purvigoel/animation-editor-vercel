import {m4} from "./m4.js";
import { vec3 } from 'gl-matrix';

export let shadowDepthTexture;
export let shadowDepthTextureView;
export let shadowDepthSampler;
export let shadowBindGroupLayout;
export let shadowBindGroup;

export let light = {
  position: [2, 3, 2],
  lookAt: [0, 0, 0],
};

export let lightBuffer = null;

export function initLight(device, canvas) {
  lightBuffer = device.createBuffer({
    label: "Uniform light buffer",
    size: (4 * 4) * 4 + 4 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  shadowDepthTexture = device.createTexture({
    size: [4096, 4096, 1],
    format: "depth32float",
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });
  shadowDepthTextureView = shadowDepthTexture.createView();

  shadowDepthSampler = device.createSampler({
    compare: 'less',
  });

  shadowBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: 'depth',
        }
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        sampler: {
          type: 'comparison',
        },
      }
    ]
  });

  shadowBindGroup = device.createBindGroup ({
    layout: shadowBindGroupLayout,
    entries : [{
      binding: 0,
      resource: shadowDepthTextureView
    }, {
      binding: 1,
      resource: shadowDepthSampler
    }]
  });
}

export function setLightMatrix(device, canvas) {
  device.queue.writeBuffer (lightBuffer, 0, new Float32Array(getLightMatrix(canvas)));
  device.queue.writeBuffer (lightBuffer, 4 * 4 * 4, new Float32Array([light.position, 1].flat()));
}


export function getLightMatrix(canvas){
  // Define a simple projection matrix
  const fieldOfViewRadians = Math.PI * 0.5;
  const aspect = canvas.clientWidth / canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100;
  const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);
  
  const up = [0, 1, 0];
  const target = light.lookAt;
  
  const lightMatrix = m4.lookAt(light.position, target, up);
  
  // Make a view matrix from the camera matrix.
  const viewMatrix = m4.inverse(lightMatrix);
  
  const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
  return viewProjectionMatrix;

}