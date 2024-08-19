import { cameraBuffer, getCameraMatrix } from "./camera";
import { torusDataX, torusDataY, torusDataZ } from './torus.js';
import { cylinderDataX, cylinderDataY, cylinderDataZ } from './cylinder.js';
import {m4} from "./m4.js";

let N_AXES = 3;
export let selected = [0, 0, 0, 0];

export class AngleControllerRenderer{
    constructor(device){
        this.arrowPipeline = null;
        this.ringPipeline = null;
        this.arrowVertices = null;
        this.ringVerticesXY = null;
        this.ringVerticesYZ = null;
        this.ringVerticesXZ = null;
        this.initializeShaderProgram(device);
        this.controller = this.initializeBuffers(device);
    }

    initializeShaderProgram(device){

        const arrowShaderSource = `
          @group(0) @binding(0) var<uniform> u_matrix : mat4x4f;
          @vertex
          fn vertexMain (@location(0) a_position : vec3f) -> @builtin(position) vec4f {
            return u_matrix * vec4f(a_position, 1);
          }

          @fragment
          fn fragmentMain () -> @location(0) vec4f  {
            return vec4(1, 0, 0, 1);
          }
        `
        const ringShaderSource = `
          @group(0) @binding(0) var<uniform> u_matrix : mat4x4f;
          @group(0) @binding(1) var<uniform> joint_matrix : mat4x4f;
          @group(0) @binding(2) var<uniform> hovered : vec4u;

          struct VertexOutput {
            @builtin(position) Position : vec4f,
            @location(0) color : vec4f,
            @location(1) @interpolate(flat) isHovered : u32
          }

          var<private> colors : array<vec4f, 3> = array (
            vec4f (1, 0, 0, 1), // R
            vec4f (0, 1, 0, 1), // G
            vec4f (0, 0, 1, 1), // B
          );

          var<private> transforms : array<mat4x4f, 3> = array(
            mat4x4f (1, 0, 0, 0,
                     0, 1, 0, 0,
                     0, 0, 1, 0,
                     0, 0, 0, 1),

            mat4x4f (0, 1, 0, 0,
                     -1, 0, 0, 0,
                     0, 0, 1, 0,
                     0, 0, 0, 1),

            mat4x4f (0, 0, 1, 0,
                     0, 1, 0, 0,
                     -1, 0, 0, 0,
                     0, 0, 0, 1),
          );

          var<private> scale : mat4x4f = mat4x4f (
            0.25, 0, 0, 0,
            0, 0.25, 0, 0,
            0, 0, 0.25, 0,
            0, 0, 0, 1
          );

          @vertex
          fn vertexMain (@location(0) a_position : vec3f,
                         @builtin(instance_index) instanceIdx : u32) -> VertexOutput  {
            var out : VertexOutput;
            out.Position = u_matrix * joint_matrix * 
                           transforms[instanceIdx] *  vec4f(a_position, 1);
            out.color = colors[instanceIdx];
            out.isHovered = hovered[instanceIdx];
            return out;
          }

          @fragment
          fn fragmentMain ( in : VertexOutput ) -> @location(0) vec4f  {
            var col = in.color;
            if (in.isHovered == 1) {
              col = vec4f (1.0, 1.0, 0.0, 1.0);
            }
            return col;
          }
        `
        const arrowShaderModule = device.createShaderModule({
          label: "arrow shader",
          code: arrowShaderSource
        })
        const ringShaderModule = device.createShaderModule({
          label: "ring shader",
          code: ringShaderSource
        })
        this.arrowPipeline = device.createRenderPipeline ({
          label : "Arrow Pipeline",
          layout: "auto",
          vertex: {
              module: arrowShaderModule,
              entryPoint: "vertexMain",
              buffers: [
                  // Position Buffer
                  {
                      arrayStride: 3 * 4,
                      attributes: [{
                        format: "float32x3",
                        offset: 0,
                        shaderLocation: 0, // Position, see vertex shader
                      }],
                  }
              ]
          },
          fragment: {
              module: arrowShaderModule,
              entryPoint: "fragmentMain",
              targets: [{
                  format: navigator.gpu.getPreferredCanvasFormat()
              }]
          },
         /* primitive : {
            topology: "line-strip"
          },*/
          depthStencil: {
              depthWriteEnabled: true,
              depthCompare: "always",
              format: "depth24plus"
          },
          multisample: {
              count: 4,
          }
        })

        this.ringPipeline = device.createRenderPipeline ({
            label : "Ring Pipeline",
            layout: "auto",
            vertex: {
                module: ringShaderModule,
                entryPoint: "vertexMain",
                buffers: [
                    // Position Buffer
                    {
                        arrayStride: 3 * 4,
                        attributes: [{
                          format: "float32x3",
                          offset: 0,
                          shaderLocation: 0, // Position, see vertex shader
                        }],
                    }
                ]
            },
            fragment: {
                module: ringShaderModule,
                entryPoint: "fragmentMain",
                targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat()
                }]
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "always",
                format: "depth24plus"
            },
            /*primitive : {
              topology: "line-strip"
            },*/
            multisample: {
                count: 4,
            }
        })

        this.translationBuffer = device.createBuffer({
          label: "joint translation buffer",
          size: (4 * 4) * 4,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.rotationBuffer = device.createBuffer({
          label: "joint rotation buffer",
          size: (4 * 4) * 4,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.selectedBuffer = device.createBuffer({
          label: "selected? buffer",
          size: (4) * 4,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.selectedArrowBuffer = device.createBuffer({
          label: "selected? buffer",
          size: (4) * 4,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.arrowBindGroup = device.createBindGroup({
          layout: this.ringPipeline.getBindGroupLayout(0),
          entries : [{
            binding : 0,
            resource: {buffer: cameraBuffer}
          }, {
            binding: 1,
            resource: {buffer: this.translationBuffer}
          }, {
            binding: 2,
            resource: {buffer: this.selectedArrowBuffer}
          }]
        });

        this.ringBindGroup = device.createBindGroup({
          layout: this.ringPipeline.getBindGroupLayout(0),
          entries : [{
            binding : 0,
            resource: {buffer: cameraBuffer}
          }, {
            binding: 1,
            resource: {buffer: this.translationBuffer}
          }, {
            binding: 2,
            resource: {buffer: this.selectedBuffer}
          }]
        });
      
    }

    initializeBuffers(device) {
        // Create buffers for the translation arrows
        const arrowVertices = new Float32Array([
          // X-axis arrow (red)
          0.0, 0.0, 0.0,  1.0, 0.0, 0.0,
          1.0, 0.0, 0.0,  0.9, 0.1, 0.0,
          1.0, 0.0, 0.0,  0.9, -0.1, 0.0,
          // Y-axis arrow (green)
          0.0, 0.0, 0.0,  0.0, 1.0, 0.0,
          0.0, 1.0, 0.0,  0.1, 0.9, 0.0,
          0.0, 1.0, 0.0,  -0.1, 0.9, 0.0,
          // Z-axis arrow (blue)
          0.0, 0.0, 0.0,  0.0, 0.0, 1.0,
          0.0, 0.0, 1.0,  0.0, 0.1, 0.9,
          0.0, 0.0, 1.0,  0.0, -0.1, 0.9,
        ]);
        const arrowBuffer = device.createBuffer({
          label: "Arrow buffer",
          size: cylinderDataX.vertexData.byteLength,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        device.queue.writeBuffer(arrowBuffer, 0, cylinderDataX.vertexData);
        // this.arrowVertices = arrowVertices;
        
        const createRingVertices = (radius, segments, plane) => {
            const vertices = [];
            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * 2 * Math.PI;
                if (plane === 'XY') {
                    vertices.push(radius * Math.cos(theta), radius * Math.sin(theta), 0.0);
                } else if (plane === 'YZ') {
                    vertices.push(0.0, radius * Math.cos(theta), radius * Math.sin(theta));
                } else if (plane === 'XZ') {
                    vertices.push(radius * Math.cos(theta), 0.0, radius * Math.sin(theta));
                }
            }
            return new Float32Array(vertices);
        };
        
        const ringVerticesYZ = createRingVertices(1.0, 36, 'YZ');


        const ringBufferYZ = device.createBuffer({
          label: "ring YZ buffer",
          size: torusDataX.vertexData.byteLength,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        device.queue.writeBuffer(ringBufferYZ, 0, torusDataX.vertexData);

        


       /* const ringBufferXY = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ringBufferXY);
        gl.bufferData(gl.ARRAY_BUFFER, ringVerticesXY, gl.STATIC_DRAW);

        const ringBufferYZ = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ringBufferYZ);
        gl.bufferData(gl.ARRAY_BUFFER, ringVerticesYZ, gl.STATIC_DRAW);

        const ringBufferXZ = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ringBufferXZ);
        gl.bufferData(gl.ARRAY_BUFFER, ringVerticesXZ, gl.STATIC_DRAW);*/

        this.ringVerticesYZ = ringVerticesYZ;

        return {
            arrowBuffer,
            ringBufferYZ,
            };
    }

    render(device, pass, joint_pos, show_translation) {
        // console.log("Rendering angle controllers.");
        const { arrowBuffer, ringBufferYZ } = this.controller;

        // Arrow Rendering
       /* pass.setPipeline(this.arrowPipeline);
        pass.setVertexBuffer(0, arrowBuffer);
        pass.setBindGroup(0, this.arrowBindGroup);
        pass.draw(3);*/
        
        // Ring rendering
        const modelMatrix = m4.translation(joint_pos[0], joint_pos[1], joint_pos[2]);
        device.queue.writeBuffer (this.translationBuffer, 0, new Float32Array(modelMatrix));
        selected[0] = torusDataX.isHovered ? 1 : 0;
        selected[1] = torusDataY.isHovered ? 1 : 0;
        selected[2] = torusDataZ.isHovered ? 1 : 0;
        device.queue.writeBuffer (this.selectedBuffer, 0, new Int32Array(selected));

        pass.setPipeline(this.ringPipeline); 
        


        pass.setBindGroup(0, this.ringBindGroup);
        pass.setVertexBuffer(0, ringBufferYZ);
        pass.draw(torusDataX.vertexData.length / 3, N_AXES);
        
        if (show_translation) {
          pass.setVertexBuffer(0, arrowBuffer);
          selected[0] = cylinderDataX.isHovered ? 1 : 0;
          selected[1] = cylinderDataY.isHovered ? 1 : 0;
          selected[2] = cylinderDataZ.isHovered ? 1 : 0;
          device.queue.writeBuffer (this.selectedArrowBuffer, 0, new Int32Array(selected));
          pass.setBindGroup(0, this.arrowBindGroup);
          pass.draw(cylinderDataX.vertexData.length / 3, N_AXES);
        }        
        /*pass.setVertexBuffer(0, ringBufferYZ);
        pass.draw(this.ringVerticesYZ.length / 3);
        pass.setVertexBuffer(0, ringBufferXZ);
        pass.draw(this.ringVerticesXZ.length / 3);*/
        // Arrow Rendering
        /*gl.useProgram(this.arrowProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, arrowBuffer);
        const positionLocation = gl.getAttribLocation(this.arrowProgram, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        
        const colors = [
            [1.0, 0.0, 0.0, 1.0], // Red
            [0.0, 1.0, 0.0, 1.0], // Green
            [0.0, 0.0, 1.0, 1.0]  // Blue
        ];

        for (let i = 0; i < 3; i++) {
            let modelMatrix = m4.create();
            let scaleMatrix = m4.create();

            modelMatrix = m4.translate(scaleMatrix, scaleMatrix, joint_location);
            scaleMatrix = m4.scale(scaleMatrix, modelMatrix, [0.5, 0.5, 0.5]);

            const mvpMatrix = m4.multiply(cameraMatrix, scaleMatrix);
            const mvpMatrixLocation = gl.getUniformLocation(this.arrowProgram, 'u_mvpMatrix');
            gl.uniformMatrix4fv(mvpMatrixLocation, false, mvpMatrix);

            const colorLocation = gl.getUniformLocation(this.arrowProgram, 'u_color');
            gl.uniform4fv(colorLocation, colors[i]);

            gl.drawArrays(gl.LINES, i * 6, 6);
        }
        // Ring Rendering
        
        gl.useProgram(this.ringProgram);
      
        let modelMatrix = m4.create();
        let scaleMatrix = m4.create();

        modelMatrix = m4.translate(scaleMatrix, scaleMatrix, joint_location);
        scaleMatrix = m4.scale(scaleMatrix, modelMatrix, [0.25, 0.25, 0.25]);

        let ringMvpMatrix = m4.multiply(cameraMatrix, scaleMatrix);

        const ringMvpMatrixLocation = gl.getUniformLocation(this.ringProgram, 'u_mvpMatrix');
        gl.uniformMatrix4fv(ringMvpMatrixLocation, false, ringMvpMatrix);
      */
        
      }

}

