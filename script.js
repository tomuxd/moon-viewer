// Moon Crater Registry - 3D Viewer with Parent Communication
// Three.js implementation for displaying moon with crater markers

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/controls/OrbitControls.js';

// Global variables
let scene, camera, renderer, moonMesh, controls;
let craterMeshes = [];
let glowMeshes = [];
let selectedCraterMesh = null;
let receivedCraters = [];
let isReady = false;

// Allowed origins for security
const ALLOWED_ORIGINS = [
  'https://tomuxd.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000', 
  'https://localhost:3000',
  'http://localhost:5173',
  'https://localhost:5173',
  // Add your production domain here
];

// Initialize the 3D Scene
function init() {
  console.log('🌙 Initializing Moon Crater Viewer...');
  
  // Scene setup
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    powerPreference: "high-performance"
  });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000011, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Lighting setup
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 3, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  // Add subtle fill light
  const fillLight = new THREE.DirectionalLight(0x4466aa, 0.3);
  fillLight.position.set(-3, -1, -2);
  scene.add(fillLight);

  // Camera position
  camera.position.set(0, 0, 8);

  // OrbitControls for mouse interaction
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.enablePan = false; // Disable panning to keep moon centered
  controls.minDistance = 4;
  controls.maxDistance = 12;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  // Load Moon model
  loadMoonModel();
  
  // Start animation loop
  animate();
}

// Load Moon GLB model with fallbacks
function loadMoonModel() {
  const loader = new GLTFLoader();
  const loadingEl = document.getElementById('loading');
  
  // Try to load GLB model first
  loader.load(
    'https://raw.githubusercontent.com/tomuxd/moon-viewer/main/assets/moon.glb',
    (gltf) => {
      console.log('✅ Moon GLB model loaded successfully');
      moonMesh = gltf.scene;
      moonMesh.scale.setScalar(2.5);
      moonMesh.receiveShadow = true;
      scene.add(moonMesh);
      
      if (loadingEl) loadingEl.style.display = 'none';
      notifyParentReady();
    },
    (progress) => {
      const percent = Math.round((progress.loaded / progress.total) * 100);
      console.log(`📦 Loading moon model: ${percent}%`);
      if (loadingEl) {
        loadingEl.innerHTML = `
          <div class="loading-spinner"></div>
          Loading Moon Model... ${percent}%
        `;
      }
    },
    (error) => {
      console.warn('⚠️ GLB model failed, trying texture fallback:', error);
      loadFallbackMoon();
    }
  );
}

// Fallback to textured sphere if GLB fails
function loadFallbackMoon() {
  const textureLoader = new THREE.TextureLoader();
  const loadingEl = document.getElementById('loading');
  
  if (loadingEl) {
    loadingEl.innerHTML = `
      <div class="loading-spinner"></div>
      Loading Moon Texture...
    `;
  }
  
  textureLoader.load(
    'https://raw.githubusercontent.com/tomuxd/moon-viewer/main/assets/moon_texture.jpg',
    (texture) => {
      console.log('✅ Moon texture loaded successfully');
      const geometry = new THREE.SphereGeometry(2.5, 64, 64);
      const material = new THREE.MeshPhongMaterial({ 
        map: texture,
        shininess: 5,
        bumpScale: 0.05
      });
      moonMesh = new THREE.Mesh(geometry, material);
      moonMesh.receiveShadow = true;
      scene.add(moonMesh);
      
      if (loadingEl) loadingEl.style.display = 'none';
      notifyParentReady();
    },
    undefined,
    (error) => {
      console.error('❌ Texture loading failed, using basic sphere:', error);
      createBasicMoon();
    }
  );
}

// Last resort: basic sphere
function createBasicMoon() {
  console.log('🔧 Creating basic moon sphere');
  const geometry = new THREE.SphereGeometry(2.5, 32, 32);
  const material = new THREE.MeshPhongMaterial({ 
    color: 0xcccccc,
    shininess: 5
  });
  moonMesh = new THREE.Mesh(geometry, material);
  moonMesh.receiveShadow = true;
  scene.add(moonMesh);
  
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.style.display = 'none';
  
  notifyParentReady();
}

// Notify parent that iframe is ready
function notifyParentReady() {
  isReady = true;
  console.log('📡 Notifying parent that iframe is ready');
  window.parent.postMessage({ 
    type: 'iframe-ready',
    timestamp: Date.now()
  }, '*');
}

// Create crater markers from parent data
function createCraterMarkers(craters) {
  console.log(`🎯 Creating crater markers for ${craters.length} craters`);
  
  // Clear existing markers
  clearCraterMarkers();
  receivedCraters = craters;

  craters.forEach((crater, index) => {
    // Convert lat/lng to 3D coordinates on sphere
    const phi = (90 - crater.lat) * (Math.PI / 180);
    const theta = (crater.lng + 180) * (Math.PI / 180);
    const radius = 2.52; // Slightly above moon surface

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    // Create crater marker
    const marker = createCraterMarker(crater, new THREE.Vector3(x, y, z));
    if (marker) {
      scene.add(marker);
      craterMeshes.push(marker);
      
      // Add glow effect for available craters
      if (crater.status === 'available') {
        const glow = createGlowEffect(new THREE.Vector3(x, y, z));
        scene.add(glow);
        glowMeshes.push(glow);
      }
    }
  });
  
  console.log(`✨ Created ${craterMeshes.length} crater markers`);
}

