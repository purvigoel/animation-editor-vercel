import {camera} from "./camera.js";
import {addMouseEvents} from "./mouse_handler.js";

function handleScroll(event, render) {
    camera.radius += event.deltaY * 0.01;
    camera.radius = Math.max(0.5, camera.radius);
    camera.radius = Math.min(camera.radius, 3);
    render();
}

function handleMouseDown(event, render) {
    if (camera.locked) { camera.isDragging = false; return; }
    camera.isDragging = true;
    camera.lastMousePosition = { x: event.clientX, y: event.clientY };
}

function handleMouseMove(event, render) {
    if (camera.locked) return;
    if (!camera.isDragging) return;
    const deltaX = event.clientX - camera.lastMousePosition.x;
    const deltaY = event.clientY - camera.lastMousePosition.y;
    camera.lastMousePosition = { x: event.clientX, y: event.clientY };

    camera.theta += deltaX * 0.01;
    camera.phi += deltaY * 0.01;

    camera.phi = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.phi));

    render();
}

function handleKeyDown(canvas, event, render, params) {
    if (event.code === 'Space') {
        params["pause"] = !params["pause"];
        addMouseEvents(canvas, params["clickables"], render, params);
        
        for(let i = 0; i < params.keyframe_widgets.length; i++){
            params.keyframe_widgets[i].deselect();
        }
    }

    if (event.code == 'KeyA') {
        camera.theta = -2 * Math.PI/8;
        camera.phi = 0;
        //camera.phi = 12 * Math.PI/4;
        camera.radius = 1.5;
        camera.lastMousePosition = {x: 0, y: 0};
    }

    if (event.code == 'KeyD') {
        camera.theta = 2 * Math.PI/8;
        camera.phi = 0;
        //camera.phi = 12 * Math.PI/4;
        camera.radius = 1.5;
        camera.lastMousePosition = {x: 0, y: 0};
    }
}

function handleMouseUp() {
    // if (camera.locked) return;
    camera.isDragging = false;
}

export function addAllEvents(canvas, render, params){
    canvas.addEventListener('wheel', function(event){
        params["draw_once"] = true;
        handleScroll(event,render);
    });
    canvas.addEventListener('mousedown', function(event){
        params["draw_once"] = true;
        handleMouseDown(event, render);
    });
    canvas.addEventListener('mousemove', function(event){
        params["draw_once"] = true;
        handleMouseMove(event, render);
    });
    canvas.addEventListener('mouseup', function(event) {
        params["draw_once"] = true;
        handleMouseUp(event, render);
    });
    canvas.addEventListener('mouseout', function(event){
        params["draw_once"] = true;
        handleMouseUp(event, render);
    });

    window.addEventListener('keydown', function(event){
        params["draw_once"] = true;
        handleKeyDown(canvas, event, render, params);
    });
}
