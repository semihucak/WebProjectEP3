import * as THREE from './build/three.module.js';
import { ARButton } from './jsm/webxr/ARButton.js';

import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
import { RGBELoader } from './jsm/loaders/RGBELoader.js';
import { RoughnessMipmapper } from './jsm/utils/RoughnessMipmapper.js';


let container;
let camera, scene, renderer;
let controller;

var reticle, pmremGenerator, current_object, controls, isAR, envmap;

let hitTestSource = null;
let hitTestSourceRequested = false;

init();
animate();

$(".ar-object").click(function () {
    if (current_object != null) {
        scene.remove(current_object);
    }

    loadModel($(this).attr("id"));
});

$("#ARButton").click(function () {
    current_object.visible = false;
    isAR = true;
});

function loadModel(model) {

    /*new RGBELoader()
        .setDataType(THREE.UnsignedByteType)
        .setPath('./textures/')
        .load('photo_studio_01_1k.hdr', function (texture) {

            var envmap = pmremGenerator.fromEquirectangular(texture).texture;

            scene.environment = envmap;
            texture.dispose();
            pmremGenerator.dispose();
            render();
        */
            var loader = new GLTFLoader().setPath('models/');
            loader.load(model + ".gltf", function (glb) {

                current_object = glb.scene;
                scene.add(current_object);


                //center the object in the screen
                var box = new THREE.Box3();
                box.setFromObject(current_object);
                box.center(controls.target);

                controls.update();
                render();
            });
/*
        });
        */
}

function init() {

    container = document.createElement('div');
    document.getElementById("container").appendChild(container);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    //

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', render);
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.target.set(0, 0, -0.2);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05; // smooth the rotation

    //

    //document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

    document.body.appendChild( ARButton.createButton( renderer, {
        requiredFeatures: [ 'hit-test' ],
        optionalFeatures: [ 'dom-overlay', 'dom-overlay-for-handheld-ar' ],
        domOverlay: { root: document.body } } )
    );

    //

    //const geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 32).translate(0, 0.1, 0);

    function onSelect() {

        if (reticle.visible) {

            /* const material = new THREE.MeshPhongMaterial({ color: 0xffffff * Math.random() });
             const mesh = new THREE.Mesh(geometry, material);
             mesh.position.setFromMatrixPosition(reticle.matrix);
             mesh.scale.y = Math.random() * 2 + 1;
             scene.add(mesh);*/

            current_object.position.setFromMatrixPosition(reticle.matrix);
            current_object.visible = true;

        }

    }

    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(- Math.PI / 2),
        new THREE.MeshBasicMaterial()
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    //

    window.addEventListener('resize', onWindowResize);

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

//

function animate() {

    renderer.setAnimationLoop(render);
    requestAnimationFrame(animate);
    controls.update();

}

function render(timestamp, frame) {

    if (frame) {

        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (hitTestSourceRequested === false) {

            session.requestReferenceSpace('viewer').then(function (referenceSpace) {

                session.requestHitTestSource({ space: referenceSpace }).then(function (source) {

                    hitTestSource = source;

                });

            });

            session.addEventListener('end', function () {

                hitTestSourceRequested = false;
                hitTestSource = null;

                reticle.visible = false;

                var box = new THREE.Box3();
				box.setFromObject(current_object);
				box.center(controls.target);

            });

            hitTestSourceRequested = true;

        }

        if (hitTestSource) {

            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length) {

                const hit = hitTestResults[0];

                reticle.visible = true;
                reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);

            } else {

                reticle.visible = false;

            }

        }

    }

    renderer.render(scene, camera);

}