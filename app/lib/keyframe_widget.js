import {undo_log, action_log} from "./mouse_handler.js";

export class KeyframeWidget {
    constructor(time, tot_frames, params, index, keyframeUpdator){
        this.tot_frames = tot_frames;
        this.time = time;
        this.params = params;
        this.vis_dot = null;
        this.selected = false;
        this.lastX = 0;

        this.delta = 0;
        this.isDragging = false;
        this.index = index;
        this.keyframeUpdator = keyframeUpdator;
    }

    showKeyframeOnTimeline(timeline_div){
        // Assuming you have a canvas or a div to draw the dot
        const dot = document.createElement('div');
        dot.draggable = true;
        dot.style.position = 'absolute';
        //dot.style.left = `${(this.time / this.tot_frames) * 100}%`;
        const slider = document.querySelector('#timeline-slider');
        const sliderRect = slider.getBoundingClientRect();
        const slider_val = parseInt(slider.value, 10)
        let thumbPosition = (slider_val / slider.max) * sliderRect.width + sliderRect.left - 10;
        dot.style.left = `${thumbPosition}px`;
        dot.style.width = '20px';
        dot.style.height = '20px';
        dot.style.backgroundColor = 'blue';
        dot.style.borderRadius = '50%';
        dot.style.cursor = "move";
        timeline_div.appendChild(dot);
        this.vis_dot = dot;

        this.lastX = thumbPosition;

        dot.addEventListener('click', () => {
            //console.log("click");
            const event = new CustomEvent('frameChange', { detail: this.time });
            document.dispatchEvent(event);
            //dot.style.backgroundColor="yellow";
            if (this.selected) {
                this.deselect();
                
            } else {
                this.select();
                this.selected = true;
            }   
            
        });

        dot.addEventListener('drag', (e) => {
            this.select();
            //console.log("dragged");
            // console.log(this.time);

            const mouseX = e.clientX;
            if (mouseX == 0) return;

            const xDiff = (mouseX - this.lastX);
           // this.delta += (mouseX - this.lastX) * 0.02;
            this.lastX = mouseX;
            
            thumbPosition += xDiff; 
            thumbPosition = Math.max (sliderRect.left - 10, Math.min (sliderRect.width + sliderRect.left - 10, thumbPosition));
            this.vis_dot.style.left =  `${thumbPosition}px`;
            // this.vis_dot.style.backgroundColor = 'green';
        });

        dot.addEventListener('dragend', (e) => {
            const new_time = Math.floor ( slider.max * (thumbPosition + 10  - sliderRect.left)/sliderRect.width );
            const event = new CustomEvent('frameShift', { detail: {oldFrame: this.time, newFrame: new_time} });
            document.dispatchEvent(event);

            //console.log ("new_time: ", new_time);
            action_log.push([window.performance.now(), this.time, new_time, "", "", "frame shift"]);
            undo_log.push({time: new_time, old_time: this.time, vis_dot: this.vis_dot, type: "frameShift"});
            this.time = new_time;
            
            
            //console.log ("Element drag ended");
            //console.log (e.clientX);
            //console.log (this.vis_dot.style.left);
            this.deselect();
        });
        dot.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            document.addEventListener('mousemove', this.onMouseMove.bind(this));
            document.addEventListener('mouseup', this.onMouseUp.bind(this));
        });
    }

    set_time (time) {
        this
    }

    deselect(){
        this.vis_dot.style.backgroundColor = "blue";
        this.selected = false;
    }

    select(){
        for (let i = 0; i < this.params.keyframe_widgets.length; i++) {
            this.params.keyframe_widgets[i].deselect();
        }
        this.vis_dot.style.backgroundColor = "yellow";
        this.selected = true;
    }

    onMouseMove(e) {
        if (!this.isDragging) return;
        /* const slider = document.querySelector('#timeline-slider');
        const sliderRect = slider.getBoundingClientRect();
        const newLeft = e.clientX - sliderRect.left;
        const newTime = Math.round((newLeft / sliderRect.width) * this.tot_frames);
        if (newTime >= 0 && newTime < this.tot_frames) {
            let old_time = this.time;
            this.time = newTime;
            this.vis_dot.style.left = `${newLeft}px`;
            this.params.keyframe_inds = this.params.keyframe_inds.map(time => time === this.time ? newTime : time);
            //const event = new CustomEvent('frameChange', { detail: newTime });
            //document.dispatchEvent(event);
            this.keyframeUpdator.update_keyframe_timing(this.index, newTime, old_time);
        } */
    }

    onMouseUp() {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.onMouseMove.bind(this));
        document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    }

    showKeyframeOnTimeline_no_event( timeline_div, time){
        // Assuming you have a canvas or a div to draw the dot
        const dot = document.createElement('div');
        dot.style.position = 'absolute';
        const slider = document.querySelector('#timeline-slider');
        const sliderRect = slider.getBoundingClientRect();
        
        const thumbPosition = (time / slider.max) * sliderRect.width + sliderRect.left - 10;
        dot.style.left = `${thumbPosition}px`;
        dot.style.width = '20px';
        dot.style.height = '20px';
        dot.style.backgroundColor = 'blue';
        dot.style.borderRadius = '50%';
        timeline_div.appendChild(dot);
        this.vis_dot = dot;

        dot.addEventListener('click', () => {
            const event = new CustomEvent('frameChange', { detail: this.time });
            document.dispatchEvent(event);
            //dot.style.backgroundColor="yellow";
            this.select();
        });
        if(time > 0 && time < this.tot_frames){
            dot.addEventListener('mousedown', (e) => {
                this.isDragging = true;
                document.addEventListener('mousemove', this.onMouseMove.bind(this));
                document.addEventListener('mouseup', this.onMouseUp.bind(this));
            });
        }
    }
}

