export class Timeline{
    constructor(params, total_frames){
        this.curr_time = 0;
        this.bodies = [];
        this.total_frames = total_frames;
        this.render_function = null;
        this.params = params;

        this.timeline_div = document.getElementById('timeline');
        // this.timelineButton = document.getElementById('timeline-button');

        // this.timelineButton.addEventListener('mousedown', (event) => {
        //     const onMouseMove = (moveEvent) => {
        //         let timelineRect = this.timeline_div.getBoundingClientRect();
        //         let newPosition = moveEvent.clientX - timelineRect.left;
        //         if (newPosition < 0) newPosition = 0;
        //         if (newPosition > timelineRect.width) newPosition = timelineRect.width;
        //         this.update_frame_from_position(newPosition);
        //     };
    
        //     const onMouseUp = () => {
        //         document.removeEventListener('mousemove', onMouseMove);
        //         document.removeEventListener('mouseup', onMouseUp);
        //     };
    
        //     document.addEventListener('mousemove', onMouseMove);
        //     document.addEventListener('mouseup', onMouseUp);
        // });

    }

    add_body(body){
        this.bodies.push(body)
    }

    get_body_at_time(time, return_mesh){
        if (this.bodies.length == 0){
            return;
        }
        if(!return_mesh){
            return this.bodies[0].skeleton.joints[time];
        } else {
            return this.bodies[0].skeleton.mesh[time].flat();
        }
    }

    get_skel_at_time(time){
        if (this.bodies.length == 0){
            return;
        }
        return this.bodies[0].skeleton.A[time].flat();
    }

    get_mat_at_time(time){
        if (this.bodies.length == 0){
            return;
        }
        return this.bodies[0].skeleton.T[time].flat();
    }

    increment_time(){
        this.curr_time = (this.curr_time + 1) % this.total_frames;
    }

    increment_time_visual(){
        let currentFrame = this.curr_time;
        // let timelineWidth = this.timeline_div.clientWidth;
        //let buttonPosition = (currentFrame / this.total_frames) * timelineWidth;
        //this.timelineButton.style.left = `${buttonPosition}px`;
    }

    update_frame_from_position(position){
        //let timelineWidth = this.timeline_div.clientWidth;
        //this.curr_time = Math.round((position / timelineWidth) * this.total_frames);
        this.increment_time_visual(); 
        this.params["currTime"] = this.curr_time;

        this.params["draw_once"] = true;
        requestAnimationFrame(this.render_function);
    }
}

