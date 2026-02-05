const express = require('express');
const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');  // Dein Auth-Middleware-Import
const axios = require('axios');
const admin = require('firebase-admin');

const router = express.Router();

// 1. Ticket erstellen (Kunde)
router.post('/createTicket', authMiddleware, async (req, res) => {
  const { type, description } = req.body;

  if (!type || !description) {
    return res.status(400).json({ msg: 'Type und Beschreibung erforderlich' });
  }

  try {
    const newTicket = new Ticket({
      userId: req.user.id,
      type,
      description,
      status: 'open',
      createdAt: new Date(),
    });

    await newTicket.save();

    // Benachrichtigung an alle mit passender Berechtigung
    const admins = await User.find({ permissions: { $in: [type] } });

    for (let adminUser of admins) {
      const notif = new Notification({
        userId: adminUser._id,
        title: 'Neues Ticket',
        message: `Ticket #${newTicket._id} – ${type}: ${description.substring(0, 50)}...`,
        type: 'ticket',
      });
      await notif.save();

      if (adminUser.deviceToken) {
        admin.messaging().send({
          token: adminUser.deviceToken,
          notification: { title: notif.title, body: notif.message },
        }).catch(console.error);
      }
    }

    res.status(201).json({ msg: 'Ticket erstellt', ticketId: newTicket._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Fehler beim Erstellen des Tickets' });
  }
});

// 2. Offene Tickets des Users abrufen (für Floating-Icon)
router.get('/openTickets', authMiddleware, async (req, res) => {
  try {
    const tickets = await Ticket.find({
      userId: req.user.id,
      status: 'open',
    }).sort({ createdAt: -1 });

    if (tickets.length === 0) {
      return res.json({ hasOpen: false });
    }

    res.json({ hasOpen: true, ticketId: tickets[0]._id });
  } catch (err) {
    res.status(500).json({ msg: 'Fehler beim Abrufen' });
  }
});

// 3. Chat-Nachrichten für ein Ticket laden
router.get('/chat/:ticketId', authMiddleware, async (req, res) => {
  const { ticketId } = req.params;

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ msg: 'Ticket nicht gefunden' });

    // Nur der Ticket-Besitzer oder berechtigte Support-Mitarbeiter dürfen lesen
    if (ticket.userId.toString() !== req.user.id.toString() &&
        !req.user.permissions.includes(ticket.type)) {
      return res.status(403).json({ msg: 'Keine Berechtigung' });
    }

    const messages = await ChatMessage.find({ ticketId })
      .sort({ createdAt: 1 })
      .populate('userId', 'username');

    res.json(messages);
  } catch (err) {
    res.status(500).json({ msg: 'Fehler beim Laden der Nachrichten' });
  }
});

// 4. Nachricht in Chat senden
router.post('/chat/:ticketId', authMiddleware, async (req, res) => {
  const { ticketId } = req.params;
  const { message } = req.body;

  if (!message?.trim()) return res.status(400).json({ msg: 'Nachricht erforderlich' });

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket || ticket.status === 'closed') return res.status(404).json({ msg: 'Ticket nicht gefunden oder geschlossen' });

    // Berechtigung prüfen
    if (ticket.userId.toString() !== req.user.id.toString() &&
        !req.user.permissions.includes(ticket.type)) {
      return res.status(403).json({ msg: 'Keine Berechtigung' });
    }

    const newMessage = new ChatMessage({
      ticketId,
      userId: req.user.id,
      message,
      createdAt: new Date(),
    });

    await newMessage.save();

    // Optional: Push-Benachrichtigung an den anderen Teilnehmer
    const recipient = ticket.userId.toString() === req.user.id.toString()
      ? await User.find({ permissions: { $in: [ticket.type] } })
      : await User.findById(ticket.userId);

    // ... (Push-Logik wie vorher, optional)

    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ msg: 'Nachricht konnte nicht gesendet werden' });
  }
});

// 5. Ticket schließen (nur Support)
router.put('/closeTicket', authMiddleware, async (req, res) => {
  const { ticketId } = req.body;

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ msg: 'Ticket nicht gefunden' });

    // Nur Support darf schließen
    if (!req.user.permissions.includes(ticket.type)) {
      return res.status(403).json({ msg: 'Keine Berechtigung' });
    }

    ticket.status = 'closed';
    await ticket.save();

    // Benachrichtigung an Kunden
    const notif = new Notification({
      userId: ticket.userId,
      title: 'Ticket geschlossen',
      message: `Ihr Ticket #${ticketId} wurde geschlossen – alles geklärt.`,
      type: 'ticket_closed',
    });
    await notif.save();

    if (notif.userId.deviceToken) {
      admin.messaging().send({
        token: notif.userId.deviceToken,
        notification: { title: notif.title, body: notif.message },
      }).catch(console.error);
    }

    res.json({ msg: 'Ticket geschlossen' });
  } catch (err) {
    res.status(500).json({ msg: 'Ticket konnte nicht geschlossen werden' });
  }
});

module.exports = router;