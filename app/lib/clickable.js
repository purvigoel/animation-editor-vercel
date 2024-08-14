import { vec3, vec4, mat3 } from 'gl-matrix';
import { AngleControllerWidget } from './angle_controller_widget';
import { torusDataX, torusDataY, torusDataZ, checkRayTorusIntersection } from './torus.js';
import { cylinderDataX, cylinderDataY, cylinderDataZ } from './cylinder.js';
import {angle_to_rotmat} from "./angle_controller";
import {camera} from "./camera.js";

const shapes = [torusDataX, torusDataY, torusDataZ,
                cylinderDataX, cylinderDataY, cylinderDataZ];
const rings = [torusDataX, torusDataY, torusDataZ];
const arrows = [ cylinderDataX, cylinderDataY, cylinderDataZ ];

export class Clickable {
    constructor(origin, radius, id, device, actor) {
        this.origin = vec3.fromValues(origin[0], origin[1], origin[2]);
        this.radius = radius;
        this.isHovered = false;
        this.isClicked = false;
        this.angleController = new AngleControllerWidget(this.origin, device, actor.angleControllerRenderer);
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
    
    getRayTorusMotion (rayDir, camera_pos, torus) {
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
            let dot = Math.min (1.0, vec3.dot (pointOnPlane, torus.lastPointOnPlane));
            let theta = Math.acos (dot);
            torus.lastPointOnPlane = pointOnPlane;
            console.log ("dot: %f", dot);
            console.log ("theta: %f", theta);
            let sign = -Math.sign(vec3.dot (cross, torus.normal));
            return sign * theta;
        }
        return 1;
    }

    getRayArrowMotion (rayDir, camera_pos, arrow) {
        const denom = vec3.dot (rayDir, arrow.normal);
        if (Math.abs(denom) > 0.0001) {
            const eyeToCenter = vec3.create();
            vec3.sub (eyeToCenter, this.origin, camera_pos);
            const t = vec3.dot (eyeToCenter, arrow.normal) / denom;

            const pointOnPlane = vec3.create();
            vec3.scale (pointOnPlane, rayDir, t);
            vec3.add (pointOnPlane, pointOnPlane, camera_pos);

            // vec3.sub (pointOnPlane, pointOnPlane, this.origin);
            // vec3.normalize (pointOnPlane, pointOnPlane);

            let diff = pointOnPlane[arrow.axis] - arrow.lastPointOnPlane[arrow.axis];
            console.log ("Sign: %d", Math.sign(diff));
            console.log ("diff: %f", diff);
            arrow.lastPointOnPlane = pointOnPlane;
            return diff;
        }


    }

    checkRayTorusIntersection (rayDir, camera_pos) {
        for (let ring of rings) {
            if (checkRayTorusIntersection (ring, rayDir, camera_pos, this.origin)) {
                return true;
            } 
        }
        return false;
    }

    checkRayAxisIntersection (rayDir, camera_pos) {
        for (let arrow of arrows) {
            if (checkRayTorusIntersection (arrow, rayDir, camera_pos, this.origin)) {
                return;      
            }
        }
    }


    widgetInUse () {
        for (let shape of shapes) {
            if (shape.isHovered) {
                return true;
            }
        }
        return false;
    }

    mouseDownWidget () {
        for (let shape of shapes) {
            if (shape.isHovered) {
                shape.isDragged = true;
            }
        }
    }

    mouseUpWidget () {
        for (let shape of shapes) {
            shape.isHovered = false;
            shape.isDragged = false;
        }
    }

    dragWidget (params, rayDir, camera_pos) {
        for (let ring of rings) {
            if (ring.isDragged) {
                camera.locked = true;
                var sign = this.getRayTorusMotion (rayDir, camera_pos, ring);
                //const rotmat = angle_to_rotmat(0, sign * 0.1);
                if (!(this.id in params.previousValues)) {
                    params.previousValues[this.id] = [0, 0, 0];
                }
                if ( !(params.keyframe_inds.indexOf(params["currTime"]) > -1 )) {
                    params.keyframe_creation_widget.createKeyframe(params["currTime"]);
                }
                const rotmat = this.angleController.update_rotmat (ring.axis, sign);
                this.actor.update_pose (params["currTime"], rotmat, this.id);
                params["draw_once"] = true;
                return true;
            }            
        }

        for (let arrow of arrows) {
            if (arrow.isDragged) {
                camera.locked = true;
                if (!(this.id in params.previousValues)) {
                    params.previousValues_trans[this.id] = [0, 0, 0];
                }
                if ( !(params.keyframe_inds.indexOf(params["currTime"]) > -1 )) {
                    params.keyframe_creation_widget.createKeyframe(params["currTime"]);
                }
                console.log (arrow.axis);
                const previousTrans = params.previousValues_trans[this.id][arrow.axis];
                
                const translate_by = this.getRayArrowMotion (rayDir, camera_pos, arrow);
                // params.previousValues_trans[this.id][arrow.axis] = translation;
              
                this.actor.update_trans(params["currTime"], translate_by, arrow.axis);
      
                params["draw_once"] = true;
                return true;
            }
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

