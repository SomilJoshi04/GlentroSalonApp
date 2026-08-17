/**
 * Geocoding Service
 * Abstracts the geocoding provider (currently OpenStreetMap Nominatim)
 * Can be swapped to Google Maps in the future without changing business logic.
 */

const BASE_URL = process.env.GEOCODING_PROVIDER_URL || 'https://nominatim.openstreetmap.org';
const DEFAULT_HEADERS = {
  'User-Agent': 'SalonBookingApp/1.0',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Rate limiting state for Nominatim (max 1 request per second as per their TOS)
let lastRequestTime = 0;
const RATE_LIMIT_MS = 1000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const executeWithRateLimit = async (requestFn) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await delay(RATE_LIMIT_MS - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();
  return requestFn();
};

/**
 * Normalizes Nominatim address object into our standard format
 */
const normalizeAddress = (addressDetails, displayName, lat, lon) => {
  const locality = addressDetails?.suburb || addressDetails?.neighbourhood || addressDetails?.village || '';
  const city = addressDetails?.city || addressDetails?.town || addressDetails?.county || addressDetails?.state_district || '';
  const state = addressDetails?.state || '';
  const pincode = addressDetails?.postcode || '';
  const country = addressDetails?.country || '';

  return {
    formattedAddress: displayName || `${locality}, ${city}`.replace(/^, | ,/g, '').trim(),
    locality,
    city,
    state,
    pincode,
    country,
    latitude: parseFloat(lat),
    longitude: parseFloat(lon),
  };
};

/**
 * Search location by string
 * @param {string} query - Location string to search
 * @returns {Promise<Array>} - Normalized location objects
 */
exports.searchLocation = async (query) => {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = new URL(`${BASE_URL}/search`);
    url.searchParams.append('format', 'json');
    url.searchParams.append('q', query.trim());
    url.searchParams.append('addressdetails', '1');
    url.searchParams.append('limit', '5');

    const response = await executeWithRateLimit(() =>
      fetch(url.toString(), { headers: DEFAULT_HEADERS })
    );

    if (!response.ok) {
      console.error(`Geocoding error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((item) => normalizeAddress(item.address, item.display_name, item.lat, item.lon));
  } catch (error) {
    console.error('Geocoding search failed:', error.message);
    return [];
  }
};

/**
 * Reverse geocode by coordinates
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<Object|null>} - Normalized location object
 */
exports.reverseGeocode = async (lat, lng) => {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('Invalid coordinates');
  }

  try {
    const url = new URL(`${BASE_URL}/reverse`);
    url.searchParams.append('format', 'json');
    url.searchParams.append('lat', lat.toString());
    url.searchParams.append('lon', lng.toString());
    url.searchParams.append('addressdetails', '1');

    const response = await executeWithRateLimit(() =>
      fetch(url.toString(), { headers: DEFAULT_HEADERS })
    );

    if (!response.ok) {
      console.error(`Reverse geocoding error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data || data.error) return null;

    return normalizeAddress(data.address, data.display_name, data.lat, data.lon);
  } catch (error) {
    console.error('Reverse geocoding failed:', error.message);
    return null;
  }
};
