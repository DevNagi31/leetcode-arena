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

module.exports = {
  searchUniversities
};
