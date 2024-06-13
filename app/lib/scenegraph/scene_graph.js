export class SceneGraph {
    constructor() {
        this.root = new SceneNode();
    }

    dfs(){
        this.root.dfs();
    }
}


