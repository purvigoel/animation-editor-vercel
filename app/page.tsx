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
import { FloorRenderer } from "./lib/floor_renderer";
import {AngleControllerRenderer} from "./lib/angle_controller_renderer";
import {angle_to_rotmat} from "./lib/angle_controller";
import { SkeletonRenderer } from "./lib/skeleton_renderer";


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
    previousValues: {0: 0}
  };
  const tot_frames = 60;
  let globalTimeline = new Timeline(params, tot_frames);

  useEffect(() => {
    if (isInitializedRef.current) return; // Prevent re-initialization
    isInitializedRef.current = true;

    let floorRenderer: FloorRenderer | null = null;
    let actorRenderer: ActorRenderer | null = null;
    let angleControllerRenderer: AngleControllerRenderer | null = null;
    let skeletonRenderer: SkeletonRenderer | null = null;

    let actor: Actor | null = null;
    const canvas = document.getElementById("mainCanvas") as HTMLCanvasElement;
    const gl = canvas.getContext('webgl');
    const context = canvas.getContext("2d");
    
    
    //let globalTimeline = new Timeline(params, tot_frames);
    
    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }
    };
    
    resizeCanvas(); // Initial resize
    window.addEventListener('resize', resizeCanvas); 

    const initializeActor = async () => {
      console.log("initializing actor");
      actor = new Actor(tot_frames);
      await actor.init();
      actorRenderer = new ActorRenderer(gl, actor);
      skeletonRenderer = new SkeletonRenderer(gl, tot_frames, actor);
      
    };

    const initializeFloor = () => {
      floorRenderer = new FloorRenderer(gl);
    };

    const initializeAngleControlRenderer = () => {
      angleControllerRenderer = new AngleControllerRenderer(gl);
    }

    const handleFrameChange = (frame: number) => {
        if (globalTimeline) {
          globalTimeline.curr_time = frame;
          params["currTime"] = frame;
          params["draw_once"] = true;
        }
      };

    document.addEventListener('frameChange', (e: Event) => handleFrameChange((e as CustomEvent).detail));
    
    const handleAngleChange = (angle: number) => {
      if (actor) {
        const previousAngle = parseFloat(params.previousValues[0].toString()) * Math.PI / 180;
        params.previousValues[0] = angle;
        const rotmat = angle_to_rotmat(0, angle * (Math.PI / 180) - previousAngle);
        actor.update_pose(0, rotmat, 0);
        params["draw_once"] = true;
      }
    };

    document.addEventListener('angleChange', (e: Event) => handleAngleChange((e as CustomEvent).detail));
  
  
    console.log(document.getElementById("angleContainer"));
    
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

      if(gl && actor && actorRenderer && floorRenderer && angleControllerRenderer && skeletonRenderer){
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        setCurrentFrame(globalTimeline.curr_time);
        
        let to_skin = actor.get_skel_at_time( globalTimeline.curr_time);
        var A_matrix = new Float32Array(to_skin.flat());

        actorRenderer.render(gl, A_matrix);

        floorRenderer.render(gl);

        // angleControllerRenderer.render(gl, null);

        gl.disable(gl.DEPTH_TEST);
        skeletonRenderer.render(gl, globalTimeline.curr_time);
      }

      requestAnimationFrame(renderLoop);
    }
    console.log("use effect");
    initializeActor();
    initializeFloor();
    initializeAngleControlRenderer();

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
      <div className="bg-white text-gray-500 p-3 border border-gray-300 w-50 rounded shadow ml-4" id="angleContainer">
        <h3 className="text-lg font-semibold mb-2">Joint Angle </h3>

        ~ code here for buttons ~
        <div className="flex flex-row justify-between"  >
          <div className="mr-3 ml-1">-180</div>
          <input type="range" className="w-full bg-white" min={-180} max={180} onChange={(e) => {
            const angle = parseInt(e.target.value, 10);
            if (!isNaN(angle)) {
                const angle_constrained = angle > 180 ? 180 : angle < -180 ? -180 : angle;
                
                const event = new CustomEvent('angleChange', { detail: angle_constrained });
                document.dispatchEvent(event);
              } else {
               
              }
            }} />
          <div className="ml-3 mr-1">{180}</div>
        </div>
      </div>
    )
  }



  return (

    <div className="flex flex-col h-full" style={{ height: "100vh !important", paddingBottom: "3rem" }}>
      {/* Top bar */}
      <div className="bg-gray-100 p-2">
        <div className="flex w-full justify-between">
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
              name="angleInput"
              className="bg-white text-gray-500 p-2 rounded w-16 "
              value={0}
              onBlur={(e) => {
                const angle = parseInt((e.target as HTMLInputElement).value, 10);
                console.log(angle)
                if (isNaN(angle)) {
                  (e.target as HTMLInputElement).value = "0";
                }
              }}
              onChange={async (e) => {
                const angle = parseInt((e.target as HTMLInputElement).value, 10);
                console.log(angle);
                if (!isNaN(angle)) {
                  const rotmat = angle_to_rotmat(0, angle * (Math.PI / 180)); // Convert angle to radians
                  await actor.update_pose(currentFrame, rotmat, 0); // Assuming joint 0 for example
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

      </div>
      {/* Canvas */}
      <div className="flex flex-col bg-white text-white flex-grow">
        <canvas id="mainCanvas" className="border border-red-300 h-full"></canvas>
      </div>
      {/* Bottom bar */}
      <div className="p-2 fixed bottom-0 w-full bg-gray-100"
        style={{ height: "3rem" }}
      >
        <div className="flex flex-row justify-between mt-1">
          <div className="mr-3 ml-1">0</div>
          <input type="range" className="w-full bg-white" min={0} max={totalFrames} value={currentFrame} onChange={(e) => {
            const frame = parseInt(e.target.value, 10);
            if (!isNaN(frame)) {
              const frame_constrained = frame > totalFrames ? totalFrames : frame < 0 ? 0 : frame;
              setCurrentFrame(frame_constrained);
              const event = new CustomEvent('frameChange', { detail: frame_constrained });
              document.dispatchEvent(event);
            } else {
              setCurrentFrame(0);
            }
          }} />
          <div className="ml-3 mr-1">{totalFrames}</div>
        </div>

      </div>


    </div>
  );
}

