export class KeyframeWidget {
    constructor(time, tot_frames, params, index, keyframeUpdator){
        this.tot_frames = tot_frames;
        this.time = time;
        this.params = params;
        this.vis_dot = null;
        this.isDragging = false;
        this.index = index;
        this.keyframeUpdator = keyframeUpdator;
    }

    showKeyframeOnTimeline(timeline_div){
        // Assuming you have a canvas or a div to draw the dot
        const dot = document.createElement('div');
        dot.style.position = 'absolute';
        //dot.style.left = `${(this.time / this.tot_frames) * 100}%`;
        const slider = document.querySelector('#timeline-slider');
        const sliderRect = slider.getBoundingClientRect();
        const slider_val = parseInt(slider.value, 10)
        const thumbPosition = (slider_val / slider.max) * sliderRect.width + sliderRect.left - 10;
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
        dot.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            document.addEventListener('mousemove', this.onMouseMove.bind(this));
            document.addEventListener('mouseup', this.onMouseUp.bind(this));
        });
    }

    deselect(){
        this.vis_dot.style.backgroundColor = "blue";
    }

    select(){
        this.vis_dot.style.backgroundColor = "yellow";
    }

    onMouseMove(e) {
        if (!this.isDragging) return;
        const slider = document.querySelector('#timeline-slider');
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
        }
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

