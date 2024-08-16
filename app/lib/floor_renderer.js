//import { data } from "@tensorflow/tfjs-node";
import {cameraBuffer, setCameraMatrix} from "./camera.js";
import {lightBuffer, shadowBindGroupLayout} from "./light.js";
function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

export class FloorRenderer {
    constructor(device){
        this.program = null;
        this.positionBuffer = null;
        this.normalBuffer = null;
        this.texCoordsBuffer = null;
        this.texture = null;

        this.pipeline = null;
        this.bindGroup = null;

        //this.initialize_texture(gl);
        this.load_textures(device);
        this.initialize_shader_program(device);
        this.initialize_buffers(device);
        console.log("floor constructed");
    }


    /*
        https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
    */
    load_textures(device) {

        const y = [200, 200, 200, 255];
        const w = [225, 225, 225, 255];
        const textureData = new Uint8Array([
            y, w, y, w,
            w, y, w, y,
            y, w, y, w,
            w, y, w, y
        ].flat());
        this.texture = device.createTexture({
            size: [4, 4],
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });

        device.queue.writeTexture (
            {texture: this.texture},
            textureData,
            {bytesPerRow: 4 * 4},
            {width: 4, height: 4}
        );

        this.sampler = device.createSampler({
            addressModeU : 'repeat',
            addressModeV : 'repeat'
    }); 

        /* const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;

        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue

        gl.texImage2D (
            gl.TEXTURE_2D,
            level,
            internalFormat,
            width,
            height,
            border,
            srcFormat,
            srcType,
            pixel,
        );
        
        // Load the image.
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Google_Chrome_icon_%28February_2022%29.svg/800px-Google_Chrome_icon_%28February_2022%29.svg.png";
        image.onload = () => {
            console.log ("Image loaded.");
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D (
                gl.TEXTURE_2D,
                level,
                internalFormat,
                srcFormat,
                srcType,
                image,
            )

            if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                // Yes, it's a power of 2. Generate mips.
                gl.generateMipmap(gl.TEXTURE_2D);
            } else {
                // No, it's not a power of 2. Turn off mips and set
                // wrapping to clamp to edge
                //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
        };

        return texture; */
    }
    
