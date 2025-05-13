import * as THREE from 'three';

export const tracks = {
  track1: createCircularTrack(50, 60, 0xFFD700), // Desert Drift
  track2: createCircularTrack(40, 50, 0x87CEEB), // Rainy Raceway
  track5: createCircularTrack(30, 40, 0x228B22), // Forest Frenzy
  track6: createCircularTrack(20, 30, 0x8B0000), // Lava Loop
};

function createCircularTrack(innerRadius, outerRadius, color) {
  const trackGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
  const trackMaterial = new THREE.MeshStandardMaterial({ color });
  const track = new THREE.Mesh(trackGeometry, trackMaterial);
  track.rotation.x = -Math.PI / 2;
  track.receiveShadow = true;

  const markingGeometry = new THREE.RingGeometry(outerRadius - 1, outerRadius, 64);
  const markingMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const markings = new THREE.Mesh(markingGeometry, markingMaterial);
  markings.rotation.x = -Math.PI / 2;

  const trackGroup = new THREE.Group();
  trackGroup.add(track);
  trackGroup.add(markings);
  return trackGroup;
}
