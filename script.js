class MoonViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.moon = null;
        this.craterMarkers = [];
        this.currentData = {
            craters: [],
            theme: 'dark',
            controls: {
                zoom: 50,
                rotation: 0,
                searchTerm: '',
                filterAvailable: false,
                selectedCraterId: null
            }
        };
        
        this.init();
        this.setupMessageHandler();
    }
    
    init() {
        const container = document.getElementById('container');
        
        // Scene
        this.scene = new THREE.Scene();
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 5);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
        
        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.enablePan = false;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 10;
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Load Moon model
        this.loadMoon();
        
        // Start render loop
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Notify parent that moon viewer is ready
        this.postMessageToParent({
            type: 'MOON_READY'
        });
    }
    
    loadMoon() {
        const loader = new THREE.GLTFLoader();
        
        // Replace with your actual Moon.glb URL from GitHub
        const moonUrl = 'https://github.com/tomuxd/moon-viewer/raw/refs/heads/main/assets/moon.glb';
        
        loader.load(
            moonUrl,
            (gltf) => {
                this.moon = gltf.scene;
                
                // Scale and position the moon
                this.moon.scale.setScalar(2);
                this.moon.position.set(0, 0, 0);
                
                // Enable shadows
                this.moon.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                this.scene.add(this.moon);
                
                // Hide loading indicator
                document.getElementById('loading').style.display = 'none';
                
                // Apply initial crater markers if data is available
                this.updateCraterMarkers();
            },
            (progress) => {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                document.getElementById('loading').innerHTML = `Loading 3D Moon... ${percent}%`;
            },
            (error) => {
                console.error('Error loading moon model:', error);
                document.getElementById('loading').innerHTML = 'Error loading 3D moon model';
            }
        );
    }
    
    setupMessageHandler() {
        window.addEventListener('message', (event) => {
            // Security: Only accept messages from your domain
            // Add your actual domain here for production
            const allowedOrigins = ['http://localhost:3000', 'https://your-domain.com'];
            
            if (event.data.type === 'UPDATE_MOON_VIEW') {
                this.currentData = event.data.data;
                this.updateView();
            }
        });
    }
    
    updateView() {
        this.updateTheme();
        this.updateControls();
        this.updateCraterMarkers();
    }
    
    updateTheme() {
        const { theme } = this.currentData;
        document.body.className = `theme-${theme}`;
        
        if (theme === 'dark') {
            this.renderer.setClearColor(0x000000, 0);
            this.scene.background = null;
        } else {
            this.renderer.setClearColor(0xf8fafc, 1);
        }
    }
    
    updateControls() {
        const { zoom, rotation } = this.currentData.controls;
        
        // Update camera distance based on zoom (inverted - higher zoom = closer)
        const distance = 10 - (zoom / 100) * 8; // Range: 2-10
        const currentDistance = this.camera.position.length();
        const scaleFactor = distance / currentDistance;
        
        this.camera.position.multiplyScalar(scaleFactor);
        this.controls.update();
        
        // Update moon rotation
        if (this.moon) {
            this.moon.rotation.y = (rotation * Math.PI) / 180;
        }
    }
    
    updateCraterMarkers() {
        // Clear existing markers
        this.clearCraterMarkers();
        
        if (!this.moon) return;
        
        const { craters, controls } = this.currentData;
        const { searchTerm, filterAvailable, selectedCraterId } = controls;
        
        // Filter craters based on search and availability filter
        const filteredCraters = craters.filter(crater => {
            const matchesSearch = crater.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = !filterAvailable || (!crater.isTaken && !crater.isOfficial);
            return matchesSearch && matchesFilter;
        });
        
        filteredCraters.forEach(crater => {
            this.createCraterMarker(crater, crater.id === selectedCraterId);
        });
    }
    
    createCraterMarker(crater, isSelected = false) {
        // Convert lat/lng to 3D position on sphere
        const position = this.latLngToVector3(crater.latitude, crater.longitude, 2.1);
        
        // Create DOM element for marker
        const markerElement = document.createElement('div');
        markerElement.className = 'crater-marker';
        markerElement.innerHTML = `
            <div class="crater-dot ${crater.isOfficial ? 'official' : crater.isTaken ? 'taken' : 'available'} ${isSelected ? 'selected' : ''}"></div>
            <div class="crater-label">${crater.name} (${crater.diameter.toFixed(1)}km)</div>
        `;
        
        // Add click handler
        markerElement.addEventListener('click', () => {
            this.postMessageToParent({
                type: 'CRATER_CLICKED',
                craterId: crater.id
            });
        });
        
        // Position the marker
        const vector = position.clone().project(this.camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
        
        markerElement.style.left = `${x}px`;
        markerElement.style.top = `${y}px`;
        markerElement.style.transform = 'translate(-50%, -50%)';
        
        document.body.appendChild(markerElement);
        this.craterMarkers.push({
            element: markerElement,
            crater: crater,
            position: position
        });
    }
    
    clearCraterMarkers() {
        this.craterMarkers.forEach(marker => {
            if (marker.element.parentNode) {
                marker.element.parentNode.removeChild(marker.element);
            }
        });
        this.craterMarkers = [];
    }
    
    updateMarkerPositions() {
        this.craterMarkers.forEach(marker => {
            const vector = marker.position.clone().project(this.camera);
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
            
            marker.element.style.left = `${x}px`;
            marker.element.style.top = `${y}px`;
            
            // Hide markers that are on the back side of the moon
            const dotProduct = marker.position.clone().normalize().dot(this.camera.position.clone().normalize());
            marker.element.style.display = dotProduct > 0 ? 'block' : 'none';
        });
    }
    
    latLngToVector3(lat, lng, radius = 1) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        
        return new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    }
    
    postMessageToParent(data) {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(data, '*');
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.updateMarkerPositions();
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}



// Initialize the moon viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MoonViewer();
});