// Create individual crater marker
function createCraterMarker(crater, position) {
  let geometry, material;
  
  if (crater.status === 'available') {
    // Available craters - bright green spheres
    geometry = new THREE.SphereGeometry(0.06, 16, 16);
    material = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.9
    });
  } else {
    // Taken craters - red spheres  
    geometry = new THREE.SphereGeometry(0.04, 12, 12);
    material = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.8
    });
  }

  const craterMesh = new THREE.Mesh(geometry, material);
  craterMesh.position.copy(position);
  craterMesh.userData = crater;
  
  return craterMesh;
}

// Create glow effect for available craters
function createGlowEffect(position) {
  const glowGeometry = new THREE.SphereGeometry(0.1, 12, 12);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.15
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.copy(position);
  return glow;
}

// Clear all crater markers
function clearCraterMarkers() {
  craterMeshes.forEach(mesh => scene.remove(mesh));
  glowMeshes.forEach(mesh => scene.remove(mesh));
  craterMeshes = [];
  glowMeshes = [];
  selectedCraterMesh = null;
}

// Raycasting for crater clicks
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
  if (craterMeshes.length === 0) return;
  
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(craterMeshes);
  
  if (intersects.length > 0) {
    const clickedCrater = intersects[0].object.userData;
    selectCrater(intersects[0].object);
    
    // Convert to parent app format
    const parentCrater = {
      id: clickedCrater.id,
      name: clickedCrater.name,
      latitude: clickedCrater.lat,
      longitude: clickedCrater.lng,
      diameter: clickedCrater.diameter,
      isOfficial: false,
      isTaken: clickedCrater.status !== 'available',
      takenBy: clickedCrater.takenBy,
      price: clickedCrater.price || 0
    };
    
    console.log('🎯 Crater selected:', parentCrater.name);
    window.parent.postMessage({ 
      type: 'crater-selected', 
      crater: parentCrater 
    }, '*');
  }
}

// Select and highlight a crater
function selectCrater(craterMesh) {
  // Reset previous selection
  if (selectedCraterMesh) {
    const color = selectedCraterMesh.userData.status === 'available' ? 0x10b981 : 0xef4444;
    selectedCraterMesh.material.color.setHex(color);
  }
  
  // Highlight new selection
  selectedCraterMesh = craterMesh;
  selectedCraterMesh.material.color.setHex(0x3b82f6);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  if (controls) {
    controls.update();
  }
  
  // Animate glow effects
  glowMeshes.forEach((glow, index) => {
    const time = Date.now() * 0.002;
    glow.material.opacity = 0.1 + Math.sin(time + index) * 0.05;
  });
  
  renderer.render(scene, camera);
}

// Handle parent iframe messages
window.addEventListener('message', (event) => {
  // Security check
  const isLocalhost = event.origin.includes('localhost') || event.origin.includes('127.0.0.1');
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(event.origin);
  
  if (!isAllowedOrigin && !isLocalhost) {
    console.log('🚫 Message from unauthorized origin:', event.origin);
    return;
  }
  
  const { type, value, craterId, craters } = event.data || {};
  console.log('📨 Message received:', type);
  
  switch (type) {
    case 'sync-craters':
      if (craters && Array.isArray(craters)) {
        createCraterMarkers(craters);
      }
      break;
      
    case 'zoom':
      handleZoom(value);
      break;
      
    case 'rotation':
      handleRotation(value);
      break;
      
    case 'reset':
      handleReset();
      break;
      
    case 'highlight-crater':
      highlightCrater(craterId);
      break;
      
    case 'auto-rotate':
      if (controls) {
        controls.autoRotate = !!value;
      }
      break;
  }
});

// Control handlers
function handleZoom(value) {
  const minDistance = 4;
  const maxDistance = 12;
  const distance = minDistance + ((100 - value) / 100) * (maxDistance - minDistance);
  
  if (controls) {
    const direction = camera.position.clone().normalize();
    camera.position.copy(direction.multiplyScalar(distance));
    controls.update();
  }
}

function handleRotation(value) {
  if (moonMesh) {
    moonMesh.rotation.y = (value * Math.PI) / 180;
  }
}

function handleReset() {
  if (controls) {
    controls.reset();
    camera.position.set(0, 0, 8);
    controls.update();
  }
  if (moonMesh) {
    moonMesh.rotation.set(0, 0, 0);
  }
}

