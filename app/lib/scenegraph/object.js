class Object {
    constructor(renderer){
        // each mesh is a MeshBuffer
        this.meshes = [];
        this.materials = [];
        this.textures = [];
        this.renderer = null;
        // this.shaders = [];
        // this.shader_programs = [];
    }

    add_mesh(mesh){
        this.meshes.push(mesh);
    }

    draw(){
        this.renderer.render();
    }
}