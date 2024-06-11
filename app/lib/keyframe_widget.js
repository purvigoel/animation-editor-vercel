export class KeyframeWidget {
    constructor(time, tot_frames, params){
        this.tot_frames = tot_frames;
        this.time = time;
        this.params = params;
        this.vis_dot = null;
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
        });
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
        });
    }
}

