const axios = require('axios');

const LEETCODE_API = 'https://alfa-leetcode-api.onrender.com';

const fetchLeetCodeStats = async (username) => {
  try {
    console.log(`Fetching LeetCode stats for: ${username}`);
    
    const response = await axios.get(`${LEETCODE_API}/${username}`, {
      timeout: 10000 // 10 second timeout
    });

    if (!response.data) {
      throw new Error('No data received from LeetCode API');
    }

    const data = response.data;

    // Validate required fields
    if (data.errors && data.errors.length > 0) {
      throw new Error('LeetCode user not found or profile is private');
    }

    return {
      username: username,
      problems: data.totalSolved || 0,
      easy: data.easySolved || 0,
      medium: data.mediumSolved || 0,
      hard: data.hardSolved || 0,
      ranking: data.ranking || 0,
      streak: data.streak || 0,
      totalActiveDays: data.totalActiveDays || 0
    };
  } catch (error) {
    console.error('LeetCode API Error:', error.message);
    
    // Handle specific error cases
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error('LeetCode API is taking too long to respond. Please try again.');
    }
    
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('LeetCode user not found. Please check the username.');
      }
      if (error.response.status === 429) {
        throw new Error('Too many requests. Please try again in a few minutes.');
      }
      if (error.response.status >= 500) {
        throw new Error('LeetCode API is temporarily unavailable. Please try again later.');
      }
    }
    
    if (error.message.includes('not found') || error.message.includes('private')) {
      throw error;
    }
    
    throw new Error('Failed to fetch LeetCode stats. Please try again.');
  }
};

module.exports = { fetchLeetCodeStats };
