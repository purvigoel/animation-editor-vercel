export class KeyframeWidget {
    constructor(time, tot_frames, params){
        this.tot_frames = tot_frames;
        this.time = time;
        this.params = params;
        this.vis_dot = null;
        this.selected = false;
        this.lastX = 0;

        this.delta = 0;
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
            console.log("click");
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
            console.log("dragged");
            // console.log(this.time);

            const mouseX = e.clientX;
            if (mouseX == 0) return;

            const xDiff = (mouseX - this.lastX);
           // this.delta += (mouseX - this.lastX) * 0.02;
            this.lastX = mouseX;
            
            thumbPosition += xDiff; 
            thumbPosition = Math.max (sliderRect.left - 10, Math.min (sliderRect.width + sliderRect.left - 10, thumbPosition));
            this.vis_dot.style.left =  `${thumbPosition}px`;
            this.vis_dot.style.backgroundColor = 'green';
        });

        dot.addEventListener('dragend', (e) => {
            const new_time = Math.floor ( slider.max * (thumbPosition + 10  - sliderRect.left)/sliderRect.width );
            const event = new CustomEvent('frameShift', { detail: {oldFrame: this.time, newFrame: new_time} });
            document.dispatchEvent(event);

            console.log ("new_time: ", new_time);

            this.time = new_time;
            

            console.log ("Element drag ended");
            console.log (e.clientX);
            console.log (this.vis_dot.style.left);
            this.deselect();
        });
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
    }
}

