// Haversine formula implementation (returns km)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Color tier configuration — sorted ascending by maxKm for stable iteration
export const PROXIMITY_TIERS = [
  { maxKm: 1000, color: '#ff3344' },       // Hot (< 1000)
  { maxKm: 3000, color: '#ff9100' },       // Warm (1k-3k)
  { maxKm: 6000, color: '#ffea00' },       // Lukewarm (3k-6k)
  { maxKm: Infinity, color: '#2979ff' },   // Cold (> 6000)
];

// Color mapping function — stable ascending iteration, no mutation
export const getProximityColor = (distanceKm) => {
  for (const tier of PROXIMITY_TIERS) {
    if (distanceKm < tier.maxKm) return tier.color;
  }
  return '#ff3344'; // fallback to hot
};

// Opacity/altitude configuration
export const getProximityOpacity = (distanceKm) => {
  return distanceKm === 0 ? 1.0 : 0.9; // All guesses visible, correct fully opaque
};
