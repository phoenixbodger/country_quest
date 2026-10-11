/**
 * createCountryDot - Builds the clickable "country dot" HTML element used by
 * react-globe.gl's `htmlElement` for the "Show All Countries" / "Show countries"
 * toggle across the game screens.
 *
 * Why this exists (and why the hit area / event handling matters):
 *  - The dots are HTML elements layered over the WebGL canvas. The layer that holds
 *    them has `pointer-events: none`, so only the dot itself captures touches. A tap
 *    that lands even slightly off a dot falls through to the canvas and react-globe.gl's
 *    OrbitControls treats it as a drag - the globe spins and the dots "move around
 *    wildly" instead of being selected. This is especially bad on mobile where fingers
 *    are imprecise.
 *  - This helper gives every dot a generous invisible hit area, and locks the tap to
 *    the dot (touch-action: none + stopPropagation on touch/pointer events) so a tap
 *    that starts on a dot can never rotate the globe or scroll the page.
 *  - Hover scale is applied only to the inner (visible) dot, and only on hover-capable
 *    devices, so the outer element's position transform (managed by the CSS2DRenderer)
 *    is never overwritten.
 *
 * @param {Object} d - The dot datum. Uses d.isCorrect / d.isCurrent / d.isHighlighted /
 *                     d.isGuessed for coloring.
 * @param {Function} onClick - Callback invoked when the dot is clicked/tapped
 *                             (receives no arguments; callers capture d.cca3).
 * @returns {HTMLElement}
 */
export function createCountryDot(d, onClick) {
  const isCurrentOrHighlighted = d.isCurrent || d.isHighlighted;
  const isGuessed = d.isGuessed;
  let bgColor;
  if (d.isCorrect) {
    bgColor = '#228B22'; // forest green
  } else if (isCurrentOrHighlighted) {
    bgColor = '#c084fc'; // purple
  } else if (isGuessed) {
    bgColor = '#718096'; // grey
  } else {
    bgColor = 'rgba(255, 255, 255, 0.9)'; // white
  }

  const canHover = window.matchMedia('(hover: hover)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  const hitSize = isCoarse ? 34 : 28; // px - invisible but generous tap/click target

  // Outer element = invisible hit area. It is centered on the country's lat/lng by the
  // CSS2DRenderer (which writes `transform` on this element), so never scale/translate it.
  const el = document.createElement('div');
  el.style.width = `${hitSize}px`;
  el.style.height = `${hitSize}px`;
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.pointerEvents = 'auto';
  el.style.cursor = 'pointer';
  el.style.userSelect = 'none';
  el.style.touchAction = 'none';
  el.style.WebkitTapHighlightColor = 'transparent';

  // Visible dot, centered inside the hit area. Its own transform is safe to animate.
  const dot = document.createElement('div');
  dot.style.width = '12px';
  dot.style.height = '12px';
  dot.style.borderRadius = '50%';
  dot.style.backgroundColor = bgColor;
  dot.style.border = '2px solid rgba(0, 0, 0, 0.8)';
  dot.style.boxShadow = '0 0 6px rgba(0, 0, 0, 0.8), 0 0 12px rgba(255, 255, 255, 0.4)';
  dot.style.transition = 'transform 0.1s, box-shadow 0.1s';
  el.appendChild(dot);

  // A tap/drag that starts on a dot must never reach the WebGL canvas below (which
  // would rotate the globe) or the container's pointer handlers (which would fire a
  // globe click / miss-click).
  el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  el.addEventListener('pointerdown', (e) => e.stopPropagation());

  // Hover feedback only on devices that actually have a hover pointer.
  if (canHover) {
    el.addEventListener('mouseenter', () => {
      dot.style.transform = 'scale(1.4)';
      dot.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 255, 255, 0.6)';
    });
    el.addEventListener('mouseleave', () => {
      dot.style.transform = 'scale(1)';
      dot.style.boxShadow = '0 0 6px rgba(0, 0, 0, 0.8), 0 0 12px rgba(255, 255, 255, 0.4)';
    });
  }

  el.addEventListener('click', (event) => {
    event.stopPropagation();
    if (onClick) onClick();
  });

  return el;
}

export default createCountryDot;
