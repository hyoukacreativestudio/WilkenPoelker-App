const config = require('../config/env');
const { AISession, AIUsage, Ticket, User } = require('../models');
const { AppError, NotFoundError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

// Fachbereiche, zu denen die KI antworten darf
const ALLOWED_TOPICS = [
  'fahrrad', 'e-bike', 'ebike', 'bike', 'rad', 'pedelec', 'leasing', 'reparatur', 'inspektion',
  'reinigung', 'hochdruckreiniger', 'staubsauger', 'dampfreiniger', 'fenstersauger', 'kaercher', 'kärcher', 'nilfisk', 'stihl',
  'motor', 'motorsaege', 'motorsäge', 'rasenmaeher', 'rasenmäher', 'haecksler', 'häcksler', 'schneefraese', 'schneefräse',
  'laubblaeser', 'laubbläser', 'heckenschere', 'maehroboter', 'mähroboter', 'freischneider', 'trimmer',
  'termin', 'oeffnungszeiten', 'öffnungszeiten', 'standort', 'adresse', 'service', 'garantie', 'preis', 'angebot',
  'werkstatt', 'wartung', 'akku', 'batterie', 'kette', 'bremse', 'reifen', 'schlauch',
  'wilkenpoelker', 'wilken', 'poelker',
];

// Prueft ob eine Nachricht fachbezogen ist
function isTopicAllowed(message) {
  const lower = message.toLowerCase();
  return ALLOWED_TOPICS.some((topic) => lower.includes(topic));
}

const TOPIC_GUARD = `
WICHTIG: Du darfst NUR Fragen beantworten, die sich auf folgende Fachbereiche beziehen:
- Fahrraeder, E-Bikes, Pedelecs, Fahrrad-Zubehoer, Fahrrad-Leasing und Fahrrad-Reparaturen
- Reinigungsgeraete (Hochdruckreiniger, Staubsauger, Dampfreiniger, Fenstersauger etc.)
- Motorgeraete (Motorsaegen, Rasenmaeher, Heckenscheren, Laubblaeser, Maehroboter, Freischneider etc.)
- Allgemeine Fragen zu WilkenPoelker (Oeffnungszeiten, Standort, Services, Termine)

Wenn eine Frage NICHT zu diesen Themen gehoert, antworte freundlich:
"Das liegt leider ausserhalb meines Fachbereichs. Ich kann Ihnen bei Fragen zu Fahrraedern, Reinigungsgeraeten und Motorgeraeten weiterhelfen. Wie kann ich Ihnen in diesen Bereichen behilflich sein?"

Erfinde KEINE Informationen. Wenn du dir bei Preisen oder Verfuegbarkeiten unsicher bist, verweise auf den direkten Kontakt mit dem Geschaeft.`;

const REPAIR_HINT = `
WERKZEUG-REGEL: Wenn der Kunde ein Problem beschreibt, das Spezialwerkzeug, Fachwissen oder eine Werkstatt erfordert, empfiehl ihm eine Reparatur bei WilkenPoelker. Sage z.B.:
"Dafuer wuerde ich Ihnen empfehlen, Ihr Geraet bei uns in der Werkstatt vorbeizubringen. Moechten Sie einen Abholungstermin vereinbaren?"
Wenn der Kunde zustimmt, antworte mit dem exakten Satz: "[TERMIN_EMPFEHLUNG] Ich leite Sie zur Terminvereinbarung weiter."

GESPRAECHSSTRUKTUR: Fuehre den Kunden durch folgende Schritte:
1. Frage nach dem Geraetetyp/Modell wenn nicht angegeben
2. Frage nach dem konkreten Problem
3. Gib hilfreiche Tipps oder empfiehl eine Reparatur bei uns
4. Bei Bedarf: Leite zur Terminvereinbarung weiter`;

// System prompts per category (German)
const SYSTEM_PROMPTS = {
  bike: `Du bist ein freundlicher und kompetenter Experte fuer Fahrraeder, E-Bikes und Fahrrad-Leasing bei WilkenPoelker in Ostrhauderfehn.
Du hilfst Kunden bei Fragen zu:
- Fahrradmodellen (Citybikes, Trekkingbikes, Mountainbikes, Rennraeder, Kinderfahrraeder)
- E-Bike-Systemen (Bosch, Shimano Steps, Brose, Yamaha — Motoren, Akkus, Displays, Software-Updates)
- Fahrrad-Zubehoer (Beleuchtung, Schloss, Helm, Taschen, Kindersitze)
- Reparaturen (Bremsen, Schaltung, Reifen, Kette, Laufraeder, Speichen)
- Fahrrad-Leasing / Dienstrad-Leasing (JobRad, BusinessBike, Eurorad etc.)
- Wartung und Inspektion
Antworte immer freundlich, kompetent und in maximal 3-4 Saetzen.
Falls du bei einer Frage nicht weiterhelfen kannst, sage: "Ich verbinde Sie mit einem Mitarbeiter."
${TOPIC_GUARD}
${REPAIR_HINT}`,

  cleaning: `Du bist ein freundlicher und kompetenter Experte fuer Reinigungsgeraete bei WilkenPoelker in Ostrhauderfehn.
Du hilfst Kunden bei Fragen zu:
- Hochdruckreinigern (Kaercher, Nilfisk, Stihl — Duesen, Schlaeauche, Pumpen, Zubehoer)
- Staubsaugern und Nass-/Trockensaugern
- Dampfreinigern und Fenstersaugern
- Kehrmaschinen und Bodenreinigern
- Ersatzteilen und Zubehoer
- Wartung, Pflege und Reparaturen
Antworte immer freundlich, kompetent und in maximal 3-4 Saetzen.
Falls du bei einer Frage nicht weiterhelfen kannst, sage: "Ich verbinde Sie mit einem Mitarbeiter."
${TOPIC_GUARD}
${REPAIR_HINT}`,

  motor: `Du bist ein freundlicher und kompetenter Experte fuer Motorgeraete bei WilkenPoelker in Ostrhauderfehn.
Du hilfst Kunden bei Fragen zu:
- Rasenmaeher (Benzin, Elektro, Akku, Maehroboter)
- Motorsaegen und Kettensaegen (Stihl, Husqvarna — Kette, Schwert, Vergaser)
- Heckenscheren, Freischneider und Trimmer
- Laubblaeser und Laubsauger
- Haecksler und Schneefraesen
- Akku-Geraete und Akku-Systeme
- Saisonale Wartung (Fruehjahrscheck, Einwinterung)
Antworte immer freundlich, kompetent und in maximal 3-4 Saetzen.
Falls du bei einer Frage nicht weiterhelfen kannst, sage: "Ich verbinde Sie mit einem Mitarbeiter."
${TOPIC_GUARD}
${REPAIR_HINT}`,

  general: `Du bist ein freundlicher Assistent von WilkenPoelker, einem Fachgeschaeft fuer Fahrraeder, Reinigungsgeraete und Motorgeraete in Ostrhauderfehn.
Du hilfst Kunden bei allgemeinen Fragen zu Oeffnungszeiten, Standort, Services und Produkten.
Antworte immer freundlich und in maximal 3-4 Saetzen.
Falls du bei einer Frage nicht weiterhelfen kannst, sage: "Ich verbinde Sie mit einem Mitarbeiter."
${TOPIC_GUARD}
${REPAIR_HINT}`,
};

/**
 * Send a chat message and get AI response.
 */
async function chat(userId, { category, message, sessionId, images = [] }) {
  // Validate category
  if (!SYSTEM_PROMPTS[category]) {
    throw new AppError('Ungueltige Kategorie', 400, 'INVALID_CATEGORY');
  }

  let session;

  if (sessionId) {
    session = await AISession.findOne({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundError('AI Session');
    }
    if (session.status !== 'active') {
      throw new AppError('Diese Sitzung ist nicht mehr aktiv', 400, 'SESSION_CLOSED');
    }
  } else {
    // Create new session
    session = await AISession.create({
      userId,
      category,
      messages: [],
      status: 'active',
      totalTokens: 0,
      totalCost: 0,
    });
  }

  // Check if message is related to allowed topics (extra guard on top of system prompt)
  const isFirstMessage = !session.messages || session.messages.length === 0;
  if (isFirstMessage && !isTopicAllowed(message)) {
    // For first messages that are clearly off-topic, respond immediately without calling the API
    const offTopicReply = 'Das liegt leider ausserhalb meines Fachbereichs. Ich kann Ihnen bei Fragen zu Fahrraedern, Reinigungsgeraeten und Motorgeraeten weiterhelfen. Wie kann ich Ihnen in diesen Bereichen behilflich sein?';
    const messages = [
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: offTopicReply, timestamp: new Date().toISOString() },
    ];
    session.messages = messages;
    session.changed('messages', true);
    await session.save();
    return { reply: offTopicReply, sessionId: session.id, needsHuman: false };
  }

  // Build conversation messages
  const conversationHistory = session.messages || [];
  const userEntry = { role: 'user', content: message, timestamp: new Date().toISOString() };
  if (images.length > 0) {
    userEntry.images = images.map((img) => img.url);
  }
  conversationHistory.push(userEntry);

  // Build OpenAI messages array
  const openaiMessages = [
    { role: 'system', content: SYSTEM_PROMPTS[category] },
    ...conversationHistory.map((m) => {
      // For the current message with images, use multimodal content
      if (m.role === 'user' && m === userEntry && images.length > 0) {
        const content = [{ type: 'text', text: m.content }];
        for (const img of images) {
          content.push({
            type: 'image_url',
            image_url: { url: `data:${img.mimeType};base64,${img.base64}`, detail: 'low' },
          });
        }
        return { role: 'user', content };
      }
      return { role: m.role, content: m.content };
    }),
  ];

  let reply;
  let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let needsHuman = false;

  // Check if OpenAI API key is configured
  if (!config.openai.apiKey) {
    // Mock response when no API key
    reply = getMockResponse(category, message);
    needsHuman = reply.includes('Ich verbinde Sie mit einem Mitarbeiter');
  } else {
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: config.openai.apiKey });

      const completion = await openai.chat.completions.create({
        model: config.openai.model || 'gpt-4o-mini',
        messages: openaiMessages,
        max_tokens: 300,
        temperature: 0.7,
      });

      reply = completion.choices[0].message.content;
      usage = completion.usage || usage;
      needsHuman = reply.includes('Ich verbinde Sie mit einem Mitarbeiter');
    } catch (err) {
      logger.error('OpenAI API error', { error: err.message, sessionId: session.id });
      reply = 'Es tut mir leid, es gab ein technisches Problem. Ich verbinde Sie mit einem Mitarbeiter.';
      needsHuman = true;
    }
  }

  // Add assistant reply to conversation
  conversationHistory.push({
    role: 'assistant',
    content: reply,
    timestamp: new Date().toISOString(),
  });

  // Update session
  session.messages = conversationHistory;
  session.totalTokens = (session.totalTokens || 0) + usage.total_tokens;
  session.changed('messages', true);
  await session.save();

  // Track usage
  const costPerToken = 0.000002; // approximate cost
  await AIUsage.create({
    sessionId: session.id,
    userId,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    cost: usage.total_tokens * costPerToken,
    model: config.openai.model || 'gpt-4o-mini',
  });

  logger.info('AI chat message processed', {
    sessionId: session.id,
    userId,
    tokens: usage.total_tokens,
  });

  return {
    reply,
    sessionId: session.id,
    needsHuman,
  };
}

