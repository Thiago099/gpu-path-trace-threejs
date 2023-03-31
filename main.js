import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { PathTracingSceneGenerator, PathTracingRenderer, PhysicalPathTracingMaterial } from 'three-gpu-pathtracer';
//orbit
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

async function init() {
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	const renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	//orbit
	const controls = new OrbitControls(camera, renderer.domElement);

	const geometry = new THREE.BoxGeometry(1,1,1);
	const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
	const cube = new THREE.Mesh(geometry, material);
	scene.add(cube);

	camera.position.z = 5;
	//rotate cube


	// create a new Float32Array to store the tangents
	const tangents = new Float32Array(geometry.attributes.position.count * 4);

	// set the tangents for each vertex
	for (let i = 0; i < tangents.length; i += 4) {
		tangents[i] = 1;
		tangents[i + 1] = 0;
		tangents[i + 2] = 0;
		tangents[i + 3] = 1;
	}

	// add the tangents as a new attribute to the geometry
	geometry.setAttribute('tangent', new THREE.BufferAttribute(tangents, 4));

	// create a new Float32Array to store the vertex colors
	const colors = new Float32Array(geometry.attributes.position.count * 3);

	// set the color for each vertex
	for (let i = 0; i < colors.length; i += 3) {
		colors[i] = Math.random();
		colors[i + 1] = Math.random();
		colors[i + 2] = Math.random();
	}

	// add the colors as a new attribute to the geometry
	geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

	//material index
	const materialIndex = new Float32Array(geometry.attributes.position.count);
	for (let i = 0; i < materialIndex.length; i++) {
		materialIndex[i] = 0;
	}

	geometry.setAttribute('materialIndex', new THREE.BufferAttribute(materialIndex, 1));





	renderer.outputEncoding = THREE.sRGBEncoding;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;


	var pt_init = false
	var fsQuad;
	var ptRenderer;
	async function initPt() {

		const ptMaterial = new PhysicalPathTracingMaterial();
		ptRenderer = new PathTracingRenderer(renderer);
		ptRenderer.setSize(window.innerWidth, window.innerHeight);
		ptRenderer.camera = camera;
		ptRenderer.material = ptMaterial;

		ptRenderer.alpha = true;

		fsQuad = new FullScreenQuad(new THREE.MeshBasicMaterial({ map: ptRenderer.target.texture }));

		scene.updateMatrixWorld();

		const generator = new PathTracingSceneGenerator();
		const { bvh, textures, materials, lights } = generator.generate(scene);

		// update bvh and geometry attribute textures
		ptMaterial.bvh.updateFrom(bvh);
		console.log(geometry.attributes);
		ptMaterial.attributesArray.updateFrom(
			geometry.attributes.normal, 
			geometry.attributes.tangent, 
			geometry.attributes.uv,
			geometry.attributes.color
		);

		// update materials and texture arrays
		ptMaterial.materialIndexAttribute.updateFrom(geometry.attributes.materialIndex);
		ptMaterial.textures.setTextures(renderer, 2048, 2048, textures);
		ptMaterial.materials.updateFrom(materials, textures);

		// update the lights
		ptMaterial.lights.updateFrom(lights);

	}
	initPt().then(() => {
		pt_init = true;
	});

	document.addEventListener('mousedown', onMouseDown);
	document.addEventListener('mouseup', onMouseUp);
	document.addEventListener('mousemove', onMouseMove);
	var drag = false;
	function onMouseDown(event) {
		drag = true;
		ptRenderer.reset();
	}
	function onMouseUp(event) {
		drag = false;
	}
	function onMouseMove(event) {
		if (drag) {
			ptRenderer.reset();
		}
	}
			



	function animate() {
		if(!pt_init){
			renderer.render(scene, camera);
		}
		else
		{
			camera.updateMatrixWorld();
			ptRenderer.update();
			fsQuad.material.map = ptRenderer.target.texture;
			fsQuad.render(renderer);

		}

		requestAnimationFrame(animate);
	}
	animate();
}
init()