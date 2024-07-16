"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Actor } from "./lib/actor";
// import { ActorRenderer } from "./lib/actor_renderer";
import {addAllEvents} from "./lib/key_handler.js";
import {Timeline} from "./lib/timeline.js";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faAngleDoubleRight, faAngleDown, faAngleUp } from '@fortawesome/free-solid-svg-icons';
import { Popover } from 'react-tiny-popover';
import { FloorRenderer } from "./lib/floor_renderer";
// import {AngleControllerRenderer} from "./lib/angle_controller_renderer";
import {angle_to_rotmat} from "./lib/angle_controller";
// import { SkeletonRenderer } from "./lib/skeleton_renderer";
import {shadowDepthTextureView, shadowBindGroup, initLight, setLightMatrix} from "./lib/light.js";
import {addMouseEvents} from "./lib/mouse_handler.js";
import {addAngleControl} from "./lib/angle_controller.js";
import {KeyframeCreationWidget} from "./lib/keyframe_creation_widget.js";
import {KeyframeWidget} from "./lib/keyframe_widget.js";
import {InterpolationWidget} from "./lib/interpolation_widget.js";
import {loadGLTF, gltf_fragmentShaderSource, gltf_vertexShaderSource, renderScene} from "./lib/scenegraph/gltf_reader.js";
import {m4} from "./lib/m4.js";

import * as tf from "@tensorflow/tfjs";
import {camera, initCamera, setCameraMatrix, getViewProjectionMatrix, adjustCamera} from "./lib/camera.js";
//import * as webglUtils from 'webgl-utils.js';

