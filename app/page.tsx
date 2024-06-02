"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Actor } from "./lib/actor";
import { ActorRenderer } from "./lib/actor_renderer";
import {addAllEvents} from "./lib/key_handler.js";
import {Timeline} from "./lib/timeline.js";

export default function Home() {

  //const actor = useRef(null);
  const isInitializedRef = useRef(false); // useRef to persist state across renders

  useEffect(() => {
    if (isInitializedRef.current) return; // Prevent re-initialization
    isInitializedRef.current = true;

    const tot_frames = 60;
    let actorRenderer: ActorRenderer | null = null;
    let actor: Actor | null = null;
    const canvas = document.getElementById("mainCanvas") as HTMLCanvasElement;
    const gl = canvas.getContext('webgl');
    const context = canvas.getContext("2d");
    
    const initializeActor = async () => {
      console.log("initializing actor");
      actor = new Actor(tot_frames);
      await actor.init();
      actorRenderer = new ActorRenderer(gl, actor);
    };
  
    let lastFrameTime = 0;
    let frameDuration = 1000 / 40;
    let params = {
      pause: false,
      draw_once: false,
      currTime: 0,
    };
    
    let globalTimeline = new Timeline(params, tot_frames);

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

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <div className="w-full bg-gray-400 p-2 text-white flex justify-between fixed top-0">
        <button className="bg-white text-red-500 p-2 rounded">Button 1</button>
        <button className="bg-white text-red-500 p-2 rounded">Button 2</button>
        <button className="bg-white text-red-500 p-2 rounded">Button 3</button>
      </div>
      <div className="flex-grow flex flex-col items-center justify-center w-full">
        <canvas id="mainCanvas" className="border border-red-500 bg-white w-full" width="500" height="500"></canvas>
      </div>
      <div className="w-full bg-gray-400 p-2 text-white flex justify-between fixed bottom-0">
        <input type="range" className="mt-4 w-full bg-white" />
      </div>
    </main>
  );
}

