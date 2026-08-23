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
    const srcUrl = `${import.meta.env.BASE_URL}earth-day.jpg`;

    function generateTexture(img) {
      if (cancelled) return;
      // Draw at the source's native resolution (1:1) to avoid upscaling blur.
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      if (!W || !H) throw new Error('Source image has zero dimensions');

      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get 2D canvas context');
      ctx.drawImage(img, 0, 0);

      const projection = geoEquirectangular()
        .scale(W / (2 * Math.PI))
        .translate([W / 2, H / 2]);
      const path = geoPath(projection, ctx);
      const features = worldPolygons.filter(
        (f) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      );

      // Dark underlay for contrast on bright landmasses — must actually stroke.
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      features.forEach((f) => path(f));
      ctx.stroke();

      // Bright red border on top
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      features.forEach((f) => path(f));
      ctx.stroke();

      // Lossless PNG keeps the outlines crisp (no JPEG softening).
      const dataUrl = canvas.toDataURL('image/png');
      if (cancelled) return;
      console.log('[useBorderedEarthTexture] generated texture, length=', dataUrl.length);
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
    img.onerror = () => {
      console.error('[useBorderedEarthTexture] failed to load source image earth-day.jpg (crossOrigin)');
      fetchBlobFallback('onerror crossOrigin load');
    };
    img.src = srcUrl;

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
