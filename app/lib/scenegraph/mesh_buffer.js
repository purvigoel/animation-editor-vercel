class MeshBuffer {
    constructor(){
        this.positions = [];
        this.normals = [];
    }

    build(positions, normals){
        // build the mesh
        this.positions = positions;
        this.normals = normals;
    }
}