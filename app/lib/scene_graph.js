export class SceneGraph {
    constructor() {
        this.root = new SceneNode();
    }

    dfs(){

    }
}

class SceneNode {
    constructor() {
        this.children = [];
        this.parent = null;
        this.local_transform = null;
        this.global_transform = null;
        this.is_humanoid = false;
        this.is_drawable = false;
        this.is_static = true;
    }

    dfs(){

    }
}

class Object {
    constructor(renderer){
        this.meshes = [];
        this.materials = [];
        this.textures = [];
        this.renderer = null;
        // this.shaders = [];
        // this.shader_programs = [];
    }

    draw(){
        this.renderer.render();
    }
}

