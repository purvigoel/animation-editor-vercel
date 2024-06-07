import {m4} from "./m4.js";

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

export function getViewMatrix(gl){
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
    return viewMatrix;

}