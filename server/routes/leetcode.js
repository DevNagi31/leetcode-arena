const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');

// @route POST /api/leetcode/problem
// @desc Fetch problem details from LeetCode
router.post('/problem', auth, async (req, res) => {
  try {
    let { titleSlug } = req.body;

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
    });

    if (response.data.errors) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    const problemData = isNumber ? response.data.data.questionByFrontendId : response.data.data.question;
    res.json(problemData);
  } catch (error) {
    console.error('LeetCode API error:', error);
    res.status(500).json({ message: 'Failed to fetch problem' });
  }
});

module.exports = router;