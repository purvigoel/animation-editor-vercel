import {vec3} from 'gl-matrix';
import { handleClientScriptLoad } from 'next/script';
export const cylinder = (r = 0.1, h = 0.5, N = 50, n = 25, axis=0) => {

  let vertex = [], triangles = [];
  let points = [];
  let normal;
  if (axis == 0) {
    normal = vec3.fromValues (0, 1, 0);
  } else if (axis == 1) {
    normal = vec3.fromValues (1, 0, 0);
  } else if (axis == 2) {
    normal = vec3.fromValues (1, 0, 0);
  }
  for (let i = 0; i < N; i++) {
    let u = i * 360 / (N - 1);
    let pts = [];
    for (let j = 0; j < n; j++) {
      let v = j * h / (n - 1);

      let x = r * Math.cos (u);
      let y = r * Math.sin (u);
      let z = v;

      if (axis == 0) {
        pts.push (vec3.fromValues(z, x, y));
      } else if (axis == 1) {
        pts.push (vec3.fromValues(y, z, x));
      } else if (axis == 2) {
        pts.push (vec3.fromValues(x, y, z));
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
    isHovered: false,
    isDragged: false,
    lastPointOnPlane : vec3.fromValues(1, 0, 0),
    axis: axis,
    normal: normal
  }
  
}

export let cylinderDataX = cylinder(0.01, 0.15, 25, 8, 0);
export let cylinderDataY = cylinder(0.01, 0.15, 25, 8, 1);
export let cylinderDataZ = cylinder(0.01, 0.15, 25, 8, 2);