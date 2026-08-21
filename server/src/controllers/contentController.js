const Content = require('../models/Content');

exports.getContentByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    
    // User fetch should only return published content
    const content = await Content.findOne({ type, isPublished: true });
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found or not published yet.'
      });
    }

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdminContentByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    
    // Admin fetch returns content regardless of published state
    let content = await Content.findOne({ type });
    
    // If not found, return empty placeholder structure
    if (!content) {
      content = {
        type,
        title: '',
        body: '',
        isPublished: false
      };
    }

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    next(error);
  }
};

exports.updateContent = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { title, body, isPublished } = req.body;
    
    if (!['privacy_policy', 'terms_conditions', 'booking_help'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type'
      });
    }

    let content = await Content.findOne({ type });
    
    if (content) {
      content.title = title || content.title;
      content.body = body || content.body;
      if (isPublished !== undefined) {
        content.isPublished = isPublished;
      }
      await content.save();
    } else {
      content = await Content.create({
        type,
        title,
        body,
        isPublished: isPublished || false
      });
    }

    res.status(200).json({
      success: true,
      message: 'Content updated successfully',
      data: content
    });
  } catch (error) {
    next(error);
  }
};