    initialize_shader_program(device) {

        const floorShadowDepthModule = device.createShaderModule ({
            label: "Floor shadow depth test shader",
            code: `
                struct LightingInput {
                    light_matrix : mat4x4f,
                    light_pos : vec4f
                };
                @group(0) @binding(0) var<uniform> u_matrix : mat4x4f;
                @group(0) @binding(1) var<uniform> u_lightInfo : LightingInput;

                @vertex
                fn vertexMain (@location(0) pos : vec3f) -> @builtin(position) vec4f {
                    var result = u_lightInfo.light_matrix * vec4f(pos, 1);
                    return result;
                }
            `

        });

        const floorShaderModule = device.createShaderModule ({
            label: "Floor Shader",
            code: `
                struct LightingInput {
                    light_matrix : mat4x4f,
                    light_pos : vec4f
                };

                struct VertexOutput {
                    @builtin(position) Position : vec4f,
                    @location(0) vNormal : vec3f,
                    @location(1) vPosition : vec3f,
                    @location(2) texCoords : vec2f,
                    @location(3) posFromLight : vec4f
                }

                @group(0) @binding(0) var<uniform> u_matrix : mat4x4f;
                @group(0) @binding(1) var<uniform> u_lightInfo : LightingInput;
                @vertex
                fn vertexMain(@location(0) pos: vec3f,
                              @location(1) normal : vec3f,
                              @location(2) texCoords : vec2f) -> VertexOutput {
                    var output : VertexOutput;

                    var posFromLight = u_lightInfo.light_matrix * vec4f(pos, 1);
                    output.posFromLight = posFromLight;

                    output.Position = u_matrix * vec4f (pos, 1);
                    // output.Position = posFromLight;
                    output.vNormal = normal;
                    output.vPosition = pos;
                    output.texCoords = texCoords;

                    return output;
                }
                @group(0) @binding(2) var thisSampler : sampler;
                @group(0) @binding(3) var texture : texture_2d<f32>;

                @group(1) @binding(0) var shadowMap: texture_depth_2d;
                @group(1) @binding(1) var shadowSampler: sampler_comparison;
                @fragment
                fn fragmentMain(in : VertexOutput) -> @location(0) vec4f {
                    var vLightPosition : vec3f = u_lightInfo.light_pos.xyz;
                    var norm : vec3f = normalize (in.vNormal);
                    var lightDir : vec3f = normalize (vLightPosition - in.vPosition);

                    var oneOverS = 1/4096.;
                    // Shadow
                    
                    var shadowPos = vec3f (
                        in.posFromLight.x / in.posFromLight.w * 0.5 + 0.5,
                        in.posFromLight.y / in.posFromLight.w * -0.5 + 0.5,
                        in.posFromLight.z / in.posFromLight.w
                    );

                    var visibility = 0.0;
                    for (var i = -2; i <= 2; i++) {
                        for (var j = -2; j <= 2; j++) {
                            var offset : vec2f = vec2f(f32(i), f32(j)) * oneOverS;
                            visibility += textureSampleCompare(shadowMap, shadowSampler, shadowPos.xy + offset, shadowPos.z - .001);
                        }
                    }
                    visibility /= 25;
                    if (shadowPos.z > 1 || shadowPos.x < 0 || shadowPos.x > 1 || shadowPos.y < 0 || shadowPos.y > 1) {
                        visibility = 1;
                    } 


                    /*if (visibility >= 0.75) {
                        visibility = 1;
                    } else if (visibility >= 0.5) {
                        visibility = 0.5;
                    } else if (visibility >= 0.25) {
                        visibility = 0.25;
                    } else {
                        visibility = 0.0;
                    }*/

                    var texColor : vec4f = textureSample (texture, thisSampler, in.texCoords);
                    var diff : f32 = max (dot (norm, lightDir), 0.0);
                    var diffuse : vec4f = diff * texColor;
                    var ambient : vec4f = 0.2 * texColor;
                    // var ambient = vec4f(0);
                    return visibility * diffuse + ambient;
                }
            `

        });
        var bindGroupLayout = device.createBindGroupLayout ({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: 'uniform',
                    },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform',
                    },
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}

                },                {
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                }       
            ]
        });

        this.shadowPipeline = device.createRenderPipeline({
            label: "Shadow pipeline (floor)",
            layout: device.createPipelineLayout ({
                bindGroupLayouts: [
                    bindGroupLayout
                ]
            }),
            vertex: {
                module: floorShadowDepthModule,
                buffers: [
                    // position buffer
                    {
                        arrayStride: 3 * 4,
                        attributes: [{
                          format: "float32x3",
                          offset: 0,
                          shaderLocation: 0, // Position, see vertex shader
                        }],
                    }
                ],
            },
            primitive: {
                topology: 'triangle-strip'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth32float',
              }
        });

        this.pipeline = device.createRenderPipeline ({
            label: "Floor pipeline",
            layout: device.createPipelineLayout ({
                bindGroupLayouts: [
                    bindGroupLayout,
                    shadowBindGroupLayout
                ]
            }),
            vertex: {
                module: floorShaderModule,
                entryPoint: "vertexMain",
                buffers: [
                    // position buffer
                    {
                        arrayStride: 3 * 4,
                        attributes: [{
                          format: "float32x3",
                          offset: 0,
                          shaderLocation: 0, // Position, see vertex shader
                        }],
                    },
                    // normal buffer
                    {
                        arrayStride: 3 * 4,
                        attributes: [{
                          format: "float32x3",
                          offset: 0,
                          shaderLocation: 1, // Position, see vertex shader
                        }],
                    },
                    // Texture coordinates Buffer
                    {
                        arrayStride: 2 * 4,
                        attributes: [{
                          format: "float32x2",
                          offset: 0,
                          shaderLocation: 2, // Position, see vertex shader
                        }],
                    }

                ]
            },
            fragment: {
                module: floorShaderModule,
                entryPoint: "fragmentMain",
                targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat()
                }]
            },
            primitive: {
                topology: 'triangle-strip'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus"
            },
            multisample: {
                count: 4,
            },
        });

    }
    initialize_buffers(device) {
        const positions = new Float32Array([
            -4, -1.15, -4,
            4, -1.15, -4,
            -4, -1.15, 4,
            4, -1.15, 4
        ]);

        const normals = new Float32Array([
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
        ]);

        const texCoords = new Float32Array([
            0.0, 0.0,
            10.0, 0.0,
            0.0, 10.0,
            10.0, 10.0
        ]);

        /*const indices = new Uint16Array([
            0, 1, 2,
            2, 3, 0
        ]);*/

        this.positionBuffer = device.createBuffer({
            label: "Floor vertices",
            size: positions.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

       this.normalBuffer = device.createBuffer({
            label: "Floor normals",
            size: normals.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        this.texCoordsBuffer = device.createBuffer ({
            label: "Floor tex coords",
            size: texCoords.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,

        })

        /*this.texCoordBuffer = device.createBuffer({
            label: "Floor texture coordinates",
            size: texCoords.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });*/

        
        // write data into GPUBuffers
        device.queue.writeBuffer (this.positionBuffer, 0, positions);
        device.queue.writeBuffer (this.normalBuffer, 0, normals);
        device.queue.writeBuffer (this.texCoordsBuffer, 0, texCoords);

        /*this.texture = this.load_textures(gl);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

        this.texCoordsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);*/

        this.bindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{
                binding : 0,
                resource: {buffer: cameraBuffer}
            }, {
                binding: 1,
                resource: {buffer: lightBuffer}
            }, {
                binding: 2,
                resource: this.sampler
            }, {
                binding: 3,
                resource: this.texture.createView()
            }]
        }

        );
    }

    renderShadow(pass) {
        pass.setPipeline(this.shadowPipeline);
        pass.setVertexBuffer(0, this.positionBuffer);
        pass.setBindGroup(0, this.bindGroup);
        pass.draw(4);
    }

    render(pass) {
        // setCameraMatrix(device, canvas, this.cameraBuffer);
        pass.setPipeline(this.pipeline);
        pass.setVertexBuffer(0, this.positionBuffer);
        pass.setVertexBuffer(1, this.normalBuffer);
        pass.setVertexBuffer(2, this.texCoordsBuffer);
        pass.setBindGroup(0, this.bindGroup);
        pass.draw(4);
        /*gl.useProgram(this.program);

        const positionLocation = gl.getAttribLocation(this.program, 'a_position2');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        const normalLocation = gl.getAttribLocation(this.program, 'a_normal');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.enableVertexAttribArray(normalLocation);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

        const texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsBuffer);
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture (gl.TEXTURE0);
        gl.bindTexture (gl.TEXTURE_2D, this.texture);
        gl.uniform1i (gl.getUniformLocation(this.program, "u_sampler"), 0);

        setCameraMatrix(gl, this.program);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);*/
    }

} 