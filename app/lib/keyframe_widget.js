import {undo_log, action_log} from "./mouse_handler.js";

let slider = null;
let sliderRect = null;
let slider_val = null;

export function resize_slider () {
    slider = document.querySelector('#timeline-slider');
    sliderRect = slider.getBoundingClientRect();
    slider_val = parseInt(slider.value, 10)
}

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

    resize () {
        if (this.vis_dot != null) {
            this.vis_dot.style.left = `${(this.time / slider.max) * sliderRect.width + sliderRect.left - 10}px`;
            const keyframeMenu = document.getElementById("keyframeMenu");
            keyframeMenu.style.left = this.vis_dot.style.left;
        }
    }


    showKeyframeOnTimeline(timeline_div){
        // Assuming you have a canvas or a div to draw the dot
        const dot = document.createElement('div');
        dot.draggable = true;
        dot.style.position = 'absolute';
        //dot.style.left = `${(this.time / this.tot_frames) * 100}%`;
        let thumbPosition = (this.time / slider.max) * sliderRect.width + sliderRect.left - 10;
        dot.setAttribute('tabindex', '0');
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
            const copy_event = new CustomEvent('frameCopy', {detail : this.time});
            document.dispatchEvent (copy_event);

            const event = new CustomEvent('frameChange', { detail: this.time });
            document.dispatchEvent(event);
            //dot.style.backgroundColor="yellow";
            if (this.selected) {
                this.deselect();
                
            } else {
                this.select();
            }   
            
            const hide_event = new CustomEvent ('hideContextMenu');
            document.dispatchEvent (hide_event);
        });


        dot.addEventListener ('keyup', (e) => {
           // console.log (e.key);
            if (e.key == 'Backspace' ) {
                if (this.selected) {
                    console.log ("Deleting keyframe.");
                    const event = new CustomEvent('frameDelete', {detail: this.time});
                    document.dispatchEvent (event);
                    /*this.vis_dot.remove();
                    this.params.keyframe_widgets.splice (this.index, 1);*/
                    // this.remove();
                }
            }

        });

        dot.addEventListener ('contextmenu', (e) => {
            e.preventDefault();

            /* select this dot */
            const event = new CustomEvent('frameChange', { detail: this.time });
            document.dispatchEvent(event);
            this.select();

            const keyframeMenu = document.getElementById("keyframeMenu");
            console.log (keyframeMenu.style.display );

            keyframeMenu.style.display ='block';
            keyframeMenu.style.left = dot.style.left;
            keyframeMenu.style.bottom = '4%';

            console.log (keyframeMenu.style.display );
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
            const new_time = Math.round ( slider.max * (thumbPosition + 10  - sliderRect.left)/sliderRect.width );

            // Delete any existing keyframe at thew new time.
            if (this.params.keyframe_inds.indexOf(new_time) != -1) {
                const event = new CustomEvent('frameDelete', {detail: new_time});
                document.dispatchEvent (event);
            }

            // Force thumb position at discrete interval (otherwise the red dot will be uncomfortably offset)
            thumbPosition = (new_time / slider.max) * sliderRect.width + sliderRect.left - 10;
            this.vis_dot.style.left =  `${thumbPosition}px`;

            const event = new CustomEvent('frameShift', { detail: {oldFrame: this.time, newFrame: new_time} });
            document.dispatchEvent(event);

            //console.log ("new_time: ", new_time);
            action_log.push([window.performance.now(), this.time, new_time, "", "", "", "frame shift"]);
            undo_log.push({time: new_time, old_time: this.time, widget: this, type: "frameShift", 
                            old_pos: (this.time / slider.max) * sliderRect.width + sliderRect.left - 10, new_pos: thumbPosition});
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

        dot.addEventListener ('contextmenu', (e) => {
            e.preventDefault();

            /* select this dot */
            const event = new CustomEvent('frameChange', { detail: this.time });
            document.dispatchEvent(event);
            this.select();

            const keyframeMenu = document.getElementById("keyframeMenu");
            console.log (keyframeMenu.style.display );

            keyframeMenu.style.display ='block';
            keyframeMenu.style.left = dot.style.left;
            keyframeMenu.style.bottom = '4%';

            console.log (keyframeMenu.style.display );
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

