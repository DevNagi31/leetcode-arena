const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');

// @route POST /api/leetcode/problem
// @desc Fetch problem details from LeetCode
router.post('/problem', auth, async (req, res) => {
  try {
    let { titleSlug } = req.body;

    if (typeof titleSlug !== 'string' || !titleSlug.trim()) {
      return res.status(400).json({ message: 'A problem slug or number is required' });
    }
    titleSlug = titleSlug.trim().toLowerCase();
    if (!/^[a-z0-9-]{1,120}$/.test(titleSlug)) {
      return res.status(400).json({ message: 'Invalid problem slug' });
    }

    // If it's a number, we need to fetch by questionFrontendId
    const isNumber = /^\d+$/.test(titleSlug);
    
    let query, variables;
    
    if (isNumber) {
      // Query by problem number
      query = `
        query questionData($questionFrontendId: String!) {
          questionByFrontendId(questionFrontendId: $questionFrontendId) {
            questionId
            questionFrontendId
            title
            titleSlug
            difficulty
            content
            topicTags {
              name
            }
          }
        }
      `;
      variables = { questionFrontendId: titleSlug };
    } else {
      // Query by slug
      query = `
        query questionData($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            questionId
            questionFrontendId
            title
            titleSlug
            difficulty
            content
            topicTags {
              name
            }
          }
        }
      `;
      variables = { titleSlug };
    }

    const response = await axios.post('https://leetcode.com/graphql', {
      query,
      variables
    }, {
      headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' },
      timeout: 10000
    });

    if (response.data.errors) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    const problemData = isNumber ? response.data.data?.questionByFrontendId : response.data.data?.question;
    if (!problemData) {
      return res.status(404).json({ message: 'Problem not found' });
    }
    res.json(problemData);
  } catch (error) {
    console.error('LeetCode API error:', error.message);
    res.status(502).json({ message: 'Could not reach LeetCode. Please try again.' });
  }
});

// @route GET /api/leetcode/solved
// @desc Fetch recent accepted submissions for the logged-in user's LeetCode account
router.get('/solved', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('leetcodeUsername');
    if (!user || !user.leetcodeUsername) {
      return res.status(404).json({ message: 'LeetCode username not set' });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

    const query = `
      query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
          id
          title
          titleSlug
          timestamp
        }
      }
    `;

    const response = await axios.post('https://leetcode.com/graphql', {
      query,
      variables: { username: user.leetcodeUsername, limit }
    }, {
      headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' },
      timeout: 10000
    });

    const submissions = response.data?.data?.recentAcSubmissionList || [];

    // Deduplicate by titleSlug, keep first (most recent) occurrence
    const seen = new Set();
    const unique = [];
    for (const s of submissions) {
      if (seen.has(s.titleSlug)) continue;
      seen.add(s.titleSlug);
      unique.push(s);
    }

    res.json({ username: user.leetcodeUsername, problems: unique });
  } catch (error) {
    console.error('LeetCode solved fetch error:', error.message);
    res.status(500).json({ message: 'Failed to fetch solved problems' });
  }
});

module.exports = router;