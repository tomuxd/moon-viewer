// === Three.js Moon Viewer with Controls ===
let scene, camera, renderer, moon, controls;

init();
animate();

function init() {
  scene = new THREE.Scene();

  const width = window.innerWidth;
  const height = window.innerHeight;

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 5);

  const viewerDiv = document.getElementById('viewer');
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  viewerDiv.appendChild(renderer.domElement);

  // === Lights ===
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 1);
  directional.position.set(5, 3, 5);
  scene.add(directional);

  // === Moon Sphere ===
  const geometry = new THREE.SphereGeometry(2, 64, 64);
  const texture = new THREE.TextureLoader().load(
    "https://threejs.org/examples/textures/moon_1024.jpg"
  );
  const material = new THREE.MeshStandardMaterial({ map: texture });
  moon = new THREE.Mesh(geometry, material);
  scene.add(moon);

  // === Orbit Controls ===
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;

  // === Window Resize ===
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // === Button Controls ===
  document.getElementById("zoomIn").addEventListener("click", () => {
    camera.position.multiplyScalar(0.9);
  });
  document.getElementById("zoomOut").addEventListener("click", () => {
    camera.position.multiplyScalar(1.1);
  });
  document.getElementById("rotLeft").addEventListener("click", () => {
    moon.rotation.y -= 0.1;
  });
  document.getElementById("rotRight").addEventListener("click", () => {
    moon.rotation.y += 0.1;
  });
  document.getElementById("rotUp").addEventListener("click", () => {
    moon.rotation.x += 0.1;
  });
  document.getElementById("rotDown").addEventListener("click", () => {
    moon.rotation.x -= 0.1;
  });
  document.getElementById("reset").addEventListener("click", () => {
    camera.position.set(0, 0, 5);
    controls.target.set(0, 0, 0);
    moon.rotation.set(0, 0, 0);
  });
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
