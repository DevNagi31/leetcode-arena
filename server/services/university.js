const axios = require('axios');

// Hipo University API - 23,000+ universities worldwide.
// The HTTPS endpoint is frequently unreliable, so we try it first and fall
// back to HTTP (safe here since this is a server-to-server call, not the
// browser). Results are cached briefly to stay responsive and reduce load.
const UNIVERSITY_HOSTS = [
  'https://universities.hipolabs.com/search',
  'http://universities.hipolabs.com/search',
];

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const cache = new Map(); // key -> { expires, data }

const shape = (data, query) => {
  const seen = new Set();
  const q = query.toLowerCase();
  return data
    .map((uni) => ({
      name: uni.name,
      country: uni.country,
      stateProvince: uni['state-province'] || '',
      website: uni.web_pages?.[0] || '',
      domain: uni.domains?.[0] || '',
    }))
    .filter((uni) => {
      if (!uni.name || seen.has(uni.name)) return false;
      seen.add(uni.name);
      return true;
    })
    // Surface names that start with the query before substring matches.
    .sort((a, b) => {
      const as = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bs = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return as - bs || a.name.localeCompare(b.name);
    })
    .slice(0, 20);
};

/**
 * Search universities by name and country.
 */
const searchUniversities = async (name, country = null) => {
  const key = `${(country || '').toLowerCase()}::${name.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const params = new URLSearchParams({ name });
  if (country) params.set('country', country);
  const qs = params.toString();

  for (const host of UNIVERSITY_HOSTS) {
    try {
      const response = await axios.get(`${host}?${qs}`, { timeout: 6000 });
      if (Array.isArray(response.data)) {
        const data = shape(response.data, name);
        cache.set(key, { expires: Date.now() + CACHE_TTL, data });
        return data;
      }
    } catch (error) {
      // Try the next host (e.g. HTTPS failed -> fall back to HTTP).
      console.error(`University API error (${host}):`, error.message);
    }
  }

  return [];
};

module.exports = {
  searchUniversities,
};
