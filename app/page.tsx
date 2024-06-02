"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {

  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(60);


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



  return (
    <main className="h-full w-full h-screen">
      <div className="flex flex-col w-full h-full">
        {/* Top bar */}
        <div className="flex  w-full bg-gray-100 justify-between p-3">
          <button className="bg-red-200 text-red-500 font-semibold text-sm p-2 rounded mx-2">
            Joint Positions
          </button>
          <form className="flex">
            <input
              type="number"
              name="frameInput"
              className="bg-white text-black p-2 rounded w-16 "
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
            <span className="p-2 rounded mx-2">
              / {totalFrames}
            </span>
          </form>
          <button className="bg-red-200 text-red-500 font-semibold text-sm p-2 rounded mx-2">
            Download
          </button>
        </div>
        {/* Canvas */}
        <div className="flex-grow flex flex-col w-full h-full bg-white text-white">
          <canvas id="mainCanvas" className="border border-black w-full h-full"></canvas>
        </div>
        {/* Bottom bar */}
        <div className="flex flex-col w-full bg-gray-200 text-white p-3">
          <input type="range" className="w-full bg-white" min={0} max={totalFrames} value={currentFrame} onChange={(e) => setCurrentFrame(parseInt(e.target.value, 10) || 0)} />
        </div>


      </div>
    </main>
  );
}
