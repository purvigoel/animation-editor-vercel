class SceneGraphBuilder {
    constructor(){
        this.scene_graph = new SceneGraph();
    }

    add_node(parent, node){
        node.parent = parent;
        parent.children.push(node);
    }

    add_object(node, object){
        node.objects.push(object);
    }
}

