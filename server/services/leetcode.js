const axios = require('axios');

const fetchLeetCodeStats = async (username) => {
  try {
    console.log(`Fetching LeetCode stats for: ${username}`);
    
    // Use LeetCode GraphQL API directly
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          submitStats {
            acSubmissionNum {
              difficulty
              count
            }
          }
        }
      }
    `;

    const response = await axios.post('https://leetcode.com/graphql', {
      query,
      variables: { username }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com'
      },
      timeout: 10000
    });

    if (!response.data || !response.data.data || !response.data.data.matchedUser) {
      throw new Error('LeetCode user not found or profile is private');
    }

    const userData = response.data.data.matchedUser;
    const stats = userData.submitStats.acSubmissionNum;

    // Parse stats
    const allCount = stats.find(s => s.difficulty === 'All')?.count || 0;
    const easyCount = stats.find(s => s.difficulty === 'Easy')?.count || 0;
    const mediumCount = stats.find(s => s.difficulty === 'Medium')?.count || 0;
    const hardCount = stats.find(s => s.difficulty === 'Hard')?.count || 0;

    console.log(`Stats for ${username}:`, { allCount, easyCount, mediumCount, hardCount });

    return {
      username: userData.username,
      problems: allCount,
      easy: easyCount,
      medium: mediumCount,
      hard: hardCount,
      ranking: 0,
      streak: 0,
      totalActiveDays: 0
    };
  } catch (error) {
    console.error('LeetCode API Error:', error.message);
    
    if (error.response?.status === 404) {
      throw new Error('LeetCode user not found. Please check the username.');
    }
    
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error('LeetCode API timeout. Please try again.');
    }
    
    throw new Error('Failed to fetch LeetCode stats. Please try again.');
  }
};

module.exports = { fetchLeetCodeStats };
