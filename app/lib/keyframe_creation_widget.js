import { KeyframeWidget } from './keyframe_widget';
import * as tf from "@tensorflow/tfjs";

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
    //let keyframe_widget = new KeyframeWidget(time, this.tot_frames, this.params);
    let index = this.keyframes.length;
    let keyframe_widget = new KeyframeWidget(time, this.tot_frames, this.params, index, this);
    keyframe_widget.showKeyframeOnTimeline(this.timeline_div);
    this.keyframes.push(keyframe_widget);
    this.params.keyframe_widgets.push(keyframe_widget);
    this.params.keyframe_inds.push(time);
    console.log(this.params.keyframe_inds)

  }

  shiftKeyframe (oldTime, newTime) {
    console.log ("Keyframe at time %f shifted to %f", oldTime, newTime);
    this.params.keyframe_inds[this.params.keyframe_inds.indexOf(oldTime)] = newTime;
  }

  createKeyframe_no_event(time){
    let index = this.keyframes.length;
    let keyframe_widget = new KeyframeWidget(time, this.tot_frames, this.params, index, this);
    keyframe_widget.showKeyframeOnTimeline_no_event( this.timeline_div, time);
    this.keyframes.push(keyframe_widget);
    this.params.keyframe_widgets.push(keyframe_widget);
    this.params.keyframe_inds.push(time);
  }

  update_keyframe_timing(index, new_time, old_time){
    for(var i = 0; i < this.params.keyframe_inds.length; i++){
      if(this.params.keyframe_inds[i] == old_time){
        this.params.keyframe_inds[i] = new_time;
      }
    }
    this.keyframes[index].time = new_time;
    let [keyframe_pose, keyframe_trans] = this.params.actor.get_keyframe_at_time(old_time);
    this.params.actor.set_keyframe_at_time(new_time, tf.tensor(keyframe_pose), tf.tensor(keyframe_trans));
  }

}

