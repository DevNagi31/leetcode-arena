const axios = require('axios');

// Hipo University API - 23,000+ universities worldwide
const UNIVERSITY_API = 'https://universities.hipolabs.com/search';

/**
 * Search universities by name and country
 */
const searchUniversities = async (name, country = null) => {
  try {
    let url = `${UNIVERSITY_API}?name=${encodeURIComponent(name)}`;
    if (country) {
      url += `&country=${encodeURIComponent(country)}`;
    }

    const response = await axios.get(url, { timeout: 5000 });
    
    // Format response
    return response.data.map(uni => ({
      name: uni.name,
      country: uni.country,
      stateProvince: uni['state-province'] || '',
      website: uni.web_pages?.[0] || '',
      domain: uni.domains?.[0] || ''
    }));
  } catch (error) {
    console.error('University API error:', error.message);
    return [];
  }
};

/**
 * Get universities by country
 */
const getUniversitiesByCountry = async (country) => {
  try {
    const response = await axios.get(
      `${UNIVERSITY_API}?country=${encodeURIComponent(country)}`,
      { timeout: 5000 }
    );
    
    return response.data.map(uni => ({
      name: uni.name,
      country: uni.country,
      stateProvince: uni['state-province'] || '',
      website: uni.web_pages?.[0] || '',
      domain: uni.domains?.[0] || ''
    }));
  } catch (error) {
    console.error('University API error:', error.message);
    return [];
  }
};

/**
 * Validate if university exists
 */
const validateUniversity = async (name, country) => {
  const results = await searchUniversities(name, country);
  return results.length > 0;
};

module.exports = {
  searchUniversities,
  getUniversitiesByCountry,
  validateUniversity
};
