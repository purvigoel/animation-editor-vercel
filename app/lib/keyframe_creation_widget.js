import { KeyframeWidget } from './keyframe_widget';

export class KeyframeCreationWidget {
  constructor(params, tot_frames) {
    this.params = params;
    this.tot_frames = tot_frames;
    this.keyframes = [];
    this.timeline_div = document.getElementById('timeline');
  }

  createKeyframe(time) {
    let keyframe_widget = new KeyframeWidget(time, this.tot_frames, this.params);
    keyframe_widget.showKeyframeOnTimeline(this.timeline_div);
    this.keyframes.push(keyframe_widget);
    this.params.keyframe_widgets.push(keyframe_widget);
    this.params.keyframe_inds.push(time);

  }

  createKeyframe_no_event(time){
    let keyframe_widget = new KeyframeWidget(time, this.tot_frames, this.params);
    keyframe_widget.showKeyframeOnTimeline_no_event( this.timeline_div, time);
    this.keyframes.push(keyframe_widget);
    this.params.keyframe_widgets.push(keyframe_widget);
    this.params.keyframe_inds.push(time);
  }

  

}

