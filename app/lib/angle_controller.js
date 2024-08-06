import * as tf from '@tensorflow/tfjs';

class AngleController {
    constructor(smpl, skeleton, params) {
        this.smpl = smpl;
        this.skeleton = skeleton;
        this.params = params;
    }
}

export function angle_to_rotmat( axis, angle){
    if (axis == 0){
        let cosa = Math.cos(angle);
        let sina = Math.sin(angle);
        let rotmat = tf.tensor([ [1.0, 0.0, 0.0], [0.0, cosa, -1 * sina], [0.0, sina, cosa]]);
        return rotmat;
    } else if (axis == 1) {
        let cosa = Math.cos(angle);
        let sina = Math.sin(angle);
        let rotmat = tf.tensor([ [cosa, 0.0, sina], [0.0, 1.0, 0.0], [-1 * sina, 0.0, cosa]]);
        return rotmat;
    } else {
        let cosa = Math.cos(angle);
        let sina = Math.sin(angle);
        let rotmat = tf.tensor([ [cosa, -sina, 0.0], [sina, cosa, 0.0], [0.0, 0.0, 1.0]]);
        return rotmat;
    }
    return rotmat;
}

export function angle_axis_rotmat (axis, angle) {
    const cos_t = Math.cos (angle);
    const sin_t = Math.sin (angle);
    
    const k_x = axis[0];
    const k_y = axis[1];
    const k_z = axis[2];

    return tf.tensor ([
        [cos_t + k_x * k_x * (1 - cos_t), k_x * k_y * (1 - cos_t) - k_z * sin_t, k_x * k_z * (1 - cos_t) + k_y * sin_t],
        [k_y * k_x * (1 - cos_t) + k_z * sin_t, cos_t + k_y * k_y * (1 - cos_t), k_y * k_z * (1 - cos_t) - k_x * sin_t],
        [k_z * k_x * (1 - cos_t) - k_y * sin_t, k_z * k_y * (1 - cos_t) + k_x * sin_t, cos_t + k_z * k_z * (1 - cos_t)]
    ]);

}


