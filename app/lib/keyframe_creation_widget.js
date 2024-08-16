import { KeyframeWidget } from './keyframe_widget';

export class KeyframeCreationWidget {
  constructor(params, tot_frames) {
    this.params = params;
    this.tot_frames = tot_frames;
    this.keyframes = [];
    
    this.timeline_div = null; //document.getElementById('timeline');
    this.params.keyframe_creation_widget = this;
    
  }

  createKeyframe(time) {
    console.log ("Keyframe created at time %d", time);
    let keyframe_widget = new KeyframeWidget(time, this.tot_frames, this.params);
    keyframe_widget.showKeyframeOnTimeline(this.timeline_div);
    this.keyframes.push(keyframe_widget);
    this.params.keyframe_widgets.push(keyframe_widget);
    this.params.keyframe_inds.push(time);

  }

  shiftKeyframe (oldTime, newTime) {
    console.log ("Keyframe at time %f shifted to %f", oldTime, newTime);
    this.params.keyframe_inds[this.params.keyframe_inds.indexOf(oldTime)] = newTime;
  }

  createKeyframe_no_event(time){
    let keyframe_widget = new KeyframeWidget(time, this.tot_frames, this.params);
    keyframe_widget.showKeyframeOnTimeline_no_event( this.timeline_div, time);
    this.keyframes.push(keyframe_widget);
    this.params.keyframe_widgets.push(keyframe_widget);
    this.params.keyframe_inds.push(time);
  }

  

}

