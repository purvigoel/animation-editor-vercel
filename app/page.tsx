"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faAngleDoubleRight, faAngleDown, faAngleUp } from '@fortawesome/free-solid-svg-icons';
import { Popover } from 'react-tiny-popover';

export default function Home() {

  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(60);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);


  useEffect(() => {
    fetch('/data/file1.npy')
      .then(response => response.arrayBuffer())
      .then(data => {
        // Process .npy data
      });
    fetch('/data/file2.js')
      .then(response => response.text())
      .then(script => {
        // Execute or use .js script
      });
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
          <canvas id="mainCanvas" className="border w-full h-full"></canvas>
        </div>
        {/* Bottom bar */}
        <div className="flex flex-col w-full bg-gray-100 text-gray-500  p-3">
          <div className="flex flex-row justify-between">
            <div className="mr-3 ml-1">0</div>
            <input type="range" className="w-full bg-white" min={0} max={totalFrames} value={currentFrame} onChange={(e) => setCurrentFrame(parseInt(e.target.value, 10) || 0)} />
            <div className="ml-3 mr-1">{totalFrames}</div>
          </div>

        </div>


      </div>
    </main>
  );
}