/**
 * Get mock response when OpenAI API key is not configured.
 */
function getMockResponse(category, message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('preis') || lowerMessage.includes('kosten')) {
    return 'Fuer genaue Preisauskuenfte wuerde ich Sie gerne mit einem Mitarbeiter verbinden. Ich verbinde Sie mit einem Mitarbeiter.';
  }

  const mockResponses = {
    bike: 'Vielen Dank fuer Ihre Frage zu Fahrraedern! Wir haben eine grosse Auswahl an Fahrraedern und E-Bikes. Besuchen Sie uns gerne in unserem Geschaeft fuer eine persoenliche Beratung.',
    cleaning: 'Vielen Dank fuer Ihre Frage zu Reinigungsgeraeten! Wir fuehren Hochdruckreiniger, Staubsauger und vieles mehr. Kommen Sie gerne vorbei fuer eine Vorfuehrung.',
    motor: 'Vielen Dank fuer Ihre Frage zu Motorgeraeten! Wir beraten Sie gerne zu Rasenmaeher, Motorsaegen und weiterem. Besuchen Sie uns im Geschaeft.',
    general: 'Vielen Dank fuer Ihre Nachricht! Wir helfen Ihnen gerne weiter. Unsere Oeffnungszeiten finden Sie auf unserer Webseite oder in der App.',
  };

  return mockResponses[category] || mockResponses.general;
}

