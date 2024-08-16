import {m4} from "./m4.js";
import { vec3 } from 'gl-matrix';

export let camera = {
    theta: 0,
    phi: 0,
    radius: 2.0,
    lookAt: [0, 0, 0],
    isDragging: false, 
    locked: false,
    lastMousePosition:{ x: 0, y: 0 },
};

export let cameraBuffer = null;

export function initCamera(device) {
    cameraBuffer = device.createBuffer ({
        label: "uniform camera buffer",
        size: ( 4 * 4 ) * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
}

export function setCameraMatrix(device, canvas) {
    device.queue.writeBuffer (cameraBuffer, 0, new Float32Array(getCameraMatrix(canvas)));
}

function clamp(x, a, b) {
    return Math.min (Math.max(x, a), b);
}

export function getCameraMatrix(canvas){
    // Define a simple projection matrix
    const fieldOfViewRadians = Math.PI * 0.25;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100;
    const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);
    
    // Calculate the camera position in Cartesian coordinates

    let phi = clamp (camera.phi, -Math.PI/12, Math.PI);

    const x = camera.radius * Math.sin(camera.theta) * Math.cos(phi);
    const y = camera.radius * Math.sin(phi);
    const z = camera.radius * Math.cos(camera.theta) * Math.cos(phi);
    //console.log("cameraPosition: x:%f, y: %f, z: %f", x, y, z);
    //console.log("lookAt: x:%f, y: %f, z: %f", camera.lookAt[0], camera.lookAt[1], camera.lookAt[2]);
    const cameraPosition = [x, y, z];
    const up = [0, 1, 0];
    const target = camera.lookAt;
    
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);
    
    // Make a view matrix from the camera matrix.
    const viewMatrix = m4.inverse(cameraMatrix);
    
    const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    return viewProjectionMatrix;

}

export function getViewProjectionMatrix(canvas){
    // Define a simple projection matrix
    const fieldOfViewRadians = Math.PI * 0.25;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100;
    const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    // Calculate the camera position in Cartesian coordinates

    let phi = clamp (camera.phi, -Math.PI/12, Math.PI);

    const x = camera.radius * Math.sin(camera.theta) * Math.cos(phi);
    const y = camera.radius * Math.sin(phi);
    const z = camera.radius * Math.cos(camera.theta) * Math.cos(phi);
    
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
    camera.phi = clamp(spherical.phi);
    camera.lookAt = center;
}

