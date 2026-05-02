const express = require('express');
const router = express.Router();
const aiChatService = require('../services/aiChatService');
const { body, validationResult } = require('express-validator');

const_MAX_CHATS = 50;
const chatHistory = new Map();

function getHistory(sessionId) {
  return chatHistory.get(sessionId) || [];
}

function addToHistory(sessionId, role, content) {
  let history = getHistory(sessionId);
  history.push({ role, content, timestamp: Date.now() });
  if (history.length > _MAX_CHATS) {
    history = history.slice(-_MAX_CHATS);
  }
  chatHistory.set(sessionId, history);
}

function clearHistory(sessionId) {
  chatHistory.delete(sessionId);
}

router.post('/chat',
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('sessionId').optional().isString(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg,
        });
      }

      const { message, sessionId } = req.body;
      const chatId = sessionId || req.sessionID || 'guest';
      const history = getHistory(chatId);

      const result = await aiChatService.chat(message, history);

      if (result.success) {
        addToHistory(chatId, 'user', message);
        addToHistory(chatId, 'assistant', result.message);

        return res.json({
          success: true,
          message: result.message,
          usage: result.usage,
        });
      } else {
        return res.status(500).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error('Chat API error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred. Please try again.',
      });
    }
  }
);

router.post('/clear',
  body('sessionId').optional().isString(),
  async (req, res) => {
    try {
      const { sessionId } = req.body;
      const chatId = sessionId || req.sessionID || 'guest';
      clearHistory(chatId);

      res.json({
        success: true,
        message: 'Chat history cleared',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'An error occurred',
      });
    }
  }
);

router.get('/status', (req, res) => {
  const isConfigured = !!process.env.OPENAI_API_KEY;
  res.json({
    success: true,
    configured: isConfigured,
    status: isConfigured ? 'online' : 'unconfigured',
  });
});

module.exports = router;