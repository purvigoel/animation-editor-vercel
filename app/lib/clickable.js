import { vec3, vec4 } from 'gl-matrix';
import { AngleControllerWidget } from './angle_controller_widget';

export class Clickable {
    constructor(origin, radius, gl, id) {
        this.origin = vec3.fromValues(origin[0], origin[1], origin[2]);
        this.radius = radius;
        this.isHovered = false;
        this.isClicked = false;
        this.angleController = new AngleControllerWidget(this.origin, gl);
        this.id = id;
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

    onClick() {
        //this.angleController.render = True;
    }
}

