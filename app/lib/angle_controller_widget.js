import { AngleControllerRenderer } from "./angle_controller_renderer";

export class AngleControllerWidget {
    constructor(origin, gl) {
        this.origin = origin;
        this.gl = gl;
        this.show = false;
        this.renderer = new AngleControllerRenderer(this.gl);
    }

    render(device, origin){
        console.log ("angle_controller_widget render");
        if(this.show){
            this.renderer.render(device, origin);
        }
    }
}

