import {vec3} from 'gl-matrix';
import {cameraBuffer} from './camera.js'

export const torus = (R = 0.5, r = 0.1, N = 100, n = 50, axis=0) => {
  let vertex = [], triangles = [];

  let points = [];
  let normal;
  for (let i = 0; i < N; i++) {
    let u = i * 360 / (N - 1);
    let pts = []
    for (let j = 0; j < n; j++) {
      let v = j * 360 / ( n - 1 );

      let x = (R + r * Math.cos(v * Math.PI/180)) * Math.cos (u * Math.PI/180);
      let y = (R + r * Math.cos(v * Math.PI/180)) * Math.sin (u * Math.PI/180);
      let z = r * Math.sin (v * Math.PI/180);

      if (axis == 2) {
        pts.push (vec3.fromValues(x, y, z));
        normal = vec3.fromValues(0, 0, 1);
      } else if (axis == 1) {
        pts.push (vec3.fromValues(y, z, x));
        normal = vec3.fromValues(0, 1, 0);
      } else if (axis == 0) {
        pts.push (vec3.fromValues(z, x, y));
        normal = vec3.fromValues(1, 0, 0);
      }
      
    }
    points.push (pts);
  }

  for (let i = 0; i < N - 1; i++) {
    let p0, p1, p2, p3;
    for (let j = 0; j < n - 1; j++) {
      p0 = points[i][j];
      p1 = points[i + 1][j];
      p2 = points[i + 1][j + 1];
      p3 = points[i][j + 1];

      vertex.push ([
        p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2],
        p2[0], p2[1], p2[2], p3[0], p3[1], p3[2], p0[0], p0[1], p0[2]
      ]);

      triangles.push (p0, p1, p2);
    }
  }

  return {
    vertexData: new Float32Array (vertex.flat()),
    triangleData: triangles,
    isDragged: false,
    isHovered: false,

    normal : normal,
    lastPointOnPlane : vec3.fromValues(1, 0, 0),
    axis: axis
  }; 
}

export function checkRayTorusIntersection (torus, rayDir, camera_pos, offset) {

  for (let i = 0; i < torus.triangleData.length; i += 3) {
      let v1 = vec3.create();
      let v2 = vec3.create();
      let v3 = vec3.create();

      // vec3.transformMat3 (v1, torus.triangleData[i], rot);
      // vec3.transformMat3 (v2, torus.triangleData[i + 1], rot);
      // vec3.transformMat3 (v3, torus.triangleData[i + 2], rot);

      vec3.add (v1, torus.triangleData[i], offset);
      vec3.add (v2, torus.triangleData[i + 1], offset);
      vec3.add (v3, torus.triangleData[i + 2], offset);

      if (checkRayTriangleIntersection (v1, v2, v3,
                                        rayDir, camera_pos
      )) {
        torus.isHovered = true;
        return true;
      }
  }

  torus.isHovered = false;
  return false;

}

export function checkRayTriangleIntersection (v1, v2, v3, rayDir, camera_pos) {
  let e1 = vec3.create();
  let e2 = vec3.create();
  let s = vec3.create();

  vec3.subtract (e1, v2, v1);
  vec3.subtract (e2, v3, v1);
  vec3.subtract (s, camera_pos, v1);

  let e1xd = vec3.create();
  let sxe2 = vec3.create();

  vec3.cross (e1xd, e1, rayDir);
  vec3.cross (sxe2, s, e2);
  vec3.negate (sxe2, sxe2);

  let denom = vec3.dot (e1xd, e2);

  if (denom == 0) return false;

  let u = vec3.dot (sxe2, rayDir) / denom;
  let v = vec3.dot (e1xd, s) / denom;
  let t = vec3.dot (sxe2, e1) / denom;

  if (u >= 0 && v >= 0 && u + v <= 1) {
    return true;
  }
    return false;
}


/* vis functions for debugging purposes */

let pipeline = null;
let positionBuffer = null;
let bindGroup = null;
export let torusDataX = torus(0.15, 0.01, 50, 25, 0);
export let torusDataY = torus(0.15, 0.01, 50, 25, 1);
export let torusDataZ = torus(0.15, 0.01, 50, 25, 2);


export function initializeTorus (device) {
  const shaderSource = `
  @group(0) @binding(0) var<uniform> u_matrix : mat4x4f;
  @vertex
  fn vertexMain (@location(0) a_position : vec3f) -> @builtin(position) vec4f {
    return u_matrix * vec4f(a_position, 1.0f);
  }
  
  @fragment
  fn fragmentMain() -> @location(0) vec4f {
    return vec4f(1.0, 0, 0, 1.0);
  }`;

  const shaderModule = device.createShaderModule ({
    label: "Torus shader (Test)",
    code: shaderSource
  })

  pipeline = device.createRenderPipeline ({
    label: "Torus test pipeline",
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: "vertexMain",
      buffers: [
        {
          arrayStride: 3 * 4,
          attributes: [{
            format: "float32x3",
            offset: 0,
            shaderLocation: 0, // Position, see vertex shader
          }],
        }
      ],
    },

    fragment: {
      module: shaderModule,
      entryPoint: "fragmentMain",
      targets: [{
        format: navigator.gpu.getPreferredCanvasFormat()
      }]
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "always",
      format: "depth24plus"
    },
    multisample: {
      count: 4,
    },
  });

  positionBuffer = device.createBuffer ({
    label: "Torus vertices",
    size: torusDataX.vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });

  device.queue.writeBuffer (positionBuffer, 0, torusDataX.vertexData);

  bindGroup = device.createBindGroup ({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{
      binding: 0,
      resource: {buffer: cameraBuffer}
    }]
  });

}

export function renderTorus (pass) {
  pass.setPipeline (pipeline);
  pass.setVertexBuffer (0, positionBuffer);
  pass.setBindGroup (0, bindGroup);
  pass.draw (torusDataX.vertexData.length/3);
}