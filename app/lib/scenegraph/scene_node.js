class SceneNode {
    constructor() {
        this.children = [];
        this.parent = null;
        this.object2world = null;
        this.is_humanoid = false;
        this.is_drawable = false;
        this.is_static = true;
        this.objects = [];
    }

    dfs(){
        // process current node
        for(var obj in this.objects){
            obj.draw();
        }

        for(var child of this.children){
            child.dfs();
        }
    }
}