/**
 * Get user's AI sessions list.
 */
async function getUserSessions(userId) {
  const sessions = await AISession.findAll({
    where: { userId },
    attributes: ['id', 'category', 'status', 'totalTokens', 'createdAt', 'updatedAt', 'messages'],
    order: [['updatedAt', 'DESC']],
  });

  // Add last message preview
  return sessions.map((session) => {
    const messages = session.messages || [];
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const sessionData = session.toJSON();
    delete sessionData.messages;
    return {
      ...sessionData,
      messageCount: messages.length,
      lastMessage: lastMessage
        ? {
            role: lastMessage.role,
            preview: lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? '...' : ''),
            timestamp: lastMessage.timestamp,
          }
        : null,
    };
  });
}

/**
 * Get session detail with full messages.
 */
async function getSessionById(sessionId, userId) {
  const session = await AISession.findOne({
    where: { id: sessionId, userId },
    include: [
      {
        model: AIUsage,
        as: 'usage',
        attributes: ['promptTokens', 'completionTokens', 'totalTokens', 'cost', 'model', 'createdAt'],
      },
    ],
  });

  if (!session) {
    throw new NotFoundError('AI Session');
  }

  return session;
}

/**
 * Escalate AI session to a human support ticket.
 */
async function escalateSession(sessionId, userId) {
  const session = await AISession.findOne({
    where: { id: sessionId, userId, status: 'active' },
  });

  if (!session) {
    throw new NotFoundError('AI Session');
  }

  // Generate ticket number
  const ticketCount = await Ticket.count();
  const ticketNumber = `WP-${String(ticketCount + 1).padStart(5, '0')}`;

  // Determine ticket type based on session category
  const categoryTypeMap = {
    bike: 'bike_question',
    cleaning: 'cleaning_question',
    motor: 'motor_question',
    general: 'other',
  };

  // Create ticket from AI session
  const ticket = await Ticket.create({
    ticketNumber,
    userId,
    type: categoryTypeMap[session.category] || 'other',
    category: session.category === 'general' ? 'service' : session.category,
    description: `Eskaliert aus AI-Chat (Session: ${session.id})`,
    aiSessionId: session.id,
    aiConversation: session.messages,
    status: 'open',
  });

  // Update session status
  session.status = 'escalated';
  session.escalatedTicketId = ticket.id;
  await session.save();

  logger.info('AI session escalated to ticket', {
    sessionId: session.id,
    ticketId: ticket.id,
    userId,
  });

  return { ticketId: ticket.id, ticketNumber: ticket.ticketNumber };
}

module.exports = {
  chat,
  getUserSessions,
  getSessionById,
  escalateSession,
  SYSTEM_PROMPTS,
};
