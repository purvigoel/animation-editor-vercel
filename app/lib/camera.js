import {m4} from "./m4.js";
import { vec3 } from 'gl-matrix';

export let camera = {
    theta: 0,
    phi: 0,
    radius: 2.0,
    lookAt: [0, 0, 0],
    isDragging: false, 
    lastMousePosition:{ x: 0, y: 0 },
};

export function setCameraMatrix(gl, program) {
    const matrixLocation = gl.getUniformLocation(program, 'u_matrix');
    
    // Define a simple projection matrix
    const fieldOfViewRadians = Math.PI * 0.5;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 1000;
    const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);
    
    // Calculate the camera position in Cartesian coordinates
    const x = camera.radius * Math.sin(camera.theta) * Math.cos(camera.phi);
    const y = camera.radius * Math.sin(camera.phi);
    const z = camera.radius * Math.cos(camera.theta) * Math.cos(camera.phi);
    const cameraPosition = [x, y, z];
    const up = [0, 1, 0];
    const target = camera.lookAt;
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);
    
    // Make a view matrix from the camera matrix.
    const viewMatrix = m4.inverse(cameraMatrix);
    
    const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    
    gl.uniformMatrix4fv(matrixLocation, false, viewProjectionMatrix);

}

export function getCameraMatrix(gl){
    // Define a simple projection matrix
    const fieldOfViewRadians = Math.PI * 0.5;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100;
    const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);
    
    // Calculate the camera position in Cartesian coordinates
    const x = camera.radius * Math.sin(camera.theta) * Math.cos(camera.phi);
    const y = camera.radius * Math.sin(camera.phi);
    const z = camera.radius * Math.cos(camera.theta) * Math.cos(camera.phi);
    const cameraPosition = [x, y, z];
    const up = [0, 1, 0];
    const target = camera.lookAt;
    
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);
    
    // Make a view matrix from the camera matrix.
    const viewMatrix = m4.inverse(cameraMatrix);
    
    const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    return viewProjectionMatrix;

}

export function getViewProjectionMatrix(gl){
    // Define a simple projection matrix
    const fieldOfViewRadians = Math.PI * 0.5;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100;
    const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);
    
    // Calculate the camera position in Cartesian coordinates
    const x = camera.radius * Math.sin(camera.theta) * Math.cos(camera.phi);
    const y = camera.radius * Math.sin(camera.phi);
    const z = camera.radius * Math.cos(camera.theta) * Math.cos(camera.phi);
    const cameraPosition = [x, y, z];
    const up = [0, 1, 0];
    const target = camera.lookAt;
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);
    
    // Make a view matrix from the camera matrix.
    const viewMatrix = m4.inverse(cameraMatrix);
    
    //const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    return [viewMatrix, projectionMatrix, vec3.fromValues(x, y, z)];

    
}

function cartesianToSpherical(x, y, z) {
    const radius = Math.sqrt(x * x + y * y + z * z);
    const theta = Math.atan2(y, x);
    const phi = Math.acos(z / radius);
    return { radius, theta, phi };
}

export function adjustCamera(boundingBox){
    const center = boundingBox.getCenter();
    const distance = vec3.distance(boundingBox.min, boundingBox.max);
    const position = vec3.fromValues(center[0], center[1], center[2] + distance);
    const spherical = cartesianToSpherical(position[0], position[1], position[2]);
    camera.radius = spherical.radius;
    camera.theta = spherical.theta;
    camera.phi = spherical.phi;
    camera.lookAt = center;
}

