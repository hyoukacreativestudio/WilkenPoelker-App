const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password, confirmPassword, customerNumber } = req.body;
  if (password !== confirmPassword) return res.status(400).json({ msg: 'Passwörter stimmen nicht überein' });

  // Taifun-Überprüfung (Platzhalter - kommentiere aus für Test)
  // try {
  //   const taifunRes = await axios.get(`https://taifun-api.example.com/verify/${customerNumber}`, {
  //     headers: { Authorization: process.env.TAIFUN_API_KEY }
  //   });
  //   if (!taifunRes.data.valid) return res.status(400).json({ msg: 'Kundennummer ungültig' });
  // } catch (err) {
  //   return res.status(500).json({ msg: 'Taifun-Fehler' });
  // }

  const hashedPw = await bcrypt.hash(password, 10);
  const newUser = new User({ username, email, password: hashedPw, customerNumber });
  await newUser.save();
  res.json({ msg: 'Registriert' });
});

router.post('/login', async (req, res) => {
  const { email, password, customerNumber } = req.body;
  const user = await User.findOne({ email });
  if (!user || !await bcrypt.compare(password, user.password) || user.customerNumber !== customerNumber) {
    return res.status(400).json({ msg: 'Ungültig' });
  }
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, user });
});

module.exports = router;