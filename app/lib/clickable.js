import { vec3, vec4, mat3 } from 'gl-matrix';
import { torusDataX, torusDataY, torusDataZ, checkRayTorusIntersection } from './torus.js';
import { cylinderDataX, cylinderDataY, cylinderDataZ } from './cylinder.js';
import {angle_to_rotmat} from "./angle_controller";
import {camera} from "./camera.js";
import { shadowDepthSampler } from './light.js';
import { undo_log, action_log } from "./mouse_handler.js";
import { update_rotmat } from "./angle_controller";

import * as tf from '@tensorflow/tfjs';
import { IKControllerWidget } from "./ik_controller_widget.js";

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
        //this.angleController = new AngleControllerWidget(this.origin, device, actor.angleControllerRenderer);
        this.ikController = new IKControllerWidget(this.origin, device, actor.angleControllerRenderer, id, actor);
        this.id = id;
        this.actor = actor;
        this.rotmat = null;

        this.startTime = 0;
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

            let theta = 0;
            let sign = 0;
            if (torus.lastPointOnPlane != null) {
                let cross = vec3.create();
                vec3.cross (cross, pointOnPlane, torus.lastPointOnPlane);
                let dot = Math.min (1.0, vec3.dot (pointOnPlane, torus.lastPointOnPlane));
                theta = Math.acos (dot);
                sign = -Math.sign(vec3.dot (cross, torus.normal));
            }
            torus.lastPointOnPlane = pointOnPlane;
            //console.log ("dot: %f", dot);
            // console.log ("theta: %f", theta);
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
            //console.log ("Sign: %d", Math.sign(diff));
            // console.log ("diff: %f", diff);
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

    calculateRotmat (frame) {
        let pose = this.actor.smpl.full_pose;
        let parents = this.actor.smpl.parents.arraySync();
        let current = this.id;
        this.rotmat = tf.tensor([[1,0,0],[0,1,0],[0,0,1]]);
        while (current != -1) {
            this.rotmat = tf.matMul (tf.tensor(pose[0][frame][current], [3, 3]), this.rotmat);
            current = parents[current];
        }
    };

    mouseDownWidget (params) {
        for (let shape of shapes) {
            if (shape.isHovered) {
                console.time();
                this.startTime = window.performance.now();

                if (shape.transformType == "rotation") {
                    // Calculate parent rotation matrix here so we don't have to recompute 4 every drag.
                    this.calculateRotmat(params["currTime"]);
                }



                shape.isDragged = true;
            }
        }
    }

    mouseUpWidget (params) {
        for (let shape of shapes) {
            if (shape.isDragged) {
                let endTime = window.performance.now();
                action_log.push ([this.startTime, endTime - this.startTime, params["currTime"], this.id,  shape.totalChange, shape.axis, shape.transformType]);

                console.log ("Joint %d was edited in keyframe %d (%s)", this.id, params["currTime"], shape.totalChange, shape.transformType);
                console.timeEnd();
                undo_log.push ( {joint: this, time: params["currTime"], axis: shape.axis, value: shape.totalChange, type: shape.transformType, normal: shape.normal} );
            }
            shape.totalChange = 0;
            shape.isHovered = false;
            shape.isDragged = false;
        }

        for (let ring of rings) {
            ring.lastPointOnPlane = null;
        }

        for (let arrow of arrows) {
            arrow.lastPointOnPlane = this.origin;
        }
    }

    rotate (axis, angle, frame) {
        this.calculateRotmat (frame);
        const rotmat = update_rotmat (axis, angle, this.rotmat);
        this.actor.update_pose (frame, rotmat, this.id);
    }

    dragWidget (params, rayDir, camera_pos) {
        for (let ring of rings) {
            if (ring.isDragged) {
                camera.locked = true;
                var sign = this.getRayTorusMotion (rayDir, camera_pos, ring);
                ring.totalChange += sign;
                //const rotmat = angle_to_rotmat(0, sign * 0.1);
                if (!(this.id in params.previousValues)) {
                    params.previousValues[this.id] = [0, 0, 0];
                }
                if ( !(params.keyframe_inds.indexOf(params["currTime"]) > -1 )) {
                    params.keyframe_creation_widget.createKeyframe(params["currTime"]);
                } 
                const rotmat = update_rotmat (ring.normal, sign, this.rotmat);
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
                //åconsole.log (arrow.axis);
                
                const translate_by = this.getRayArrowMotion (rayDir, camera_pos, arrow);
                arrow.totalChange += translate_by;
                //console.log(arrow.totalChange)
                if (this.id != 0){
                    // params.previousValues_trans[this.id][arrow.axis] = translation;
                    let ik_val = this.ikController.update_position(translate_by, arrow.axis);

                    if (ik_val.success) {
                        this.actor.update_pose_ik(params["currTime"], ik_val.a_lr_mat, this.ikController.kinematic_chain[0]);
                        this.actor.update_pose_ik(params["currTime"], ik_val.b_lr_mat, this.ikController.kinematic_chain[1]);

                    }
                } else if (this.id == 0){
                    this.actor.update_trans(params["currTime"], translate_by, arrow.axis);
                }
                params["draw_once"] = true;
                return true;
            }
        }

        camera.locked = false;
        return false;
    }

}