function highlightCrater(id) {
  if (!craterMeshes || craterMeshes.length === 0) return;
  
  const target = craterMeshes.find(mesh => mesh.userData.id === id);
  if (target) {
    selectCrater(target);
    
    // Focus camera on crater
    if (controls) {
      const craterPosition = target.position.clone();
      const cameraDistance = camera.position.length();
      const newCameraPosition = craterPosition.clone().normalize().multiplyScalar(cameraDistance);
      
      camera.position.copy(newCameraPosition);
      controls.update();
    }
  }
}

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Event listeners
renderer.domElement.addEventListener('click', onMouseClick);
window.addEventListener('resize', onWindowResize, false);

// Error handling
window.addEventListener('error', (event) => {
  console.error('🚨 Global error:', event.error);
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.innerHTML = `
      <div style="color: #ef4444;">
        ❌ Failed to load 3D viewer<br>
        <small>Please refresh the page</small>
      </div>
    `;
    loadingEl.classList.add('error');
  }
});

// Initialize when page loads
console.log('🚀 Starting Moon Crater Viewer initialization...');
init();
```

3. `craters.json` (Complete File - Optional)

```json
[
  {
    "id": "CR0001",
    "name": "Aurora East",
    "lat": 18.5,
    "lng": 122.7,
    "diameter": 2.3,
    "status": "available",
    "price": 29
  },
  {
    "id": "CR0002",
    "name": "Mare Ridge",
    "lat": 4.12,
    "lng": -39.8,
    "diameter": 5.2,
    "status": "available",
    "price": 49
  },
  {
    "id": "CR0003",
    "name": "Tranquil Hollow",
    "lat": 0.6741,
    "lng": 23.4721,
    "diameter": 1.9,
    "status": "taken",
    "takenBy": "Anonymous Customer",
    "price": 0
  },
  {
    "id": "CR0004",
    "name": "Oceanus Arch",
    "lat": -14.9,
    "lng": 56.2,
    "diameter": 3.5,
    "status": "available",
    "price": 39
  },
  {
    "id": "CR0005",
    "name": "Copernicus (demo)",
    "lat": 9.7,
    "lng": -20.1,
    "diameter": 9.3,
    "status": "taken",
    "takenBy": "Official IAU",
    "price": 0
  },
  {
    "id": "CR0006",
    "name": "Silent Basin",
    "lat": -23.5,
    "lng": 81.12,
    "diameter": 2.7,
    "status": "available",
    "price": 29
  },
  {
    "id": "CR0007",
    "name": "Helios Spur",
    "lat": 31.2,
    "lng": -12.2,
    "diameter": 4.8,
    "status": "available",
    "price": 49
  },
  {
    "id": "CR0008",
    "name": "Tycho (demo)",
    "lat": -43.3,
    "lng": -11.2,
    "diameter": 8.5,
    "status": "taken",
    "takenBy": "Official IAU",
    "price": 0
  },
  {
    "id": "CR0009",
    "name": "Lunar Vale",
    "lat": 13.41,
    "lng": 39.9,
    "diameter": 6.0,
    "status": "available",
    "price": 49
  },
  {
    "id": "CR0010",
    "name": "North Plateau",
    "lat": 62.0,
    "lng": -30.0,
    "diameter": 2.1,
    "status": "available",
    "price": 29
  },
  {
    "id": "CR0011",
    "name": "East Hollow",
    "lat": -5.3,
    "lng": -140.2,
    "diameter": 3.0,
    "status": "available",
    "price": 39
  },
  {
    "id": "CR0012",
    "name": "Southern Plain",
    "lat": -29.4,
    "lng": 20.4,
    "diameter": 7.2,
    "status": "available",
    "price": 59
  },
  {
    "id": "CR0013",
    "name": "Obscura",
    "lat": 2.1,
    "lng": 10.9,
    "diameter": 1.2,
    "status": "taken",
    "takenBy": "Previous Customer",
    "price": 0
  },
  {
    "id": "CR0014",
    "name": "Perseus Bowl",
    "lat": 44.3,
    "lng": 60.4,
    "diameter": 5.5,
    "status": "available",
    "price": 49
  },
  {
    "id": "CR0015",
    "name": "Gale Ridge",
    "lat": -8.8,
    "lng": -70.2,
    "diameter": 3.2,
    "status": "available",
    "price": 39
  },
  {
    "id": "CR0016",
    "name": "Silver Dune",
    "lat": 21.9,
    "lng": 87.4,
    "diameter": 2.6,
    "status": "available",
    "price": 29
  },
  {
    "id": "CR0017",
    "name": "Shadow Hollow",
    "lat": -39.1,
    "lng": 10.1,
    "diameter": 4.1,
    "status": "available",
    "price": 39
  },
  {
    "id": "CR0018",
    "name": "Northwest Basin",
    "lat": 46.0,
    "lng": -120.0,
    "diameter": 6.5,
    "status": "taken",
    "takenBy": "Corporate Sponsor",
    "price": 0
  },
  {
    "id": "CR0019",
    "name": "Luna Cove",
    "lat": 11.0,
    "lng": 4.2,
    "diameter": 1.6,
    "status": "available",
    "price": 29
  },
  {
    "id": "CR0020",
    "name": "Echo Crater",
    "lat": -17.3,
    "lng": 130.2,
    "diameter": 2.9,
    "status": "available",
    "price": 39
  }
]