export function addAngleControl(body, params) {
    const container = document.getElementById('angleContainer'); // Container to hold the sliders
    const jointConfigs = [
        {
            jointName: 'Root',
            sliders: [
                { id: 'angle1', valueId: 'angle1Value', joint: 0, axis: 0, label: 'Angle 1' },
                { id: 'angle2', valueId: 'angle2Value', joint: 0, axis: 1, label: 'Angle 2' },
                { id: 'angle3', valueId: 'angle3Value', joint: 0, axis: 2, label: 'Angle 3' }
            ]
        },
        {
            jointName: 'Right Hip',
            sliders: [
                { id: 'rightHipx', valueId: 'rightHipValuex', joint: 1, axis: 0, label: 'Right Hip X' },
                { id: 'rightHipy', valueId: 'rightHipValuey', joint: 1, axis: 1, label: 'Right Hip Y' },
                { id: 'rightHipz', valueId: 'rightHipValuez', joint: 1, axis: 2, label: 'Right Hip Z' }
            ]
        },
        {
            jointName: 'Left Hip',
            sliders: [
                { id: 'leftHipx', valueId: 'leftHipValuex', joint: 2, axis: 0, label: 'Left Hip X' },
                { id: 'leftHipy', valueId: 'leftHipValuey', joint: 2, axis: 1, label: 'Left Hip Y' },
                { id: 'leftHipz', valueId: 'leftHipValuez', joint: 2, axis: 2, label: 'Left Hip Z' }
            ]
        },
        {
            jointName: 'Left Knee',
            sliders: [
                { id: 'leftKneex', valueId: 'leftKneeValuex', joint: 4, axis: 0, label: 'Left Knee X' },
                { id: 'leftKneey', valueId: 'leftKneeValuey', joint: 4, axis: 1, label: 'Left Knee Y' },
                { id: 'leftKneez', valueId: 'leftKneeValuez', joint: 4, axis: 2, label: 'Left Knee Z' }
            ]
        }
        ,
        {
            jointName: 'Right Knee',
            sliders: [
                { id: 'rightKneex', valueId: 'rightKneeValuex', joint: 5, axis: 0, label: 'Right Knee X' },
                { id: 'rightKneey', valueId: 'rightKneeValuey', joint: 5, axis: 1, label: 'Right Knee Y' },
                { id: 'rightKneez', valueId: 'rightKneeValuez', joint: 5, axis: 2, label: 'Right Knee Z' }
            ]
        },
        {
            jointName: 'Left Shoulder',
            sliders: [
                { id: 'leftShoulderx', valueId: 'leftShoulderValuex', joint: 16, axis: 0, label: 'Left Shoulder X' },
                { id: 'leftShouldery', valueId: 'leftShoulderValuey', joint: 16, axis: 1, label: 'Left Shoulder Y' },
                { id: 'leftShoulderz', valueId: 'leftShoulderValuez', joint: 16, axis: 2, label: 'Left Shoulder Z' }
            ]
        }
        ,
        {
            jointName: 'Right Shoulder',
            sliders: [
                { id: 'rightShoulderx', valueId: 'rightShoulderValuex', joint: 17, axis: 0, label: 'Right Shoulder X' },
                { id: 'rightShouldery', valueId: 'rightShoulderValuey', joint: 17, axis: 1, label: 'Right Shoulder Y' },
                { id: 'rightShoulderz', valueId: 'rightShoulderValuez', joint: 17, axis: 2, label: 'Right Shoulder Z' }
            ]
        },
        {
            jointName: 'Left Elbow',
            sliders: [
                { id: 'leftElbowx', valueId: 'leftElbowValuex', joint: 18, axis: 0, label: 'Left Elbow X' },
                { id: 'leftElbowy', valueId: 'leftElbowValuey', joint: 18, axis: 1, label: 'Left Elbow Y' },
                { id: 'leftElbowz', valueId: 'leftElbowValuez', joint: 18, axis: 2, label: 'Left Elbow Z' }
            ]
        }
        ,
        {
            jointName: 'Right Elbow',
            sliders: [
                { id: 'rightElbowx', valueId: 'rightElbowValuex', joint: 19, axis: 0, label: 'Right Elbow X' },
                { id: 'rightElbowy', valueId: 'rightElbowValuey', joint: 19, axis: 1, label: 'Right Elbow Y' },
                { id: 'rightElbowz', valueId: 'rightElbowValuez', joint: 19, axis: 2, label: 'Right Elbow Z' }
            ]
        },
        {
            jointName: 'Low Spine',
            sliders: [
                { id: 'LowSpinex', valueId: 'LowSpineValuex', joint: 3, axis: 0, label: 'Low Spine X' },
                { id: 'LowSpiney', valueId: 'LowSpineValuey', joint: 3, axis: 1, label: 'Low Spine Y' },
                { id: 'LowSpinez', valueId: 'LowSpineValuez', joint: 3, axis: 2, label: 'Low Spine Z' }
            ]
        },
        {
            jointName: 'Mid Spine',
            sliders: [
                { id: 'MidSpinex', valueId: 'MidSpineValuex', joint: 6, axis: 0, label: 'Mid Spine X' },
                { id: 'MidSpiney', valueId: 'MidSpineValuey', joint: 6, axis: 1, label: 'Mid Spine Y' },
                { id: 'MidSpinez', valueId: 'MidSpineValuez', joint: 6, axis: 2, label: 'Mid Spine Z' }
            ]
        },
        {
            jointName: 'High Spine',
            sliders: [
                { id: 'HighSpinex', valueId: 'HighSpineValuex', joint: 9, axis: 0, label: 'High Spine X' },
                { id: 'HighSpiney', valueId: 'HighSpineValuey', joint: 9, axis: 1, label: 'High Spine Y' },
                { id: 'HighSpinez', valueId: 'HighSpineValuez', joint: 9, axis: 2, label: 'High Spine Z' }
            ]
        }
        // Add more joint configurations as needed
    ];

    const previousValues = {};

    jointConfigs.forEach(jointConfig => {
        // Create joint container div
        const jointDiv = document.createElement('div');
        jointDiv.className = 'jointContainer';

        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.innerHTML = `${jointConfig.jointName} <span>&#9660;</span>`;
        toggleButton.className = 'toggleButton';

        // Create sliders container div
        const slidersDiv = document.createElement('div');
        slidersDiv.className = 'slidersContainer';
        slidersDiv.style.display = 'none'; // Initially collapsed

        toggleButton.addEventListener('click', () => {
            const isCollapsed = slidersDiv.style.display === 'none';
            slidersDiv.style.display = isCollapsed ? 'block' : 'none';
            toggleButton.innerHTML = `${jointConfig.jointName} <span>${isCollapsed ? '&#9650;' : '&#9660;'}</span>`;
        });

        jointConfig.sliders.forEach(config => {
            // Create slider container div
            const sliderDiv = document.createElement('div');
            sliderDiv.className = 'sliderContainer';

            // Create label
            const label = document.createElement('label');
            label.htmlFor = config.id;
            label.textContent = config.label;

            // Create slider
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = config.id;
            slider.min = '0';
            slider.max = '360';
            slider.value = '180';

            // Create value display span
            const valueDisplay = document.createElement('span');
            valueDisplay.id = config.valueId;
            valueDisplay.textContent = slider.value;

            // Append elements to slider div
            sliderDiv.appendChild(label);
            sliderDiv.appendChild(slider);
            sliderDiv.appendChild(valueDisplay);

            // Append slider div to sliders container div
            slidersDiv.appendChild(sliderDiv);

            // Initialize previous value
            previousValues[config.id] = slider.value;

            // Add event listener
            slider.addEventListener('input', () => {
                valueDisplay.textContent = slider.value;
                const angle = parseFloat(slider.value) * Math.PI / 180;
                const previousAngle = parseFloat(previousValues[config.id]) * Math.PI / 180;
                const rotmat = angle_to_rotmat(config.axis, angle - previousAngle);
                body.update_pose(params["currTime"], rotmat, config.joint);
                params["draw_once"] = true;
                previousValues[config.id] = slider.value;
                slidersDiv.style.display = 'block'; // Automatically expand dropdown
            });
        });

        // Append toggle button and sliders container to joint div
        jointDiv.appendChild(toggleButton);
        jointDiv.appendChild(slidersDiv);

        // Append joint div to main container
        container.appendChild(jointDiv);
    });
}