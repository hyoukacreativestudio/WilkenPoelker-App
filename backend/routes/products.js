const express = require('express');
const Ticket = require('../models/Ticket');
const authMiddleware = require('../middleware/auth');  // Neu: Import von middleware
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const router = express.Router();

router.get('/bikes/discounts', authMiddleware, async (req, res) => {
  res.json([{ id: 1, discount: '20% auf E-Bikes' }]);
});

router.post('/bikes/createQuestionTicket', authMiddleware, async (req, res) => {
  const { question } = req.body;
  const newTicket = new Ticket({ userId: req.user.id, type: 'bike', description: question });
  await newTicket.save();
  res.json(newTicket);
});

router.post('/bikes/askAI', authMiddleware, async (req, res) => {
  const { question } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Du bist ein Experte für Fahrräder, E-Bikes und Leasing. Antworte nur zu diesen Themen, kurz und hilfreich.' },
        { role: 'user', content: question }
      ],
    });
    res.json({ answer: completion.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ msg: 'KI-Fehler', error: err.message });
  }
});

module.exports = router;