// Basic Three.js setup for Moon Viewer with crater demo data and iframe controls

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';

let scene, camera, renderer, moonMesh;
let craterMeshes = [];
let selectedCraterMesh = null;

// Initialize the 3D Scene
function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Ambient and directional light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 3, 5);
  scene.add(directionalLight);

  // Load Moon texture
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('assets/moon_texture.jpg', (texture) => {
    const geometry = new THREE.SphereGeometry(2.5, 64, 64);
    const material = new THREE.MeshPhongMaterial({ map: texture });
    moonMesh = new THREE.Mesh(geometry, material);
    scene.add(moonMesh);
  });

  camera.position.z = 8;
  createCraterMarkers();
  animate();
}

// Create crater markers
function createCraterMarkers() {
  fetch('assets/craters.json')
    .then(response => response.json())
    .then(craters => {
      craters.forEach(crater => {
        const phi = (90 - crater.lat) * (Math.PI / 180);
        const theta = (crater.lng + 180) * (Math.PI / 180);
        const radius = 2.5;

        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const z = (radius * Math.sin(phi) * Math.sin(theta));
        const y = (radius * Math.cos(phi));

        const geometry = new THREE.RingGeometry(0.05, 0.1, 16);
        const material = new THREE.MeshBasicMaterial({
          color: crater.available ? 0x00ff00 : 0xff0000,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide
        });

        const craterMesh = new THREE.Mesh(geometry, material);
        craterMesh.position.set(x, y, z);
        craterMesh.lookAt(0, 0, 0);
        craterMesh.userData = crater;

        scene.add(craterMesh);
        craterMeshes.push(craterMesh);
      });
    });
}

// Raycasting for crater clicks
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(craterMeshes);
  if (intersects.length > 0) {
    const clickedCrater = intersects[0].object.userData;
    if (selectedCraterMesh) selectedCraterMesh.material.color.setHex(selectedCraterMesh.userData.available ? 0x00ff00 : 0xff0000);
    selectedCraterMesh = intersects[0].object;
    selectedCraterMesh.material.color.setHex(0x0099ff);
    window.parent.postMessage({ type: 'crater-selected', crater: clickedCrater }, '*');
  }
}
renderer.domElement.addEventListener('click', onMouseClick);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  if (moonMesh) moonMesh.rotation.y += 0.0008;
  renderer.render(scene, camera);
}

// Handle parent iframe messages
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://tomuxd.github.io') return;
  const { type, value, craterId } = event.data;
  switch (type) {
    case 'zoom': handleZoom(value); break;
    case 'rotation': handleRotation(value); break;
    case 'reset': handleReset(); break;
    case 'highlight-crater': highlightCrater(craterId); break;
  }
});

function handleZoom(value) {
  const minDistance = 4, maxDistance = 10;
  const distance = maxDistance - ((value - 20) / 80) * (maxDistance - minDistance);
  camera.position.setLength(distance);
  camera.lookAt(0, 0, 0);
}
function handleRotation(value) {
  if (moonMesh) moonMesh.rotation.y = (value * Math.PI) / 180;
}
function handleReset() { handleZoom(50); handleRotation(0); }
function highlightCrater(id) {
  craterMeshes.forEach(m => m.material.color.setHex(m.userData.available ? 0x00ff00 : 0xff0000));
  const target = craterMeshes.find(m => m.userData.id === id);
  if (target) { target.material.color.setHex(0x0099ff); selectedCraterMesh = target; }
}

window.addEventListener('load', () => {
  window.parent.postMessage({ type: 'iframe-ready' }, '*');
});

init();
