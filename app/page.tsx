"use client";

import Image from "next/image";
import { useEffect } from "react";

export default function Home() {

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

  return (
    <main className="h-full w-full h-screen">
      <div className="flex flex-col w-full h-full bg-red-500 text-white">
        {/* Top bar */}
        <div className="flex  w-full justify-between  opacity-50 p-3">
          <button className="bg-white text-red-500 p-1 rounded">Button 1</button>
          <button className="bg-white text-red-500 p-1 rounded">Button 2</button>
          <button className="bg-white text-red-500 p-1 rounded">Button 3</button>
        </div>
        {/* Canvas */}
        <div className="flex-grow flex flex-col w-full h-full bg-blue-500 text-white">
          <canvas id="mainCanvas" className="border border-green-500 bg-purple w-full h-full"></canvas>
        </div>
        {/* Bottom bar */}
        <div className="flex flex-col w-full bg-gray-300 text-white p-3">
          <input type="range" className="w-full bg-white" />
        </div>


      </div>
      {/* <div className="w-full bg-gray-400 p-2 text-white flex justify-between fixed top-0">

      </div>
      <div className="flex-grow flex flex-col items-center justify-center w-full h-full">
        
      </div>
  */}
    </main>
  );
}
