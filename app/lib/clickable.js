import { vec3, vec4, mat3 } from 'gl-matrix';
import { AngleControllerWidget } from './angle_controller_widget';
import { torusDataX, torusDataY, torusDataZ, checkRayTorusIntersection } from './torus.js';
import {angle_to_rotmat} from "./angle_controller";
import {camera} from "./camera.js";

export class Clickable {
    constructor(origin, radius, id, device, actor) {
        this.origin = vec3.fromValues(origin[0], origin[1], origin[2]);
        this.radius = radius;
        this.isHovered = false;
        this.isClicked = false;
        this.angleController = new AngleControllerWidget(this.origin, device);
        this.id = id;
        this.actor = actor;
    }

    checkRaySphereIntersection(rayDir, camera_pos) {
        const radius = this.radius;
        const eyeToCenter = vec3.create();
        vec3.sub(eyeToCenter, this.origin, camera_pos);
        const b = 2.0 * vec3.dot(rayDir, eyeToCenter);
        const c = vec3.squaredLength(eyeToCenter) - radius * radius;
        const discriminant = b * b - 4.0 * c;
        return discriminant >= 0;
    }    
    
    checkRayPlaneIntersection (rayDir, camera_pos, torus) {
        const denom = vec3.dot (rayDir, torus.normal);
        if (Math.abs(denom) > 0.0001) {
            const eyeToCenter = vec3.create();
            vec3.sub (eyeToCenter, this.origin, camera_pos);
            const t = vec3.dot (eyeToCenter, torus.normal) / denom;

            const pointOnPlane = vec3.create();
            vec3.scale (pointOnPlane, rayDir, t);
            vec3.add (pointOnPlane, pointOnPlane, camera_pos);

           //  console.log("t: %f", t);
           //  console.log ("Intersection with x-plane: %f, %f, %f", pointOnPlane[0], pointOnPlane[1], pointOnPlane[2]);

            vec3.sub (pointOnPlane, pointOnPlane, this.origin);
            vec3.normalize (pointOnPlane, pointOnPlane);

            let cross = vec3.create();
            vec3.cross (cross, pointOnPlane, torus.lastPointOnPlane);
            torus.lastPointOnPlane = pointOnPlane;
            if (cross[torus.axis] > 0) {
                console.log ("Clockwise");
                return -1;
            } else {
                console.log("Counterclockwise");
                return 1;
            }
            console.log ("Cross product: %f, %f, %f", cross[0], cross[1], cross[2]);
            
            console.log ("theta: %f", Math.acos(pointOnPlane[2]));
            if (t >= 0) return true;
        }
        return 1;
    }

    checkRayTorusIntersection (rayDir, camera_pos) {
        let r4 = this.angleController.renderer.rotation;
        let rotation = mat3.fromValues(r4[0], r4[1], r4[2], r4[4], r4[5], r4[6], r4[8], r4[9], r4[10]);
        if (checkRayTorusIntersection (torusDataX, rayDir, camera_pos, this.origin, rotation))
            console.log ("hit the X torus");
        if (checkRayTorusIntersection (torusDataY, rayDir, camera_pos, this.origin, rotation))
            console.log ("hit the Y torus");
        if (checkRayTorusIntersection (torusDataZ, rayDir, camera_pos, this.origin, rotation))
            console.log ("hit the Z torus");
    }


    widgetInUse () {
        return (torusDataX.isHovered ||
            torusDataY.isHovered ||
            torusDataZ.isHovered);
    }

    mouseDownWidget () {
        if (torusDataX.isHovered) {
            torusDataX.isDragged = true;
        }
        if (torusDataY.isHovered) {
            torusDataY.isDragged = true;
        }
        if (torusDataZ.isHovered) {
            torusDataZ.isDragged = true;
        }
    }

    mouseUpWidget () {
        torusDataX.isHovered = false;
        torusDataX.isDragged = false;
        torusDataY.isHovered = false;
        torusDataY.isDragged = false;
        torusDataZ.isHovered = false;
        torusDataZ.isDragged = false;
    }

    dragWidget (params, rayDir, camera_pos) {
        if (torusDataX.isDragged) {
            camera.locked = true;
            console.log ("torus X being dragged");
            var sign = this.checkRayPlaneIntersection (rayDir, camera_pos, torusDataX);
            //const rotmat = angle_to_rotmat(0, sign * 0.1);
            if (!(this.id in params.previousValues)) {
                params.previousValues[this.id] = [0, 0, 0];
            }
            if ( !(params.keyframe_inds.indexOf(params["currTime"]) > -1 )) {
                params.keyframe_creation_widget.createKeyframe(params["currTime"]);
            }
            const rotmat = this.angleController.update_rotmat (0, sign * 0.1);
            this.actor.update_pose (params["currTime"], rotmat, this.id);
            //this.angleController.update_rotmat (Array.from(rotmat.dataSync()));
            params["draw_once"] = true;
            return true;
        }
        if (torusDataY.isDragged) {
            camera.locked = true;
            console.log ("torus Y being dragged");
            var sign = this.checkRayPlaneIntersection (rayDir, camera_pos, torusDataY);
            // const rotmat = angle_to_rotmat(1, sign * 0.1);
            if (!(this.id in params.previousValues)) {
                params.previousValues[this.id] = [0, 0, 0];
            }
            if ( !(params.keyframe_inds.indexOf(params["currTime"])  > -1)) {
                params.keyframe_creation_widget.createKeyframe(params["currTime"]);
            }
            const rotmat = this.angleController.update_rotmat (1, sign * 0.1);
            this.actor.update_pose (params["currTime"], rotmat, this.id);
            // this.angleController.update_rotmat (Array.from(rotmat.dataSync()));
            params["draw_once"] = true;
            return true;
        }
        if (torusDataZ.isDragged) {
            camera.locked = true;
            console.log ("torus Z being dragged");
            var sign = this.checkRayPlaneIntersection (rayDir, camera_pos, torusDataZ);
            // const rotmat = angle_to_rotmat(2, sign * 0.1);
            if (!(this.id in params.previousValues)) {
                params.previousValues[this.id] = [0, 0, 0];
            }
            if ( !(params.keyframe_inds.indexOf(params["currTime"])  > -1)) {
                params.keyframe_creation_widget.createKeyframe(params["currTime"]);
            }
            const rotmat = this.angleController.update_rotmat (2, sign * 0.1);
            this.actor.update_pose (params["currTime"], rotmat, this.id);
            // this.angleController.update_rotmat (Array.from(rotmat.dataSync()));
            params["draw_once"] = true;
            return true;
        }
        camera.locked = false;
        return false;
    }

    /*checkRayTorusIntersection(rayDir, camera_pos) {
        // Offset
       // const camera_pos = vec3.add (camera_pos, this.origin);
        // Check torus X

        // Check torus Y

        // Check torus Z
        
    }*/
    

    onClick() {
        this.angleController.show = true;
    }
}

