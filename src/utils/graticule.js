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
