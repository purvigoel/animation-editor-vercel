import { getViewProjectionMatrix, camera } from "./camera.js";
import {m4} from "./m4.js";
import { vec3, vec4 } from 'gl-matrix';
import { AngleControllerRenderer } from './angle_controller_renderer.js';

let mouseMoveHandler = null;
let mouseDownHandler = null;
let mouseUpHandler = null;
export let click_id = -1;
var drag = false;

let transformable_joints = [0, 7, 8, 20, 21];

export function addMouseEvents(canvas, clickables, render, params) {

    
    if (!mouseMoveHandler) {
        
        mouseMoveHandler = function(event) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const ndcX = (x / canvas.width) * 2 - 1;
            const ndcY = -(y / canvas.height) * 2 + 1;

            let [invModelViewMatrix, invProjectionMatrix, camera_pos] = getViewProjectionMatrix(canvas);
            invProjectionMatrix = m4.inverse(invProjectionMatrix);
            invModelViewMatrix = m4.inverse(invModelViewMatrix);

            const clipCoords = vec4.fromValues(ndcX, ndcY, -1.0, 1.0);
            vec4.transformMat4(clipCoords, clipCoords, invProjectionMatrix);
            clipCoords[2] = -1.0;
            clipCoords[3] = 0.0;

            const worldCoords = vec4.create();
            vec4.transformMat4(worldCoords, clipCoords, invModelViewMatrix);
            const rayDir = vec3.fromValues(worldCoords[0], worldCoords[1], worldCoords[2]);
            vec3.normalize(rayDir, rayDir);

            if (params["clicked"] != null) {
                if (params["clicked"].dragWidget(params, rayDir, camera_pos)) {
                    return;
                }
                /*if (drag) {
                    console.log ("dragging widgett");
                }*/
            }

            for (var i = 0; i < clickables.length; i++) {
                var clickable = clickables[i];
                var hover = clickable.checkRaySphereIntersection(rayDir, camera_pos);
                if (clickable.isClicked) {
                    console.log("Checking for ray-torus intersection...");
                    if (!clickable.checkRayTorusIntersection (rayDir, camera_pos)) {
                        if (i in transformable_joints)
                            clickable.checkRayAxisIntersection (rayDir, camera_pos);
                    }
                }
                if (hover) {
                    clickable.isHovered = true;
                    params["draw_once"] = true;
                    render();
                } else {
                    clickable.isHovered = false;
                }
                
            }
        };
    }

    if (!mouseDownHandler) {
        mouseDownHandler = function(event) {
            console.log("Mouse down");
            let clicked = false;
            drag = true;
            if (params["clicked"] != null) {
                if (params["clicked"].widgetInUse()) {
                    params["clicked"].mouseDownWidget();
                    console.log ("angle widget in use");
                    return;
                }
            }
            for (var i = 0; i < clickables.length; i++) {
                if (clickables[i].isHovered) {
                    clickables[i].onClick();
                    clickables[i].isClicked = true;
                    console.log(i);
                    clickables[i].angleController.show = true;
                    params["draw_once"] = true;
                    clicked = true;
                    click_id = i;
                    params["clicked"] = clickables[i];

                    break;
                }
            }

            if (clicked) {
                for (var i = 0; i < clickables.length; i++) {
                    if(i != click_id){
                        clickables[i].isClicked = false;
                        clickables[i].angleController.show = false;
                    }
                }
            } else {
                params["clicked"] = null;
                for (var i = 0; i < clickables.length; i++) {
                    clickables[i].isClicked = false;
                    clickables[i].angleController.show = false;
                }
            }
        };
    }

    if (!mouseUpHandler) {
        mouseUpHandler = function(event) {
            drag = false;
            camera.locked = false;
            if (params["clicked"] != null) {
                params["clicked"].mouseUpWidget();
            }
        }
    }

    if (params["pause"]) {
        canvas.addEventListener('mousemove', mouseMoveHandler);
        canvas.addEventListener('mousedown', mouseDownHandler);
        canvas.addEventListener('mouseup', mouseUpHandler);
    } else {
        canvas.removeEventListener('mousemove', mouseMoveHandler);
        canvas.removeEventListener('mousedown', mouseDownHandler);
        canvas.removeEventListener('mouseup', mouseUpHandler);
    }
}

