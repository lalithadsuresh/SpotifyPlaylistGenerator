const express = require('express');
const router = express.Router();
const Group = require('../Models/groupModel'); 
const Survey = require('../Models/surveyModel')
const User = require('../Models/userModel');
const authMiddleware = require('../utils/MiddlewareAuth'); 
const refreshTokenMiddleware = require('../utils/RefreshToken'); 


router.post('/join', authMiddleware, async (req, res) => {
    const { groupCode } = req.body;
    const userId = req.user.id;
  
    try {
      // Find the group by groupCode
      const group = await Group.findOne({ groupCode });
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
  
      // Prevent duplicate entries in the members array
      if (!group.members.includes(userId)) {
        group.members.push(userId); // Add user only if not already a member
        await group.save();
      }
  
      // Ensure groupCode is in the user's groupCodes array
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      user.groupCodes = user.groupCodes || [];
      if (!user.groupCodes.includes(groupCode)) {
        user.groupCodes.push(groupCode);
        await user.save();
      }
  
      // Redirect to survey page
      res.status(200).json({
        message: 'Successfully joined group',
        groupCode,
      });
    } catch (error) {
      console.error('Error joining group:', error);
      res.status(500).json({ error: 'An error occurred while joining the group' });
    }
  });
  
  

router.post('/submit', async (req, res) => {
    const { groupCode, energy } = req.body;
  
    if (!groupCode || !energy ) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
  
    try {
      const survey = new Survey({ groupCode, energy });
      await survey.save();
      res.status(200).json({ message: 'Survey submitted successfully!' });
    } catch (error) {
      res.status(500).json({ message: 'Error saving survey.' });
    }
  });


  router.post('/create-group', authMiddleware, async (req, res) => {
    try {
      const { groupName } = req.body;
  
      if (!groupName) {
        return res.status(400).json({ error: 'Group name is required' });
      }
  
      const userId = req.user.id;
  
      // Generate a unique groupCode
      let uniqueGroupCode = Math.random().toString(36).substr(2, 8);
      let isUnique = false;
  
      while (!isUnique) {
        const existingGroup = await Group.findOne({ groupCode: uniqueGroupCode });
        if (!existingGroup) {
          isUnique = true;
        } else {
          console.log(`Duplicate group code detected: ${uniqueGroupCode}`);
          uniqueGroupCode = Math.random().toString(36).substr(2, 8);
        }
      }
  
      console.log(`Final unique group code: ${uniqueGroupCode}`);
  
      // Create the new group
      const newGroup = new Group({
        name: groupName,
        groupCode: uniqueGroupCode,
        createdBy: userId,
        members: [userId], // Add the creator only once
        createdAt: Date.now(),
      });
  
      const user = await User.findById(userId);
      user.groupCodes = user.groupCodes || [];
      user.groupCodes.push(uniqueGroupCode);
      await user.save();
      await newGroup.save();
  
      res.status(201).json({
        message: 'Group created successfully',
        group: newGroup,
      });
    } catch (error) {
      if (error.code === 11000) {
        console.error('Duplicate groupCode error:', error);
        return res.status(400).json({ error: 'Group code must be unique. Please try again.' });
      }
      console.error('Error creating group:', error.stack);
      res.status(500).json({ error: 'Failed to create group' });
    }
  });
  
  
  
  

router.get('/current-user', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
  
      if (!userId) {
        return res.status(400).json({ error: 'Invalid token or user not found' });
      }
  
      res.status(200).json({ userId }); // Respond with the user ID
    } catch (error) {
      console.error('Error fetching current user:', error.message);
      res.status(500).json({ error: 'Failed to fetch current user' });
    }
  });


  router.get('/group-averages/:groupCode', authMiddleware, async (req, res) => {
    const { groupCode } = req.params;
  
    try {
      const users = await User.find({ 'surveys.groupCode': groupCode });
  
      // Extract all survey responses for the group
      const surveys = [];
      users.forEach((user) => {
        const survey = user.surveys.find((s) => s.groupCode === groupCode);
        if (survey) {
          surveys.push(survey.answers);
        }
      });
  
      if (surveys.length === 0) {
        return res.status(400).json({ error: 'No survey responses found for this group' });
      }
  
      // Calculate averages
      const aggregated = surveys.reduce(
        (totals, response) => {
          for (const key in response) {
            totals[key] = (totals[key] || 0) + response[key];
          }
          return totals;
        },
        {}
      );
  
      const averages = {};
      const totalResponses = surveys.length;
      for (const key in aggregated) {
        averages[key] = aggregated[key] / totalResponses;
      }
  
      res.status(200).json({ groupCode, averages });
      console.log(groupCode);
    } catch (error) {
      console.error('Error calculating group averages:', error);
      res.status(500).json({ error: 'An error occurred while calculating averages' });
    }
  });



  // In your routes file
router.post('/generate-playlist', authMiddleware, async (req, res) => {
    const { groupCode } = req.body;
    const userId = req.user.id;
  
    try {
      const user = await User.findById(userId);
      const surveyHandler = new GroupSurveyHandler();
      
      // Create the playlist
      const playlistDetails = await surveyHandler.createGroupPlaylist(groupCode, user);
      
      res.status(200).json({
        message: 'Playlist created successfully',
        playlist: playlistDetails
      });
    } catch (error) {
      console.error('Error generating playlist:', error);
      res.status(500).json({ error: 'Failed to generate playlist' });
    }
  });
  


  


module.exports = router;

