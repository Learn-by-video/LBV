import * as THREE from './libs/three.module.js';

const tracks = {
  track1: {
    name: "Desert Drift",
    description: "Fast & sandy race!",
    object: createSimpleTrack('sandybrown'),
  },
  track2: {
    name: "Rainy Raceway",
    description: "Wet and challenging!",
    object: createSimpleTrack('lightblue'),
  },
  track3: {
    name: "Mystery Track",
    description: "Locked track, unlock to play!",
    object: createSimpleTrack('gray'),
  },
  track4: {
    name: "Hidden Circuit",
    description: "Another locked track!",
    object: createSimpleTrack('gray'),
  },
  track5: {
    name: "Forest Frenzy",
    description: "Twisty and scenic!",
    object: createSimpleTrack('green'),
  },
  track6: {
    name: "Lava Loop",
    description: "Hot and dangerous!",
    object: createSimpleTrack('purple'),
  },
};

// Helper function to create a simple track
function createSimpleTrack(color) {
  const track = new THREE.Object3D();

  // Add a ground plane
  const groundGeometry = new THREE.PlaneGeometry(200, 200);
  const groundMaterial = new THREE.MeshStandardMaterial({ color });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // Rotate to lie flat
  track.add(ground);

  // Add a simple obstacle
  const obstacleGeometry = new THREE.BoxGeometry(20, 20, 20);
  const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 'red' });
  const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
  obstacle.position.set(0, 10, 0); // Raise above the ground
  track.add(obstacle);

  // Add a start line
  const startLineGeometry = new THREE.PlaneGeometry(10, 200);
  const startLineMaterial = new THREE.MeshStandardMaterial({ color: 'white' });
  const startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);
  startLine.rotation.x = -Math.PI / 2;
  startLine.position.z = -90;
  track.add(startLine);

  return track;
}

export default tracks;
