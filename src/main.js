const container = document.getElementById('three-container');
if (!container) {
    throw new Error('three-container element is required to initialize the scene.');
}

const transformationInputs = Array.from(document.querySelectorAll('#transformation-matrix input'));
const rotationInputs = transformationInputs.filter((_, index) => (index % 4) < 3);
const translationInputs = transformationInputs.filter((_, index) => (index % 4) === 3);
const screwButton = document.getElementById('compute-screw');
const playButton = document.getElementById('toggle-play');
const progressSlider = document.getElementById('progress-slider');
const eulerSequenceSelect = document.getElementById('euler-sequence');
const eulerInputs = Array.from(document.querySelectorAll('#euler-angle-inputs input'));
const screwAxisDirectionInputs = Array.from(document.querySelectorAll('#screw-axis-direction input'));
const screwAxisPointInputs = Array.from(document.querySelectorAll('#screw-axis-point input'));
const screwAngleInput = document.getElementById('screw-angle');
const screwDisplacementInput = document.getElementById('screw-displacement');

THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#cccccc');

const initialSize = (() => {
    const rect = container.getBoundingClientRect();
    return {
        width: rect.width || container.clientWidth || window.innerWidth,
        height: rect.height || container.clientHeight || window.innerHeight
    };
})();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.domElement.style.display = 'block';
container.appendChild(renderer.domElement);

