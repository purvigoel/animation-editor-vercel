import {m4} from "../m4.js";
import * as webglUtils from 'webgl-utils.js';
import {vec3} from "gl-matrix";


export const gltf_fragmentShaderSource = `
precision mediump float;

varying vec3 v_normal;

uniform vec4 u_diffuse;
uniform vec3 u_lightDirection;

void main () {
  vec3 normal = normalize(v_normal);
  float light = dot(u_lightDirection, normal) * .5 + .5;
  gl_FragColor = vec4(u_diffuse.rgb * light, u_diffuse.a);
}
`;

export const gltf_vertexShaderSource = `
attribute vec4 a_POSITION;
attribute vec3 a_NORMAL;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;

varying vec3 v_normal;

void main() {
  gl_Position = u_projection * u_view * u_world * a_POSITION;
  v_normal = mat3(u_world) * a_NORMAL;
}
`;

class TRS {
    constructor(position = [0, 0, 0], rotation = [0, 0, 0, 1], scale = [1, 1, 1]) {
      this.position = position;
      this.rotation = rotation;
      this.scale = scale;
    }
    getMatrix(dst) {
      dst = dst || new Float32Array(16);
      dst = m4.compose(this.position, this.rotation, this.scale, dst);
      return dst;
    }
  }

  class BoundingBox {
    constructor(){
        this.min = vec3.fromValues(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        this.max = vec3.fromValues(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    }

    update(min, max){
        vec3.min(this.min, vec3.fromValues(min[0], min[1], min[2]), this.min);
        vec3.max(this.max, vec3.fromValues(max[0], max[1], max[2]), this.max);
    }

    getCenter() {
        return vec3.fromValues(
            (this.min[0] + this.max[0]) / 2,
            (this.min[1] + this.max[1]) / 2,
            (this.min[2] + this.max[2]) / 2
        );
    }
  }

  class Node {
    constructor(source, name) {
      this.name = name;
      this.source = source;
      this.parent = null;
      this.children = [];
      this.localMatrix = m4.identity();
      this.worldMatrix = m4.identity();
      this.drawables = [];
      this.boundingBox = new BoundingBox();
    }

    setParent(parent) {
      if (this.parent) {
        this.parent._removeChild(this);
        this.parent = null;
      }
      if (parent) {
        parent._addChild(this);
        this.parent = parent;
      }
    }
    updateWorldMatrix(parentWorldMatrix) {
      const source = this.source;
      if (source) {
        this.localMatrix = source.getMatrix(this.localMatrix);
      }

      if (parentWorldMatrix) {
        // a matrix was passed in so do the math
        this.worldMatrix = m4.multiply(parentWorldMatrix, this.localMatrix, this.worldMatrix);
      } else {
        // no matrix was passed in so just copy local to world
        this.worldMatrix = m4.copy(this.localMatrix, this.worldMatrix);
      }

      // now process all the children
      const worldMatrix = this.worldMatrix;
      for (const child of this.children) {
        child.updateWorldMatrix(worldMatrix);
      }
    }
    traverse(fn, projection, view, sharedUniforms, meshProgramInfo) {
      fn(this, projection, view, sharedUniforms, meshProgramInfo);
      
      for (const child of this.children) {
        child.traverse(fn, projection, view, sharedUniforms, meshProgramInfo);
      }
    }
    _addChild(child) {
      this.children.push(child);
    }
    _removeChild(child) {
      const ndx = this.children.indexOf(child);
      this.children.splice(ndx, 1);
    }
  }

  class MeshRenderer {
    constructor(mesh, gl, gltf) {
      this.mesh = mesh;
      this.boundingBox = new BoundingBox();
      for(const primitive of mesh.primitives){
        this.boundingBox.update(primitive.boundingBox.min, primitive.boundingBox.max);
      }
      this.gl = gl;
      this.gltf = gltf;
    }
    render(node, projection, view, sharedUniforms, meshProgramInfo) {
      const {mesh} = this;
      this.gl.useProgram(meshProgramInfo.program);
      let counter = 0;
      
      for (const primitive of mesh.primitives) {
        webglUtils.setBuffersAndAttributes(this.gl, meshProgramInfo, primitive.bufferInfo);
        webglUtils.setUniforms(meshProgramInfo, {
          u_projection: projection,
          u_view: view,
          u_world: node.worldMatrix,
        });
        webglUtils.setUniforms(meshProgramInfo, primitive.material.uniforms); 
        webglUtils.setUniforms(meshProgramInfo, sharedUniforms);
        this.drawBufferInfo(this.gl, primitive.bufferInfo, this.gl.TRIANGLES, primitive.bufferInfo.numElements, primitive.bufferInfo.offset);
        counter += 1;
      }
    }
    

    drawBufferInfo(gl, bufferInfo, primitiveType, count, offset) {
        const indices = bufferInfo.indices;
        primitiveType = primitiveType === undefined ? gl.TRIANGLES : primitiveType;
        //primitiveType = this.gl.LINES;
        const numElements = count === undefined ? bufferInfo.numElements : count;
        offset = offset === undefined ? 0 : offset;
        if (indices) {
            if(bufferInfo.elementType == 5123){
                gl.drawElements(primitiveType, numElements, gl.UNSIGNED_SHORT, offset);
            } else {
                gl.drawElements(primitiveType, numElements, gl.UNSIGNED_INT, offset);
            }
        } else {
          gl.drawArrays(primitiveType, offset, numElements);
        }
      }

  }

  function throwNoKey(key) {
    throw new Error(`no key: ${key}`);
  }

  const accessorTypeToNumComponentsMap = {
    'SCALAR': 1,
    'VEC2': 2,
    'VEC3': 3,
    'VEC4': 4,
    'MAT2': 4,
    'MAT3': 9,
    'MAT4': 16,
  };

  function accessorTypeToNumComponents(type) {
    return accessorTypeToNumComponentsMap[type] || throwNoKey(type);
  }

  const glTypeToTypedArrayMap = {
    '5120': Int8Array,    // gl.BYTE
    '5121': Uint8Array,   // gl.UNSIGNED_BYTE
    '5122': Int16Array,   // gl.SHORT
    '5123': Uint16Array,  // gl.UNSIGNED_SHORT
    '5124': Int32Array,   // gl.INT
    '5125': Uint32Array,  // gl.UNSIGNED_INT
    '5126': Float32Array, // gl.FLOAT
  };

  function calculateElementSize(type, componentType) {
    const typeToComponentCount = {
        'SCALAR': 1,
        'VEC2': 2,
        'VEC3': 3,
        'VEC4': 4,
        'MAT2': 4,
        'MAT3': 9,
        'MAT4': 16
    };

    const componentTypeToByteSize = {
        5120: 1, // BYTE
        5121: 1, // UNSIGNED_BYTE
        5122: 2, // SHORT
        5123: 2, // UNSIGNED_SHORT
        5125: 4, // UNSIGNED_INT
        5126: 4  // FLOAT
    };

    const componentCount = typeToComponentCount[type];
    const byteSize = componentTypeToByteSize[componentType];

    if (componentCount === undefined || byteSize === undefined) {
        throw new Error('Invalid type or componentType');
    }

    return componentCount * byteSize;
}

  // Given a GL type return the TypedArray needed
  function glTypeToTypedArray(type) {
    return glTypeToTypedArrayMap[type] || throwNoKey(type);
  }

  // given an accessor index return both the accessor and
  // a TypedArray for the correct portion of the buffer
  function getAccessorTypedArrayAndStride(gl, gltf, accessorIndex) {
    const accessor = gltf.accessors[accessorIndex];
    const bufferView = gltf.bufferViews[accessor.bufferView];
    const TypedArray = glTypeToTypedArray(accessor.componentType);
    const buffer = gltf.buffers[bufferView.buffer];
    //console.log(accessor.count * accessorTypeToNumComponents(accessor.type) )
    return {
      accessor:accessor,
      array: new TypedArray(
          buffer,
          bufferView.byteOffset + (accessor.byteOffset || 0),
          accessor.count * accessorTypeToNumComponents(accessor.type)),
      stride: bufferView.byteStride || 0,
    };
  }

  // Given an accessor index return a WebGLBuffer and a stride
  function getAccessorAndWebGLBuffer(gl, gltf, accessorIndex, is_indices, print) {
    const accessor = gltf.accessors[accessorIndex];
    
    const bufferView = gltf.bufferViews[accessor.bufferView];
    //const out_typed = getAccessorTypedArrayAndStride(gl, gltf, accessorIndex);
    // const array_typed = out_typed.array;

    
   if (!bufferView.webglBuffer) {
      const buffer = gl.createBuffer();
      let target = bufferView.target || gl.ARRAY_BUFFER;
      
      if(is_indices){
        target = bufferView.target || gl.ELEMENT_ARRAY_BUFFER;
      }

      const arrayBuffer = gltf.buffers[bufferView.buffer];
   
      const data = new Uint8Array(arrayBuffer, bufferView.byteOffset, bufferView.byteLength );
      
      gl.bindBuffer(target, buffer);
      gl.bufferData(target, data, gl.STATIC_DRAW);
      bufferView.webglBuffer = buffer;
    } 

    return {
      accessor,
      buffer: bufferView.webglBuffer,
      stride: bufferView.byteStride || 0,
    };
  }

  export async function loadGLTF(url, gl) {
    const gltf = await loadJSON(url);

    // load all the referenced files relative to the gltf file
    const baseURL = new URL(url, location.href);
    gltf.buffers = await Promise.all(gltf.buffers.map((buffer) => {
      const url = new URL(buffer.uri, baseURL.href);
      return loadBinary(url.href);
    }));

    const defaultMaterial = {
      uniforms: {
        u_diffuse: [.5, .8, 1, 1],
      },
    };
    
    // setup meshes
    gltf.meshes.forEach((mesh) => {
      mesh.primitives.forEach((primitive) => {
        const attribs = {};
        let numElements;
        for (const [attribName, index] of Object.entries(primitive.attributes)) {
          const {accessor, buffer, stride} = getAccessorAndWebGLBuffer(gl, gltf, index, false);
          numElements = accessor.count;
          attribs[`a_${attribName}`] = {
            buffer,
            type: accessor.componentType,
            numComponents: accessorTypeToNumComponents(accessor.type),
            stride: stride,
            offset: accessor.byteOffset || 0,
          };

          if(attribName == "POSITION" && accessor.type == "VEC3"){
            const min = vec3.fromValues(accessor.min[0], accessor.min[1], accessor.min[2]);
            const max = vec3.fromValues(accessor.max[0], accessor.max[1], accessor.max[2]);
            primitive.boundingBox = new BoundingBox();
            primitive.boundingBox.update(min, max);
          }
        }

        const bufferInfo = {
          attribs,
          numElements,
        };
        if (primitive.indices !== undefined) {
          const {accessor, buffer, stride} = getAccessorAndWebGLBuffer(gl, gltf, primitive.indices, true);
          bufferInfo.numElements = accessor.count;
          bufferInfo.indices = buffer;
          bufferInfo.elementType = accessor.componentType;
          
          bufferInfo.offset = accessor.byteOffset;
          bufferInfo.stride = accessor.stride || 0;
        }

        primitive.bufferInfo = bufferInfo;

        // save the material info for this primitive
        primitive.material = defaultMaterial; //gltf.materials && gltf.materials[primitive.material] || defaultMaterial;
      });
    });

    const origNodes = gltf.nodes;
    gltf.nodes = gltf.nodes.map((n) => {
      const {name, skin, mesh, translation, rotation, scale} = n;
      const trs = new TRS(translation, rotation, scale);
      const node = new Node(trs, name);
      const realMesh = gltf.meshes[mesh];
      if (realMesh) {
        let meshRenderer = new MeshRenderer(realMesh, gl, gltf);
        node.drawables.push(meshRenderer);
        
        node.boundingBox.update(meshRenderer.boundingBox.min, meshRenderer.boundingBox.max);
      }
      return node;
    });

    // arrange nodes into graph
    gltf.nodes.forEach((node, ndx) => {
      const children = origNodes[ndx].children;
      if (children) {
        addChildren(gltf.nodes, node, children);
      }
    });

    gltf.boundingBox = new BoundingBox();
    
    // setup scenes
    for (const scene of gltf.scenes) {
      scene.root = new Node(new TRS(), scene.name);
      addChildren(gltf.nodes, scene.root, scene.nodes);
    }

    for(const scene of gltf.scenes){
      gltf.boundingBox.update(scene.root.boundingBox.min, scene.root.boundingBox.max);
    }

    return gltf;
  }

  function addChildren(nodes, node, childIndices) {
    childIndices.forEach((childNdx) => {
      const child = nodes[childNdx];
      child.setParent(node);
      node.boundingBox.update(child.boundingBox.min, child.boundingBox.max);
    });
  }

  async function loadFile(url, typeFunc) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`could not load: ${url}`);
    }
    return await response[typeFunc]();
  }

  async function loadBinary(url) {
    return loadFile(url, 'arrayBuffer');
  }

  async function loadJSON(url) {
    return loadFile(url, 'json');
  }

export async function renderDrawables(node, projection, view, sharedUniforms, meshProgramInfo) {
   
    for (const drawable of node.drawables) {
        drawable.render(node, projection, view, sharedUniforms, meshProgramInfo);
    }
  }

  export async function renderScene(gltf, projection, view, sharedUniforms, meshProgramInfo) {
    for (const scene of gltf.scenes) {
        // updatte all world matices in the scene.
        scene.root.updateWorldMatrix();
        // walk the scene and render all renderables
        scene.root.traverse(renderDrawables, projection, view, sharedUniforms, meshProgramInfo);
    }
  }


export async function loadGltf2(loader, gltfUrl, gl) {
    // var MinimalGLTFLoader = loader;
    
    // var mgl = MinimalGLTFLoader; //new MinimalGLTFLoader.glTFLoader(gl);
    // mgl.loadGLTF(gltfUrl, function(glTF) {
    //   //  setupScene(glTF);
    //   //  Renderer.render();
    // });
}

