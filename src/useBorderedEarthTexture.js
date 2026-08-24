import { useEffect, useState } from 'react';
import { geoEquirectangular, geoPath } from 'd3-geo';

// Builds a globe texture (earth-day.jpg) with thick white country outlines baked
// in, so borders are clearly visible at any zoom level. Returns a data URL, or
// null until the source image has loaded and the outlines have been drawn.
// Keeps vector overlay (polygonStrokeColor) as complementary mechanism — this
// hook provides the baked raster fallback that stays sharp at any zoom.
export function useBorderedEarthTexture(worldPolygons) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!worldPolygons.length) return;

    let cancelled = false;
    let objectUrl = null;
    const base = import.meta.env.BASE_URL;
    // Prefer 8K, fallback to 4K, then low-res 1600 for low-end devices / missing file
    const candidates = [
      `${base}earth-8k.jpg`,
      `${base}earth-4k.jpg`,
      `${base}earth-day.jpg`,
    ];
    let srcUrl = candidates[0];
    let candidateIdx = 0;

    function generateTexture(img) {
      if (cancelled) return;
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;
      if (!srcW || !srcH) throw new Error('Source image has zero dimensions');

      // Cap canvas to 4096 wide (8K → 4096) to avoid 128MB RGBA + ~50MB PNG OOM on mobile.
      // 4096×2048 is still 2.5× sharper than original 1600×800 and 4× smaller than 8K.
      const MAX_W = 4096;
      const W = Math.min(srcW, MAX_W);
      const H = Math.round((srcH / srcW) * W);
      const scale = W / 1600;

      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get 2D canvas context');
      ctx.imageSmoothingQuality = 'high';
      // Draw downscaled if capped, otherwise 1:1 to avoid upscaling blur.
      ctx.drawImage(img, 0, 0, srcW, srcH, 0, 0, W, H);

      const projection = geoEquirectangular()
        .scale(W / (2 * Math.PI))
        .translate([W / 2, H / 2]);
      const path = geoPath(projection, ctx);
      const features = worldPolygons.filter(
        (f) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      );

      // Dark underlay for contrast on bright landmasses — must actually stroke.
      // Scale line width with canvas size so 4K borders stay visible after downscale.
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.lineWidth = Math.max(4, 6 * scale);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      features.forEach((f) => path(f));
      ctx.stroke();

      // Bright red border on top
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = Math.max(2.2, 3 * scale);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      features.forEach((f) => path(f));
      ctx.stroke();

      // For ≤2048 wide keep lossless PNG (crisp). For 4K use JPEG 0.85 to keep dataUrl < ~4MB
      // instead of ~12MB PNG which blows memory and stalls main thread.
      const useJpeg = W > 2048;
      const dataUrl = useJpeg ? canvas.toDataURL('image/jpeg', 0.85) : canvas.toDataURL('image/png');
      if (cancelled) return;
      console.log(`[useBorderedEarthTexture] generated ${W}x${H} from ${srcW}x${srcH} (${useJpeg ? 'jpeg' : 'png'}), length=`, dataUrl.length, `src=${srcUrl}`);
      setUrl(dataUrl);
    }

    function fetchBlobFallback(reason) {
      console.warn('[useBorderedEarthTexture] falling back to fetch+blob due to:', reason);
      fetch(srcUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`fetch ${srcUrl} failed: ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          const img2 = new Image();
          // blob: URL is same-origin, no crossOrigin needed
          img2.onload = () => {
            try {
              generateTexture(img2);
            } catch (err) {
              console.error('[useBorderedEarthTexture] failed to generate bordered texture (blob fallback):', err);
            } finally {
              if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                objectUrl = null;
              }
            }
          };
          img2.onerror = () => {
            console.error('[useBorderedEarthTexture] failed to load blob image fallback');
            if (objectUrl) {
              URL.revokeObjectURL(objectUrl);
              objectUrl = null;
            }
          };
          img2.src = objectUrl;
        })
        .catch((err) => {
          console.error('[useBorderedEarthTexture] blob fallback fetch failed:', err);
        });
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        generateTexture(img);
      } catch (err) {
        console.error('[useBorderedEarthTexture] failed to generate bordered texture:', err);
        // Tainted canvas / SecurityError → try blob fallback
        const isSecurityError =
          err?.name === 'SecurityError' || /tainted|security/i.test(err?.message || '');
        if (isSecurityError) {
          fetchBlobFallback(err.message || err.name);
        }
      }
    };
    const loadCandidate = (idx) => {
      candidateIdx = idx;
      srcUrl = candidates[idx];
      img.src = srcUrl;
    };
    img.onerror = () => {
      console.error(`[useBorderedEarthTexture] failed to load source image ${srcUrl} (crossOrigin)`);
      if (candidateIdx + 1 < candidates.length) {
        console.warn(`[useBorderedEarthTexture] trying fallback ${candidates[candidateIdx + 1]}`);
        loadCandidate(candidateIdx + 1);
      } else {
        fetchBlobFallback('onerror crossOrigin load');
      }
    };
    loadCandidate(0);

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      img.onload = null;
      img.onerror = null;
    };
  }, [worldPolygons]);

  return url;
}