export default function Home() {

  const isInitializedRef = useRef(false); // useRef to persist state across renders

  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(60);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  interface GLTF {
    scenes: any[];
    nodes: any[];
    meshes: any[];
    accessors: any[];
    bufferViews: any[];
    buffers: any[];
    materials: any[];
    animations?: any[];
    skins?: any[];
    cameras?: any[];
    boundingBox: any;
}

  interface Params {
    pause: boolean;
    draw_once: boolean;
    currTime: number;
    previousValues: { [key: number]: number[] };
    previousValues_trans: { [key: number]: number[] };
    clickables: any[];
    clicked: { id: string | number } | null;
    keyframe_inds: number[];
    keyframe_widgets: KeyframeWidget[];
  }

  let params: Params = {
    pause: true,
    draw_once: true,
    currTime: 0,
    previousValues: {},
    previousValues_trans: {},
    clickables: [] as any[],
    clicked: null,
    keyframe_inds: [],
    keyframe_widgets: [],
  };

  const tot_frames = 60;
  
  let globalTimeline = new Timeline(params, tot_frames);
  let keyframeCreationWidget = new KeyframeCreationWidget(params, tot_frames);
  let interpolationWidget = new InterpolationWidget(params);
  let draw_gltf = false;

  let actor: Actor | null = null;

  useEffect(() => {
    async function init() {
      if (isInitializedRef.current) return; // Prevent re-initialization
      isInitializedRef.current = true;

    
      
      let gltf : GLTF | null = null;
      let floorRenderer: FloorRenderer | null = null;
      let clickables: any[] = [];

      const canvas = document.getElementById("mainCanvas") as HTMLCanvasElement;
      
      //const gl = canvas.getContext('webgl2');
    
      if (!navigator.gpu) {
        throw new Error("WebGPU not supported on this browser.");
      }

      // Get an adapter
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        throw new Error("No appropriate GPUAdapter found.");
      }

      // Get the device
      const device = await adapter.requestDevice();
      const context = canvas.getContext("webgpu");
      if (!context) {
        throw new Error ("context is null");
      }

      context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
      });

      var depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        sampleCount: 4
      });
      var depthTextureView = depthTexture.createView();

      var multisampleTexture = device.createTexture({
        format: context.getCurrentTexture().format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        size: [canvas.width, canvas.height],
        sampleCount: 4
      });

      initLight(device, canvas);
      
      const resizeCanvas = () => {
        if (canvas) {
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
          depthTexture.destroy();
          depthTexture = device.createTexture({
            size: [canvas.width, canvas.height, 1],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: 4
          });
          depthTextureView = depthTexture.createView();

          multisampleTexture.destroy();
          multisampleTexture = device.createTexture({
            format: context.getCurrentTexture().format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            size: [canvas.width, canvas.height],
            sampleCount: 4
          });
          setLightMatrix (device, canvas);
        }
      };
      
      resizeCanvas(); // Initial resize
      window.addEventListener('resize', resizeCanvas); 


      const initializeCamera = () => {
        initCamera(device);
        
      }
      
      const initializeActor = async () => {
        console.log("initializing actor");
        actor = new Actor(tot_frames, device);
        await actor.init();
        if(actor.skeletonRenderer){
          clickables.push(... actor.skeletonRenderer.getClickables());
          params["clickables"] = clickables;
        }

      };

      const initializeFloor = () => {
        floorRenderer = new FloorRenderer(device);
      };

      const handleFrameChange = (frame: number) => {
          if (globalTimeline) {
            globalTimeline.curr_time = frame;
            params["currTime"] = frame;
            params["draw_once"] = true;
          }
        };

      document.addEventListener('frameChange', (e: Event) => handleFrameChange((e as CustomEvent).detail));
      
      const handleInterpolate = async () => {
        if (actor) {
          await interpolationWidget.interpolate_all_frames(actor);
        }
      };
      document.addEventListener('interpolateChange', handleInterpolate);
      
      const handleAutoDetailRequest = async () => {
        if (actor && actor.skeleton && actor.skeletonRenderer && actor.smpl) {
          console.log("auto detail request");
          try {
            const response = await fetch('http://localhost:9090/auto-detail-request', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ detail: 'auto', keyframe_inds: params.keyframe_inds, full_pose: actor.smpl.full_pose[0], translation: actor.smpl.global_translation[0] }),
            });
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            const data = await response.json();
            const pred_poses = tf.tensor(data.data["full_pose"], [60, 24, 3, 3]);
            const pred_trans = tf.tensor(data.data["full_trans"], [ 60, 3]);
            actor.set_keyframe_all(pred_poses, pred_trans);
            await actor.update_all_poses();
            actor.skeletonRenderer.update_joints_all();
  
          } catch (error) {
            console.error('Error:', error);
          }
        }
      };
      document.addEventListener('autoDetailRequest', handleAutoDetailRequest);
      
      const handleAngleChange = async (angle: number, coord: number) => {
        if (actor && actor.skeletonRenderer && params["clicked"] != null) {
          let joint_id = params["clicked"].id as number;
          if (!(joint_id in params.previousValues)) {
            params.previousValues[joint_id] = [0, 0, 0];
          }
          
          if( !(params.keyframe_inds.indexOf(globalTimeline.curr_time) > -1)){
            keyframeCreationWidget.createKeyframe(globalTimeline.curr_time);
          }
          
          const previousAngle = parseFloat(params.previousValues[joint_id][coord].toString()) * Math.PI / 180;
          params.previousValues[joint_id][coord] = angle;
          const rotmat = angle_to_rotmat(coord, angle * (Math.PI / 180) - previousAngle);
          
          actor.update_pose(globalTimeline.curr_time, rotmat, params["clicked"].id);
  
          params["draw_once"] = true;
        }
      };
  
      document.addEventListener('angleChange', (e: Event) => {
        const { angle, coord } = (e as CustomEvent<{ angle: number, coord: number }>).detail;
        handleAngleChange(angle, coord);
      });
  
      const handleTranslationChange = async (translation: number, coord: number) => {
        if (actor && actor.skeletonRenderer && params["clicked"] != null) {
          let joint_id = params["clicked"].id as number;
          if(joint_id == 0){
            if (!(joint_id in params.previousValues_trans)) {
              params.previousValues_trans[joint_id] = [0, 0, 0];
            }
            if( !(params.keyframe_inds.indexOf(globalTimeline.curr_time) > -1)){
              keyframeCreationWidget.createKeyframe(globalTimeline.curr_time);
            }
            const previousTrans = params.previousValues_trans[joint_id][coord];
            params.previousValues_trans[joint_id][coord] = translation;
            const translate_by = translation - previousTrans;
          
            actor.update_trans(globalTimeline.curr_time, translate_by, coord);
  
            params["draw_once"] = true;
          }
          
        }
      };

      document.addEventListener('translationChange', (e: Event) => {
        const { translation, coord } = (e as CustomEvent<{ translation: number, coord: number }>).detail;
        handleTranslationChange(translation, coord);
      });
  
      keyframeCreationWidget.timeline_div = document.getElementById('timeline'); // Ensure this line is executed after the DOM is loaded
      keyframeCreationWidget.createKeyframe_no_event(0);
      keyframeCreationWidget.createKeyframe_no_event(tot_frames - 1);
      
      let camera_view = null;
      let camera_projection = null;
      let meshProgramInfo = null;
    

    let lastFrameTime = 0;
    let frameDuration = 1000 / 40;
    let loaded = false;

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

        if(loaded){
          params["draw_once"] = false;
        }
  
        setCurrentFrame(globalTimeline.curr_time);
        setCameraMatrix (device, canvas);
        if (actor && actor.actorRenderer) {
          let [to_skin, translation] = actor.get_skel_at_time( globalTimeline.curr_time);
          var A_matrix = new Float32Array(to_skin.flat());
          var trans_matrix = new Float32Array(translation.flat());
          actor.actorRenderer.updateUniformArray (device, A_matrix, trans_matrix);
          loaded = true;
        }

        let contextView = context.getCurrentTexture().createView()
        const encoder = device.createCommandEncoder();

        // Render pass for shadows
        const shadowPass = encoder.beginRenderPass ({
          colorAttachments: [],
          depthStencilAttachment: {
            view: shadowDepthTextureView,
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store'
          }

        });

        if (floorRenderer && actor && actor.actorRenderer) {
          console.log ("calculating shadow depths");
          floorRenderer.renderShadow(shadowPass);
          actor.actorRenderer.renderShadow(shadowPass);
        }

        shadowPass.end();

        
        // Actual render pass for objects.
        const pass = encoder.beginRenderPass({
          colorAttachments: [{
            view: multisampleTexture.createView(),
            resolveTarget: contextView,
            loadOp: "clear" as GPULoadOp,
            clearValue: [1, 1, 1, 1.0],
            storeOp: "store" as GPUStoreOp,
          }],
            depthStencilAttachment: {
              view: depthTextureView,
              depthClearValue: 1.0,
              depthLoadOp: "clear",
              depthStoreOp: "store",
          },
        });

        
        pass.setBindGroup(1, shadowBindGroup);
        if (floorRenderer) {
          //console.log ("rendering floor");
          floorRenderer.render(pass);
        }

        if (actor && actor.actorRenderer && actor.skeletonRenderer) {
          actor.actorRenderer.render(pass);
          actor.skeletonRenderer.render (device, pass, canvas, globalTimeline.curr_time);
        }

        
        pass.end(); 
        // Finish the command buffer and immediately submit it.
        device.queue.submit([encoder.finish()]);

        requestAnimationFrame(renderLoop);
      }

      if(!draw_gltf){
        initializeCamera();
        initializeActor();
        console.log("Initializing floor");
        initializeFloor();

      }
      addAllEvents(canvas, renderLoop, params);
      addMouseEvents(canvas, clickables, renderLoop, params);
      
      requestAnimationFrame(renderLoop);


    }
    init ();
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
      <div className="flex flex-row items-center mb-2">
        <h3 className="text-lg font-semibold mr-2">RX</h3>
        <div className="mr-3 ml-1"></div>
        <input type="range" className="w-full bg-white" min={-180} max={180} onChange={(e) => {
          const angle = parseInt(e.target.value, 10);
          if (!isNaN(angle)) {
              const angle_constrained = angle > 180 ? 180 : angle < -180 ? -180 : angle;
              const event = new CustomEvent('angleChange', { detail: { angle: angle_constrained, coord: 0 } });
              document.dispatchEvent(event);
            }
          }} />
        <div className="ml-3 mr-1"></div>
      </div>
      <div className="flex flex-row items-center mb-2">
        <h3 className="text-lg font-semibold mr-2">RY</h3>
        <div className="mr-3 ml-1"></div>
        <input type="range" className="w-full bg-white" min={-180} max={180} onChange={(e) => {
          const angle = parseInt(e.target.value, 10);
          if (!isNaN(angle)) {
              const angle_constrained = angle > 180 ? 180 : angle < -180 ? -180 : angle;
              const event = new CustomEvent('angleChange', { detail: { angle: angle_constrained, coord: 1 } });
              document.dispatchEvent(event);
            }
          }} />
        <div className="ml-3 mr-1"></div>
      </div>
      <div className="flex flex-row items-center mb-2">
        <h3 className="text-lg font-semibold mr-2">RZ</h3>
        <div className="mr-3 ml-1"></div>
        <input type="range" className="w-full bg-white" min={-180} max={180} onChange={(e) => {
          const angle = parseInt(e.target.value, 10);
          if (!isNaN(angle)) {
              const angle_constrained = angle > 180 ? 180 : angle < -180 ? -180 : angle;
              const event = new CustomEvent('angleChange', { detail: { angle: angle_constrained, coord: 2 } });
              document.dispatchEvent(event);
            }
          }} />
        <div className="ml-3 mr-1"></div>
      </div>
      <div className="flex flex-row items-center mb-2">
        <h3 className="text-lg font-semibold mr-2">TX</h3>
        <div className="mr-3 ml-1"></div>
        <input type="range" className="w-full bg-white" min={-100} max={100} onChange={(e) => {
          const translation = parseFloat(e.target.value) / 20.0; //parseInt(e.target.value, 10);
          if (!isNaN(translation)) {
            const translation_constrained = translation > 5 ? 5 : translation < -5 ? -5 : translation;
            const event = new CustomEvent('translationChange', { detail: { translation: translation_constrained, coord: 0 } });
            document.dispatchEvent(event);
            }
          }} />
        <div className="ml-3 mr-1"></div>
      </div>
      <div className="flex flex-row items-center mb-2">
        <h3 className="text-lg font-semibold mr-2">TY</h3>
        <div className="mr-3 ml-1"></div>
        <input type="range" className="w-full bg-white" min={-100} max={100} onChange={(e) => {
          const translation = parseFloat(e.target.value) / 20.0; //parseInt(e.target.value, 10);
          if (!isNaN(translation)) {
            const translation_constrained = translation > 5 ? 5 : translation < -5 ? -5 : translation;
            const event = new CustomEvent('translationChange', { detail: { translation: translation_constrained, coord: 1 } });
            document.dispatchEvent(event);
            }
          }} />
        <div className="ml-3 mr-1"></div>
      </div>
      <div className="flex flex-row items-center mb-2">
        <h3 className="text-lg font-semibold mr-2">TZ</h3>
        <div className="mr-3 ml-1"></div>
        <input type="range" className="w-full bg-white" min={-100} max={100} onChange={(e) => {
          const translation = parseFloat(e.target.value) / 20.0; //parseInt(e.target.value, 10);
          if (!isNaN(translation)) {
            const translation_constrained = translation > 5 ? 5 : translation < -5 ? -5 : translation;
            const event = new CustomEvent('translationChange', { detail: { translation: translation_constrained, coord: 2 } });
            document.dispatchEvent(event);
            }
          }} />
        <div className="ml-3 mr-1"></div>
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
          <button type="button" className="bg-green-200 text-blue-500 font-semibold text-sm p-2 rounded mx-2" onClick={(e) => {
            e.preventDefault();
            document.dispatchEvent(new CustomEvent('autoDetailRequest'));
          }}  onKeyDown={(e) => e.preventDefault()}>
            Auto Detail
          </button>
          <button type="button" className="bg-blue-200 text-blue-500 font-semibold text-sm p-2 rounded mx-2" onClick={(e) => {
            e.preventDefault();
            document.dispatchEvent(new CustomEvent('interpolateChange'));
          }}  onKeyDown={(e) => e.preventDefault()}>
            Interpolate
          </button>
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
                  console.log(rotmat);
                  //await actor.update_pose(currentFrame, rotmat, 0); // Assuming joint 0 for example
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
        <div className="flex flex-row justify-between mt-1" id="timeline">
          <div className="mr-3 ml-1">0</div>
          <input id="timeline-slider" type="range" className="w-full bg-white" min={0} max={totalFrames} value={currentFrame} onChange={(e) => {
            const frame = parseInt(e.target.value, 10);
            if (!isNaN(frame)) {
              const frame_constrained = frame >= totalFrames ? (totalFrames - 1) : frame < 0 ? 0 : frame;
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