function createTextSprite(text, options = {}) {
    const { fontSize = 64, color = '#111111', scale = 0.4 } = options;
    const canvas = document.createElement('canvas');
    const size = fontSize * 4;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, size, size);
    context.fillStyle = color;
    context.font = `${fontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, size / 2, size / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    texture.anisotropy = anisotropy;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(scale, scale, 1);
    return sprite;
}

const camera = new THREE.PerspectiveCamera(50, initialSize.width / initialSize.height, 0.1, 200);
camera.up.set(0, 0, 1);
camera.position.set(6, 5, 8);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 0, 0);
controls.update();

const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
keyLight.position.set(6, 10, 6);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
fillLight.position.set(-4, 5, -4);
scene.add(fillLight);

const grid = new THREE.GridHelper(10, 10, 0xffffff, 0xffffff);
grid.rotation.x = Math.PI / 2;
grid.material.opacity = 0.5;
grid.material.transparent = true;
if (Array.isArray(grid.material)) {
    grid.material.forEach((material) => {
        material.opacity = 0.5;
        material.transparent = true;
        material.depthWrite = false;
    });
} else {
    grid.material.depthWrite = false;
}
scene.add(grid);

const axesHelper = new THREE.AxesHelper(2.5);
scene.add(axesHelper);

const finalBody = new THREE.Group();

const bodyGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
bodyGeometry.translate(0.25, 0.25, 0.25);
const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x5ac8fa,
    metalness: 0.1,
    roughness: 0.65
});
const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
finalBody.add(bodyMesh);

const bodyEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(bodyGeometry),
    new THREE.LineBasicMaterial({ color: 0x141414 })
);
finalBody.add(bodyEdges);

const axisRadius = 0.03;
const axisLength = 1;

function createLocalAxes() {
    const group = new THREE.Group();

    const makeAxis = (color, rotation, position) => {
        const geometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 32, 1, false);
        const material = new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.4 });
        const axisMesh = new THREE.Mesh(geometry, material);
        axisMesh.rotation.set(rotation.x, rotation.y, rotation.z);
        axisMesh.position.set(position.x, position.y, position.z);
        return axisMesh;
    };

    group.add(makeAxis(0xff3b30, new THREE.Euler(0, 0, Math.PI / 2), new THREE.Vector3(axisLength / 2, 0, 0)));
    group.add(makeAxis(0x34c759, new THREE.Euler(0, 0, 0), new THREE.Vector3(0, axisLength / 2, 0)));
    group.add(makeAxis(0x007aff, new THREE.Euler(Math.PI / 2, 0, 0), new THREE.Vector3(0, 0, axisLength / 2)));

    return group;
}

finalBody.add(createLocalAxes());

scene.add(finalBody);

const animatedBody = new THREE.Group();
const animatedBodyMesh = new THREE.Mesh(
    bodyGeometry.clone(),
    new THREE.MeshStandardMaterial({
        color: 0x5ac8fa,
        metalness: 0.1,
        roughness: 0.65,
        transparent: true,
        opacity: 0.45
    })
);
animatedBody.add(animatedBodyMesh);
animatedBody.add(createLocalAxes());
animatedBody.visible = false;
scene.add(animatedBody);

const screwAxisGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3()
]);
const screwAxisMaterial = new THREE.LineDashedMaterial({
    color: 0xff9f0a,
    dashSize: 0.2,
    gapSize: 0.12
});
const screwAxisLine = new THREE.Line(screwAxisGeometry, screwAxisMaterial);
screwAxisLine.computeLineDistances();
screwAxisLine.visible = false;
scene.add(screwAxisLine);

const axisPointGeometry = new THREE.SphereGeometry(0.08, 24, 18);
const axisPointMaterial = new THREE.MeshStandardMaterial({ color: 0xff3b30, metalness: 0.1, roughness: 0.4 });
const axisPointMesh = new THREE.Mesh(axisPointGeometry, axisPointMaterial);
axisPointMesh.visible = false;
const axisPointLabel = createTextSprite('C', { scale: 0.7, color: '#111111' });
axisPointLabel.position.set(0, 0, 0.28);
axisPointMesh.add(axisPointLabel);
scene.add(axisPointMesh);

const originToAxisGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0)
]);
const originToAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff3b30 });
const originToAxisLine = new THREE.Line(originToAxisGeometry, originToAxisMaterial);
originToAxisLine.visible = false;
scene.add(originToAxisLine);

const axisFootGeometry = new THREE.SphereGeometry(0.06, 20, 14);
const axisFootMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.1, roughness: 0.55 });
const axisFootMesh = new THREE.Mesh(axisFootGeometry, axisFootMaterial);
axisFootMesh.visible = false;
scene.add(axisFootMesh);

const originToFootGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3()
]);
const originToFootMaterial = new THREE.LineBasicMaterial({ color: 0x111111 });
const originToFootLine = new THREE.Line(originToFootGeometry, originToFootMaterial);
originToFootLine.visible = false;
scene.add(originToFootLine);

const axisDirectionArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1.2, 0xff9f0a, 0.25, 0.16);
axisDirectionArrow.visible = false;
const axisDirectionLabel = createTextSprite('s', { scale: 0.625, color: '#111111' });
axisDirectionLabel.position.set(0, 1.55, 0);
axisDirectionArrow.add(axisDirectionLabel);
scene.add(axisDirectionArrow);

const originToFootTrailGeometry = new THREE.BufferGeometry();
const originToFootTrailMaterial = new THREE.LineBasicMaterial({
    color: 0x111111,
    transparent: true,
    opacity: 0.25
});
const originToFootTrailLine = new THREE.LineSegments(originToFootTrailGeometry, originToFootTrailMaterial);
originToFootTrailLine.visible = false;
scene.add(originToFootTrailLine);

const trajectoryGeometry = new THREE.BufferGeometry();
const trajectoryMaterial = new THREE.LineBasicMaterial({ color: 0x111111 });
const trajectoryLine = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
trajectoryLine.visible = false;
scene.add(trajectoryLine);

const state = {
    rotationMatrix: identity3(),
    rotationAxis: new THREE.Vector3(1, 0, 0),
    rotationAngle: 0,
    rotationValidity: {
        orthogonalityError: 0,
        determinant: 1,
        isValid: true
    },
    translation: new THREE.Vector3(),
    screwAxis: null,
    motion: null,
    animation: {
        playing: false,
        progress: 0,
        duration: 3
    }
};

let suppressEulerUpdates = false;
let suppressTranslationUpdates = false;
let suppressScrewInputs = false;

function identity3() {
    return [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ];
}

function cloneMatrix3(matrix) {
    return matrix.map((row) => row.slice());
}

function matrixTranspose(matrix) {
    return [
        [matrix[0][0], matrix[1][0], matrix[2][0]],
        [matrix[0][1], matrix[1][1], matrix[2][1]],
        [matrix[0][2], matrix[1][2], matrix[2][2]]
    ];
}

function matrixMultiply(a, b) {
    const result = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];
    for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
            result[row][col] =
                a[row][0] * b[0][col] +
                a[row][1] * b[1][col] +
                a[row][2] * b[2][col];
        }
    }
    return result;
}

function matrix3ToMatrix4(matrix) {
    const mat4 = new THREE.Matrix4();
    mat4.set(
        matrix[0][0], matrix[0][1], matrix[0][2], 0,
        matrix[1][0], matrix[1][1], matrix[1][2], 0,
        matrix[2][0], matrix[2][1], matrix[2][2], 0,
        0, 0, 0, 1
    );
    return mat4;
}

function matrix4ToMatrix3(matrix4) {
    const e = matrix4.elements;
    return [
        [e[0], e[4], e[8]],
        [e[1], e[5], e[9]],
        [e[2], e[6], e[10]]
    ];
}

function formatValue(value, decimals) {
    const factor = 10 ** decimals;
    const rounded = Math.round(value * factor) / factor;
    if (!Number.isFinite(rounded)) {
        return '0';
    }
    if (Number.isInteger(rounded)) {
        return rounded.toString();
    }
    return rounded.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '');
}

function parseNumericInputValue(value) {
    if (value === null || value === undefined) {
        return null;
    }
    const trimmed = String(value).trim();
    if (trimmed === '') {
        return null;
    }
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}

function readNumbersFromInputs(inputs) {
    const values = [];
    for (const input of inputs) {
        if (!input) {
            return null;
        }
        const parsed = parseNumericInputValue(input.value);
        if (parsed === null) {
            return null;
        }
        values.push(parsed);
    }
    return values;
}

function buildRotationMatrix() {
    if (rotationInputs.length !== 9) {
        return identity3();
    }
    const values = readNumbersFromInputs(rotationInputs);
    if (!values || values.length !== 9) {
        return null;
    }
    return [
        [values[0], values[1], values[2]],
        [values[3], values[4], values[5]],
        [values[6], values[7], values[8]]
    ];
}

function getTranslationVector() {
    if (translationInputs.length !== 3) {
        return null;
    }
    const values = readNumbersFromInputs(translationInputs);
    if (!values || values.length !== 3) {
        return null;
    }
    return new THREE.Vector3(values[0], values[1], values[2]);
}

function updateRotationMatrixInputsFromMatrix(matrix) {
    const values = [];
    for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
            values.push(formatValue(matrix[row][col], 6));
        }
    }
    values.forEach((value, index) => {
        if (rotationInputs[index]) {
            rotationInputs[index].value = value;
        }
    });
}

function updateTranslationInputsFromVector(vector) {
    if (!vector || translationInputs.length !== 3) {
        return;
    }
    const formatted = [vector.x, vector.y, vector.z].map((value) => formatValue(value, 6));
    suppressTranslationUpdates = true;
    translationInputs.forEach((input, index) => {
        if (input) {
            input.value = formatted[index];
        }
    });
    suppressTranslationUpdates = false;
}

function buildMatrixFromEulerInputs() {
    if (!eulerSequenceSelect || eulerInputs.length < 3) {
        return identity3();
    }
    const order = eulerSequenceSelect.value || 'XYZ';
    const values = readNumbersFromInputs(eulerInputs);
    if (!values || values.length !== 3) {
        return null;
    }
    const radians = values.map((value) => THREE.MathUtils.degToRad(value));
    const euler = new THREE.Euler(radians[0], radians[1], radians[2], order);
    const matrix4 = new THREE.Matrix4().makeRotationFromEuler(euler);
    return [
        [matrix4.elements[0], matrix4.elements[4], matrix4.elements[8]],
        [matrix4.elements[1], matrix4.elements[5], matrix4.elements[9]],
        [matrix4.elements[2], matrix4.elements[6], matrix4.elements[10]]
    ];
}

function updateEulerInputsFromMatrix(matrix) {
    if (!eulerSequenceSelect || eulerInputs.length < 3) {
        return;
    }
    const order = eulerSequenceSelect.value || 'XYZ';
    const matrix4 = new THREE.Matrix4().set(
        matrix[0][0], matrix[0][1], matrix[0][2], 0,
        matrix[1][0], matrix[1][1], matrix[1][2], 0,
        matrix[2][0], matrix[2][1], matrix[2][2], 0,
        0, 0, 0, 1
    );
    const euler = new THREE.Euler().setFromRotationMatrix(matrix4, order);
    const angles = [euler.x, euler.y, euler.z].map((angle) => wrapAngleDegrees(THREE.MathUtils.radToDeg(angle)));
    suppressEulerUpdates = true;
    eulerInputs.forEach((input, index) => {
        if (input) {
            input.value = formatValue(angles[index], 3);
        }
    });
    suppressEulerUpdates = false;
}

function wrapAngleDegrees(value) {
    return THREE.MathUtils.euclideanModulo(value + 180, 360) - 180;
}

function matrixDifferenceNorm(a, b) {
    let sum = 0;
    for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
            const diff = a[row][col] - b[row][col];
            sum += diff * diff;
        }
    }
    return Math.sqrt(sum);
}

function determinant3(m) {
    return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
        - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
        + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
}

function matrixInverse3(m) {
    const det = determinant3(m);
    if (Math.abs(det) < 1e-10) {
        return null;
    }
    const invDet = 1 / det;
    return [
        [
            (m[1][1] * m[2][2] - m[1][2] * m[2][1]) * invDet,
            (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * invDet,
            (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * invDet
        ],
        [
            (m[1][2] * m[2][0] - m[1][0] * m[2][2]) * invDet,
            (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * invDet,
            (m[0][2] * m[1][0] - m[0][0] * m[1][2]) * invDet
        ],
        [
            (m[1][0] * m[2][1] - m[1][1] * m[2][0]) * invDet,
            (m[0][1] * m[2][0] - m[0][0] * m[2][1]) * invDet,
            (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * invDet
        ]
    ];
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function isValidRotationMatrix(r) {
    const rt = matrixTranspose(r);
    const identity = identity3();
    const shouldBeIdentity = matrixMultiply(rt, r);
    const orthoError = matrixDifferenceNorm(shouldBeIdentity, identity);
    const det = determinant3(r);
    return {
        orthogonalityError: orthoError,
        determinant: det,
        isValid: orthoError < 1e-2 && Math.abs(det - 1) < 1e-2
    };
}

function rotationMatrixToAxisAngle(r) {
    const matrix4 = new THREE.Matrix4().set(
        r[0][0], r[0][1], r[0][2], 0,
        r[1][0], r[1][1], r[1][2], 0,
        r[2][0], r[2][1], r[2][2], 0,
        0, 0, 0, 1
    );
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix4).normalize();
    const angle = 2 * Math.acos(clamp(quaternion.w, -1, 1));
    const sinHalfAngle = Math.sqrt(Math.max(0, 1 - quaternion.w * quaternion.w));
    const axis = new THREE.Vector3();
    if (sinHalfAngle < 1e-6) {
        axis.set(1, 0, 0);
    } else {
        axis.set(
            quaternion.x / sinHalfAngle,
            quaternion.y / sinHalfAngle,
            quaternion.z / sinHalfAngle
        ).normalize();
    }
    return { axis, angle };
}

function solveAxisPoint(rotationMatrix, translation, axisDirection) {
    const parallel = axisDirection.clone().multiplyScalar(translation.dot(axisDirection));
    const perpendicular = translation.clone().sub(parallel);

    if (perpendicular.lengthSq() < 1e-12) {
        return new THREE.Vector3();
    }

    const rows = [
        [1 - rotationMatrix[0][0], -rotationMatrix[0][1], -rotationMatrix[0][2]],
        [-rotationMatrix[1][0], 1 - rotationMatrix[1][1], -rotationMatrix[1][2]],
        [-rotationMatrix[2][0], -rotationMatrix[2][1], 1 - rotationMatrix[2][2]],
        [axisDirection.x, axisDirection.y, axisDirection.z]
    ];
    const rhs = [perpendicular.x, perpendicular.y, perpendicular.z, 0];

    const ata = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];
    const atb = [0, 0, 0];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        const value = rhs[rowIndex];
        for (let i = 0; i < 3; i += 1) {
            atb[i] += row[i] * value;
            for (let j = 0; j < 3; j += 1) {
                ata[i][j] += row[i] * row[j];
            }
        }
    }

    const ataInverse = matrixInverse3(ata);
    if (!ataInverse) {
        return null;
    }

    const solution = new THREE.Vector3(
        ataInverse[0][0] * atb[0] + ataInverse[0][1] * atb[1] + ataInverse[0][2] * atb[2],
        ataInverse[1][0] * atb[0] + ataInverse[1][1] * atb[1] + ataInverse[1][2] * atb[2],
        ataInverse[2][0] * atb[0] + ataInverse[2][1] * atb[1] + ataInverse[2][2] * atb[2]
    );

    const projection = axisDirection.clone().multiplyScalar(solution.dot(axisDirection));
    return solution.sub(projection);
}

function computeAxisPointFallback(axisDirection, angle, translation) {
    const halfAngle = angle / 2;
    const tanHalf = Math.tan(halfAngle);
    const b = axisDirection.clone().multiplyScalar(tanHalf);
    const bDot = b.dot(b);
    if (!Number.isFinite(tanHalf) || bDot < 1e-12) {
        return new THREE.Vector3();
    }
    const bCrossT = b.clone().cross(translation);
    const bCrossBT = b.clone().cross(b.clone().cross(translation));
    const numerator = bCrossT.sub(bCrossBT);
    const c = numerator.multiplyScalar(1 / (2 * bDot));
    const projection = axisDirection.clone().multiplyScalar(c.dot(axisDirection));
    return c.sub(projection);
}

function computeScrewParameters(rotationMatrix, translation) {
    const { axis, angle } = rotationMatrixToAxisAngle(rotationMatrix);
    const translationLength = translation.length();
    const isTinyRotation = Math.abs(angle) < 1e-6;

    if (translationLength < 1e-6 && isTinyRotation) {
        return {
            success: true,
            pureTranslation: true,
            axisDirection: new THREE.Vector3(1, 0, 0),
            axisPoint: new THREE.Vector3(),
            rotationAngle: 0,
            displacement: 0,
            pitch: Infinity,
            translation: new THREE.Vector3()
        };
    }

    if (isTinyRotation) {
        if (translationLength < 1e-9) {
            return {
                success: true,
                pureTranslation: true,
                axisDirection: new THREE.Vector3(1, 0, 0),
                axisPoint: new THREE.Vector3(),
                rotationAngle: 0,
                displacement: 0,
                pitch: Infinity,
                translation: new THREE.Vector3()
            };
        }
        const direction = translation.clone().normalize();
        const displacement = translationLength;
        return {
            success: true,
            pureTranslation: true,
            axisDirection: direction,
            axisPoint: new THREE.Vector3(),
            rotationAngle: 0,
            displacement,
            pitch: Infinity,
            translation: translation.clone()
        };
    }

    const axisDirection = axis.clone().normalize();
    const displacement = translation.dot(axisDirection);
    const axisPoint = solveAxisPoint(rotationMatrix, translation, axisDirection)
        || computeAxisPointFallback(axisDirection, angle, translation)
        || new THREE.Vector3();

    const pitch = Math.abs(angle) > 1e-6 ? displacement / angle : Infinity;

    return {
        success: true,
        pureTranslation: false,
        axisDirection,
        axisPoint,
        rotationAngle: angle,
        displacement,
        pitch,
        translation: translation.clone()
    };
}

function computeTransformAtProgress(motion, progress) {
    const clamped = clamp(progress, 0, 1);
    const identityQuaternion = new THREE.Quaternion();
    if (!motion) {
        return {
            position: new THREE.Vector3(),
            quaternion: identityQuaternion
        };
    }
    if (motion.pureTranslation) {
        const position = motion.translation.clone().multiplyScalar(clamped);
        return {
            position,
            quaternion: identityQuaternion
        };
    }
    const axisDirection = motion.axisDirection.clone().normalize();
    const axisPoint = motion.axisPoint.clone();
    const theta = motion.rotationAngle * clamped;
    const quaternion = new THREE.Quaternion().setFromAxisAngle(axisDirection, theta);
    const translationAlongAxis = axisDirection.clone().multiplyScalar(motion.displacement * clamped);
    const offset = axisPoint.clone().negate();
    const rotatedOffset = offset.clone().applyQuaternion(quaternion);
    const position = rotatedOffset.add(axisPoint).add(translationAlongAxis);
    return {
        position,
        quaternion
    };
}

function computeAxisFootPoint(motion, position) {
    if (!motion || !motion.axisDirection || !motion.axisPoint || !position) {
        return null;
    }
    const axisDirection = motion.axisDirection.clone();
    if (axisDirection.lengthSq() < 1e-12) {
        return null;
    }
    axisDirection.normalize();
    const axisPoint = motion.axisPoint.clone();
    const toPosition = position.clone().sub(axisPoint);
    const projectionLength = toPosition.dot(axisDirection);
    return axisPoint.add(axisDirection.multiplyScalar(projectionLength));
}

function updateAxisFootVisualFromPosition(motion, position) {
    const footPoint = computeAxisFootPoint(motion, position);
    if (!footPoint || !position) {
        axisFootMesh.visible = false;
        originToFootLine.visible = false;
        return;
    }

    axisFootMesh.position.copy(footPoint);
    axisFootMesh.visible = true;

    const distanceSq = footPoint.distanceToSquared(position);
    if (distanceSq < 1e-10) {
        originToFootLine.visible = false;
    } else {
        originToFootGeometry.setFromPoints([position.clone(), footPoint.clone()]);
        originToFootLine.visible = true;
    }

}

function updateTrajectoryLine(motion) {
    if (!motion) {
        trajectoryLine.visible = false;
        return;
    }
    if (motion.pureTranslation) {
        if (!motion.translation || motion.translation.lengthSq() < 1e-12) {
            trajectoryLine.visible = false;
            return;
        }
    } else if (Math.abs(motion.rotationAngle) < 1e-6 && Math.abs(motion.displacement) < 1e-6) {
        trajectoryLine.visible = false;
        return;
    }
    const samples = 80;
    const points = [];
    for (let i = 0; i <= samples; i += 1) {
        const t = i / samples;
        const transform = computeTransformAtProgress(motion, t);
        points.push(transform.position);
    }
    trajectoryGeometry.setFromPoints(points);
    trajectoryLine.visible = true;
}

function updateOriginToFootTrail(motion) {
    if (!motion) {
        originToFootTrailLine.visible = false;
        return;
    }
    const samples = 80;
    const segmentPoints = [];
    for (let i = 0; i <= samples; i += 1) {
        const t = i / samples;
        const transform = computeTransformAtProgress(motion, t);
        const footPoint = computeAxisFootPoint(motion, transform.position);
        if (footPoint) {
            segmentPoints.push(transform.position.clone(), footPoint.clone());
        }
    }
    if (segmentPoints.length === 0) {
        originToFootTrailLine.visible = false;
        return;
    }
    originToFootTrailGeometry.setFromPoints(segmentPoints);
    originToFootTrailLine.visible = true;
}

function updateScrewAxisVisual(point, axis) {
    if (!point || !axis) {
        screwAxisLine.visible = false;
        axisPointMesh.visible = false;
        originToAxisLine.visible = false;
        axisDirectionArrow.visible = false;
        return;
    }
    const direction = axis.clone();
    if (direction.lengthSq() < 1e-8) {
        screwAxisLine.visible = false;
        axisPointMesh.visible = false;
        originToAxisLine.visible = false;
        axisDirectionArrow.visible = false;
        return;
    }
    direction.normalize();
    const length = 6;
    const start = point.clone().add(direction.clone().multiplyScalar(-length));
    const end = point.clone().add(direction.clone().multiplyScalar(length));
    screwAxisGeometry.setFromPoints([start, end]);
    screwAxisLine.computeLineDistances();
    screwAxisLine.visible = true;

    axisPointMesh.position.copy(point);
    axisPointMesh.visible = true;

    originToAxisGeometry.setFromPoints([new THREE.Vector3(0, 0, 0), point.clone()]);
    originToAxisLine.visible = true;

    const arrowLength = 1.4;
    axisDirectionArrow.position.copy(point);
    axisDirectionArrow.setDirection(direction);
    axisDirectionArrow.setLength(arrowLength, 0.28, 0.16);
    axisDirectionLabel.position.set(0, arrowLength + 0.3, 0);
    axisDirectionArrow.visible = true;
}

function clearScrewInputs() {
    screwAxisDirectionInputs.forEach((input) => {
        if (input) {
            input.value = '';
        }
    });
    screwAxisPointInputs.forEach((input) => {
        if (input) {
            input.value = '';
        }
    });
    if (screwAngleInput) {
        screwAngleInput.value = '';
    }
    if (screwDisplacementInput) {
        screwDisplacementInput.value = '';
    }
}

function updateScrewInputsFromState() {
    suppressScrewInputs = true;
    if (!state.screwAxis) {
        clearScrewInputs();
        suppressScrewInputs = false;
        return;
    }

    if (screwAxisDirectionInputs.length >= 3 && state.screwAxis.axisDirection) {
        const direction = state.screwAxis.axisDirection.clone().normalize();
        const components = [direction.x, direction.y, direction.z].map((value) => formatValue(value, 6));
        screwAxisDirectionInputs.forEach((input, index) => {
            if (input) {
                input.value = components[index];
            }
        });
    }

    if (screwAxisPointInputs.length >= 3 && state.screwAxis.axisPoint) {
        const point = state.screwAxis.axisPoint;
        const components = [point.x, point.y, point.z].map((value) => formatValue(value, 6));
        screwAxisPointInputs.forEach((input, index) => {
            if (input) {
                input.value = components[index];
            }
        });
    }

    if (screwAngleInput) {
        const angleDeg = THREE.MathUtils.radToDeg(state.screwAxis.rotationAngle ?? 0);
        screwAngleInput.value = formatValue(angleDeg, 6);
    }

    if (screwDisplacementInput) {
        const displacement = state.screwAxis.displacement;
        screwDisplacementInput.value = Number.isFinite(displacement) ? formatValue(displacement, 6) : '';
    }
    suppressScrewInputs = false;
}

function resetFinalBodyPose() {
    finalBody.position.set(0, 0, 0);
    finalBody.quaternion.identity();
}

function updateFinalBodyPose() {
    const rotation = state.rotationMatrix;
    if (!rotation) {
        resetFinalBodyPose();
        return;
    }
    const matrix4 = new THREE.Matrix4().set(
        rotation[0][0], rotation[0][1], rotation[0][2], 0,
        rotation[1][0], rotation[1][1], rotation[1][2], 0,
        rotation[2][0], rotation[2][1], rotation[2][2], 0,
        0, 0, 0, 1
    );
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix4);
    finalBody.quaternion.copy(quaternion);
    finalBody.position.copy(state.translation);
}

function setMotionData(data) {
    state.motion = data;
    animatedBody.visible = !!data;
    togglePlayback(false);
    resetMotion();
    if (data) {
        updateTrajectoryLine(data);
        updateOriginToFootTrail(data);
        applyTransform(0);
    } else {
        trajectoryLine.visible = false;
        axisFootMesh.visible = false;
        originToFootLine.visible = false;
        originToFootTrailLine.visible = false;
    }
}

function resetMotion() {
    state.animation.progress = 0;
    if (progressSlider) {
        progressSlider.value = '0';
    }
    animatedBody.position.set(0, 0, 0);
    animatedBody.quaternion.identity();
}

function applyTransform(progress) {
    if (!state.motion) {
        animatedBody.visible = false;
        updateAxisFootVisualFromPosition(null, null);
        originToFootTrailLine.visible = false;
        return;
    }
    animatedBody.visible = true;
    const transform = computeTransformAtProgress(state.motion, progress);
    animatedBody.position.copy(transform.position);
    animatedBody.quaternion.copy(transform.quaternion);
    updateAxisFootVisualFromPosition(state.motion, transform.position);
}

function applyRotationMatrixAndRefresh(rotationMatrix, options = {}) {
    const { syncEuler = false, syncMatrixInputs = false, skipScrew = false } = options;
    if (!rotationMatrix) {
        clearScrewInputs();
        screwAxisLine.visible = false;
        axisPointMesh.visible = false;
        originToAxisLine.visible = false;
        state.screwAxis = null;
        state.translation.set(0, 0, 0);
        resetFinalBodyPose();
        setMotionData(null);
        return false;
    }

    const validity = isValidRotationMatrix(rotationMatrix);
    const { axis, angle } = rotationMatrixToAxisAngle(rotationMatrix);

    state.rotationMatrix = cloneMatrix3(rotationMatrix);
    state.rotationValidity = validity;
    state.rotationAxis = axis.clone();
    state.rotationAngle = angle;

    if (syncMatrixInputs) {
        updateRotationMatrixInputsFromMatrix(rotationMatrix);
    }

    if (syncEuler && validity.isValid) {
        updateEulerInputsFromMatrix(rotationMatrix);
    }

    if (!validity.isValid) {
        screwAxisLine.visible = false;
        axisPointMesh.visible = false;
        originToAxisLine.visible = false;
        state.screwAxis = null;
        state.translation.set(0, 0, 0);
        resetFinalBodyPose();
        setMotionData(null);
        if (!skipScrew) {
            clearScrewInputs();
        }
        return false;
    }

    if (!skipScrew) {
        return updateScrewDisplay(rotationMatrix);
    }

    return true;
}

function updateScrewDisplay(rotationMatrix) {
    if (!rotationMatrix || !state.rotationValidity || !state.rotationValidity.isValid) {
        clearScrewInputs();
        screwAxisLine.visible = false;
        axisPointMesh.visible = false;
        originToAxisLine.visible = false;
        state.screwAxis = null;
        state.translation.set(0, 0, 0);
        resetFinalBodyPose();
        setMotionData(null);
        return false;
    }

    const translation = getTranslationVector();
    if (!translation) {
        clearScrewInputs();
        screwAxisLine.visible = false;
        axisPointMesh.visible = false;
        originToAxisLine.visible = false;
        state.screwAxis = null;
        state.translation.set(0, 0, 0);
        resetFinalBodyPose();
        setMotionData(null);
        return false;
    }

    state.translation.copy(translation);
    updateFinalBodyPose();

    const result = computeScrewParameters(rotationMatrix, translation);
    if (!result.success) {
        clearScrewInputs();
        screwAxisLine.visible = false;
        axisPointMesh.visible = false;
        originToAxisLine.visible = false;
        state.screwAxis = null;
        state.translation.set(0, 0, 0);
        resetFinalBodyPose();
        setMotionData(null);
        return false;
    }

    state.screwAxis = {
        pureTranslation: result.pureTranslation,
        axisDirection: result.axisDirection ? result.axisDirection.clone() : null,
        axisPoint: result.axisPoint ? result.axisPoint.clone() : null,
        rotationAngle: result.rotationAngle ?? 0,
        displacement: result.displacement ?? 0,
        pitch: result.pitch ?? 0
    };

    updateScrewInputsFromState();

    if (result.axisDirection) {
        const axisPoint = result.axisPoint ? result.axisPoint.clone() : new THREE.Vector3();
        updateScrewAxisVisual(axisPoint, result.axisDirection.clone());
    } else {
        updateScrewAxisVisual(null, null);
    }

    setMotionData(result);
    return true;
}

function applyScrewParametersFromTransformation() {
    if (suppressScrewInputs) {
        return false;
    }
    const rotationMatrix = buildRotationMatrix();
    const translation = getTranslationVector();
    if (!rotationMatrix || !translation) {
        clearScrewInputs();
        screwAxisLine.visible = false;
        state.screwAxis = null;
        state.translation.set(0, 0, 0);
        resetFinalBodyPose();
        setMotionData(null);
        return false;
    }
    updateTranslationInputsFromVector(translation);
    const success = applyRotationMatrixAndRefresh(rotationMatrix, { syncEuler: true, syncMatrixInputs: false });
    if (!success) {
        return false;
    }
    state.animation.progress = 1;
    if (progressSlider) {
        progressSlider.value = '1';
    }
    applyTransform(1);
    return true;
}

function togglePlayback(forceState) {
    if (!state.motion) {
        state.animation.playing = false;
        if (playButton) {
            playButton.textContent = 'Play';
        }
        return;
    }
    const nextState = typeof forceState === 'boolean' ? forceState : !state.animation.playing;
    state.animation.playing = nextState;
    if (playButton) {
        playButton.textContent = nextState ? 'Pause' : 'Play';
    }
    if (nextState && state.animation.progress >= 1) {
        state.animation.progress = 0;
        if (progressSlider) {
            progressSlider.value = '0';
        }
        applyTransform(0);
    }
}

function updateRendererSize() {
    const width = container.clientWidth || container.offsetWidth || window.innerWidth;
    const height = container.clientHeight || container.offsetHeight || window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

window.addEventListener('resize', updateRendererSize);

rotationInputs.forEach((input) => {
    input.addEventListener('input', () => {
        const rotationMatrix = buildRotationMatrix();
        if (!rotationMatrix) {
            return;
        }
        applyRotationMatrixAndRefresh(rotationMatrix, { syncEuler: true });
    });
});

eulerInputs.forEach((input) => {
    input.addEventListener('input', () => {
        if (suppressEulerUpdates) {
            return;
        }
        const rotationMatrix = buildMatrixFromEulerInputs();
        if (!rotationMatrix) {
            return;
        }
        applyRotationMatrixAndRefresh(rotationMatrix, { syncMatrixInputs: true });
    });
});

if (eulerSequenceSelect) {
    eulerSequenceSelect.addEventListener('change', () => {
        const matrix = buildMatrixFromEulerInputs();
        if (!matrix) {
            return;
        }
        applyRotationMatrixAndRefresh(matrix, { syncMatrixInputs: true });
    });
}

translationInputs.forEach((input) => {
    input.addEventListener('input', () => {
        if (suppressTranslationUpdates) {
            return;
        }
        if (!state.rotationValidity || !state.rotationValidity.isValid) {
            return;
        }
        const translation = getTranslationVector();
        if (!translation) {
            clearScrewInputs();
            screwAxisLine.visible = false;
            state.screwAxis = null;
            state.translation.set(0, 0, 0);
            resetFinalBodyPose();
            setMotionData(null);
            return;
        }
        state.translation.copy(translation);
        updateFinalBodyPose();
        updateScrewDisplay(state.rotationMatrix);
    });
});

if (screwButton) {
    screwButton.addEventListener('click', () => {
        applyScrewParametersFromTransformation();
    });
}

if (progressSlider) {
    progressSlider.addEventListener('input', (event) => {
        const value = parseFloat(event.target.value);
        if (!Number.isFinite(value)) {
            return;
        }
        state.animation.progress = clamp(value, 0, 1);
        applyTransform(state.animation.progress);
        if (state.animation.playing) {
            togglePlayback(false);
        }
    });
}

if (playButton) {
    playButton.addEventListener('click', () => {
        if (!state.motion) {
            return;
        }
        togglePlayback();
    });
}

let previousTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const delta = (now - previousTime) / 1000;
    previousTime = now;

    if (state.animation.playing && state.motion) {
        const speed = 1 / state.animation.duration;
        state.animation.progress = Math.min(1, state.animation.progress + delta * speed);
        if (progressSlider) {
            progressSlider.value = state.animation.progress.toFixed(3);
        }
        applyTransform(state.animation.progress);
        if (state.animation.progress >= 1) {
            togglePlayback(false);
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

const initialMatrix = buildRotationMatrix();
if (initialMatrix) {
    applyRotationMatrixAndRefresh(initialMatrix, { syncEuler: true, syncMatrixInputs: true });
    updateScrewDisplay(initialMatrix);
} else {
    resetFinalBodyPose();
    setMotionData(null);
}

applyTransform(0);
updateRendererSize();
animate();
