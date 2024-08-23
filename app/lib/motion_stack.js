import * as tf from "@tensorflow/tfjs"

export class MotionStack {
    constructor(){
        this.motion_stack = [];
    }

    add_motion(motion_A, motion_trans){
        this.motion_stack.push([tf.clone(motion_A), tf.clone(motion_trans)]);
    }

    async save_stack_to_file() {
        if (typeof window !== 'undefined') {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'motion_stack.json',
                    types: [{
                        description: 'JSON Files',
                        accept: {'application/json': ['.json']},
                    }],
                });
                const writable = await handle.createWritable();
                const data = this.motion_stack.map(([motion_A, motion_trans]) => ({
                    motion_A: motion_A.arraySync(),
                    motion_trans: motion_trans.arraySync(),
                }));
                console.log("data", data);
                await writable.write(JSON.stringify(data));
                await writable.close();
                console.log("File saved successfully");
            } catch (error) {
                console.error("Error saving file:", error);
            }
        } else {
            console.error("File System Access API is not available in this environment");
        }
    }

    async load_stack_from_file() {
        if (typeof window !== 'undefined') {
            try {
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'JSON Files',
                        accept: {'application/json': ['.json']},
                    }],
                });
                const file = await handle.getFile();
                const contents = await file.text();
                const data = JSON.parse(contents);
                this.motion_stack = data.map(({motion_A, motion_trans}) => [
                    tf.tensor(motion_A),
                    tf.tensor(motion_trans),
                ]);
                console.log("File loaded successfully");
            } catch (error) {
                console.error("Error loading file:", error);
            }
        } else {
            console.error("File System Access API is not available in this environment");
        }
    }
}