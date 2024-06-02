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
    <main className="flex min-h-screen flex-col items-center justify-between">
      <div className="w-full bg-gray-400 p-2 text-white flex justify-between fixed top-0">
        <button className="bg-white text-red-500 p-2 rounded">Button 1</button>
        <button className="bg-white text-red-500 p-2 rounded">Button 2</button>
        <button className="bg-white text-red-500 p-2 rounded">Button 3</button>
      </div>
      <div className="flex-grow flex flex-col items-center justify-center w-full">
        <canvas id="mainCanvas" className="border border-red-500 bg-white w-full"></canvas>
      </div>
      <div className="w-full bg-gray-400 p-2 text-white flex justify-between fixed bottom-0">
        <input type="range" className="mt-4 w-full bg-white" />
      </div>
    </main>
  );
}
