"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Actor } from "./lib/actor";
import { ActorRenderer } from "./lib/actor_renderer";
import {addAllEvents} from "./lib/key_handler.js";
import {Timeline} from "./lib/timeline.js";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faAngleDoubleRight, faAngleDown, faAngleUp } from '@fortawesome/free-solid-svg-icons';
import { Popover } from 'react-tiny-popover';


export default function Home() {

  //const actor = useRef(null);
  const isInitializedRef = useRef(false); // useRef to persist state across renders

  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(60);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  let params = {
    pause: false,
    draw_once: false,
    currTime: 0,
  };
  const tot_frames = 60;
  let globalTimeline = new Timeline(params, tot_frames);

  useEffect(() => {
    if (isInitializedRef.current) return; // Prevent re-initialization
    isInitializedRef.current = true;

    
    let actorRenderer: ActorRenderer | null = null;
    let actor: Actor | null = null;
    const canvas = document.getElementById("mainCanvas") as HTMLCanvasElement;
    const gl = canvas.getContext('webgl');
    const context = canvas.getContext("2d");
    
    
    //let globalTimeline = new Timeline(params, tot_frames);
    
    const initializeActor = async () => {
      console.log("initializing actor");
      actor = new Actor(tot_frames);
      await actor.init();
      actorRenderer = new ActorRenderer(gl, actor);
    };
  
    let lastFrameTime = 0;
    let frameDuration = 1000 / 40;
    
 

    const renderLoop = (timestamp: number) => {
      if (timestamp < lastFrameTime + frameDuration) {
          requestAnimationFrame(renderLoop);
          return;
      }
      if (params["pause"] && !params["draw_once"]) {
          requestAnimationFrame(renderLoop);
          return;
      }

      lastFrameTime = timestamp;

      if (!params["draw_once"]){
          globalTimeline.increment_time();
          globalTimeline.increment_time_visual();
          params["currTime"] = globalTimeline.curr_time;
      }

      params["draw_once"] = false;

      if(gl && actor && actorRenderer){
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        setCurrentFrame(globalTimeline.curr_time);
        console.log(currentFrame);

        let to_skin = actor.get_skel_at_time( globalTimeline.curr_time);
        var myArray = new Float32Array(to_skin.flat());
        actorRenderer.render(gl, myArray);
      }

      requestAnimationFrame(renderLoop);
    }
    console.log("use effect");
    initializeActor();

    addAllEvents(canvas, renderLoop, params);

    requestAnimationFrame(renderLoop);
  }, []);

  const handleDownload = () => {
    console.log("Downloading...");
  }

  const handlePositions = () => {
    console.log("Downloading...");
  }

  // TODO: Add buttons for each joint, and sync approriately
  const popoverContent = () => {
    return (
      <div className="bg-white text-gray-500 p-3 border border-gray-300 w-50 rounded shadow ml-4">
        <h3 className="text-lg font-semibold mb-2">Frame {currentFrame}</h3>

        ~ code here for buttons ~
        <div className="flex flex-row justify-between">
          <div className="mr-3 ml-1">0</div>
          <input type="range" className="w-full bg-white" min={0} max={totalFrames} value={currentFrame} onChange={(e) => setCurrentFrame(parseInt(e.target.value, 10) || 0)} />
          <div className="ml-3 mr-1">{totalFrames}</div>
        </div>
      </div>
    )
  }



  return (
    <main className="h-full w-full h-screen">
      <div className="flex flex-col w-full h-full">
        {/* Top bar */}
        <div className="flex  w-full bg-gray-100 justify-between p-3">
          <Popover
            isOpen={isPopoverOpen}
            positions={['bottom']}
            content={popoverContent()}
          >
            <button
              className="bg-red-200 text-red-500 font-semibold text-sm p-2 rounded mx-2"
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            >
              Joints
              {isPopoverOpen ? <FontAwesomeIcon icon={faAngleDown} className="px-1" /> : <FontAwesomeIcon icon={faAngleUp} className="px-1" />}
            </button>

          </Popover>
          <form className="flex">
            <input
              type="number"
              name="frameInput"
              className="bg-white text-gray-500 p-2 rounded w-16 "
              value={currentFrame == 0 ? "" : currentFrame}
              onBlur={(e) => {
                const frame = parseInt((e.target as HTMLInputElement).value, 10);
                if (isNaN(frame)) {
                  (e.target as HTMLInputElement).value = "0";
                }
              }}
              onChange={(e) => {
                const frame = parseInt((e.target as HTMLInputElement).value, 10);
                if (!isNaN(frame)) {
                  const frame_constrained = frame > totalFrames ? totalFrames : frame < 0 ? 0 : frame;
                  setCurrentFrame(frame_constrained);
                  
                } else {
                  setCurrentFrame(0);
                }
              }}
            />
            <span className="p-2 rounded mx-2 ">
              / {totalFrames}
            </span>
          </form>
          <button className="bg-red-200 text-red-500 font-semibold text-sm p-2 rounded mx-2" onClick={handleDownload}>
            <FontAwesomeIcon icon={faDownload} className="px-1" />
          </button>
        </div>
        {/* Canvas */}
        <div className="flex-grow flex flex-col w-full h-full bg-white text-white">
          <canvas id="mainCanvas" className="border w-full h-full" width="500" height="500"></canvas>
        </div>
        {/* Bottom bar */}
        <div className="flex flex-col w-full bg-gray-100 text-gray-500  p-3">
          <div className="flex flex-row justify-between">
            <div className="mr-3 ml-1">0</div>
            <input type="range" className="w-full bg-white" min={0} max={totalFrames} value={currentFrame} onChange={(e) =>{
               const frame = parseInt((e.target as HTMLInputElement).value, 10);
              
               if (!isNaN(frame)) {
                 const frame_constrained = frame > totalFrames ? totalFrames : frame < 0 ? 0 : frame;
                 setCurrentFrame(frame_constrained);
                 globalTimeline.curr_time = frame_constrained;
                 params["draw_once"] = true;
                 params["currTime"] = frame_constrained;
               } else {
                 setCurrentFrame(0);
               }
              }} />
            <div className="ml-3 mr-1">{totalFrames}</div>
          </div>

        </div>


      </div>
    </main>
  );
}

