// utils/distance.js
//
// The Haversine formula calculates the straight-line distance between two
// points on a sphere (Earth) given their latitude/longitude. This is the
// "smart matching" feature of the project - it's why we can say "closest
// donor first" instead of just showing a flat list.
//
// This is the one function you should be able to explain line-by-line
// in your viva - it's the single most technically interesting part of
// the whole project.

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Returns the distance in kilometers between two lat/lng points.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} distance in km, rounded to 1 decimal place
 */
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 10) / 10;
}

module.exports = { haversineDistanceKm };
