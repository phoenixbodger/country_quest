import * as THREE from 'three';

/**
 * Darkens the built-in graticule lines (10-degree intervals) created by three-globe
 */
export function darkenGraticule(globeRef) {
  const scene = globeRef?.current?.scene?.();
  if (!scene) return;
  scene.traverse(obj => {
    if (obj.isLineSegments && obj.material) {
      obj.material.color.set('#1e293b');
      obj.material.opacity = 0.6;
      obj.material.needsUpdate = true;
    }
  });
}

/**
 * Creates a Three.js Group containing 1-degree graticule lines
 * - Latitude lines: every 1° from -89° to +89° (skip 0° equator, ±90° poles)
 * - Longitude lines: every 1° from -179° to +179°
 * Styled more subtly than the built-in 10-degree lines
 */
export function createOneDegreeGraticule() {
  const group = new THREE.Group();
  const radius = 101; // GLOBE_RADIUS (100) + 1 for slight offset above surface
  
  // Material for 1-degree lines - more subtle than 10-degree lines
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x1e293b,
    opacity: 0.15,
    transparent: true,
    depthWrite: false,
  });

  // Helper to create a line from points
  const createLine = (points) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.Line(geometry, lineMaterial);
  };

  // Latitude lines (parallels): circles at constant latitude
  // Skip 0° (equator) and ±90° (poles) - these are covered by built-in graticules
  const latSegments = 180; // Resolution of each latitude circle
  for (let lat = -89; lat <= 89; lat++) {
    if (lat === 0) continue; // Skip equator
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const r = radius * Math.sin(phi);
    const y = radius * Math.cos(phi);
    
    const points = [];
    for (let i = 0; i <= latSegments; i++) {
      const theta = (i / latSegments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        r * Math.cos(theta),
        y,
        r * Math.sin(theta)
      ));
    }
    group.add(createLine(points));
  }

  // Longitude lines (meridians): half-circles from pole to pole
  const lngSegments = 90; // Resolution of each longitude line
  for (let lng = -179; lng <= 179; lng++) {
    const theta = THREE.MathUtils.degToRad(lng);
    
    const points = [];
    for (let i = 0; i <= lngSegments; i++) {
      const phi = (i / lngSegments) * Math.PI; // 0 to PI (pole to pole)
      points.push(new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      ));
    }
    group.add(createLine(points));
  }

  return group;
}
