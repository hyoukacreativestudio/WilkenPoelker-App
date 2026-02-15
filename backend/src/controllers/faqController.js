const FAQ = require('../models/FAQ');

// Get all active FAQs (public)
const getFAQs = async (req, res) => {
  try {
    const { category } = req.query;
    const where = { isActive: true };
    if (category) where.category = category;

    const faqs = await FAQ.findAll({
      where,
      order: [['order', 'ASC'], ['createdAt', 'DESC']],
    });
    res.json(faqs);
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ error: 'Could not fetch FAQs' });
  }
};

// Get all FAQs including inactive (admin)
const getAllFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.findAll({
      order: [['order', 'ASC'], ['createdAt', 'DESC']],
    });
    res.json(faqs);
  } catch (error) {
    console.error('Error fetching all FAQs:', error);
    res.status(500).json({ error: 'Could not fetch FAQs' });
  }
};

// Create FAQ
const createFAQ = async (req, res) => {
  try {
    const { question, answer, category, order } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }
    const faq = await FAQ.create({
      question,
      answer,
      category: category || 'general',
      order: order || 0,
      createdBy: req.user?.id,
    });
    res.status(201).json(faq);
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ error: 'Could not create FAQ' });
  }
};

// Update FAQ
const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    // Use pre-loaded FAQ from faqAuth middleware, or fetch if not available
    const faq = req.faq || await FAQ.findByPk(id);
    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }
    const { question, answer, category, order, isActive } = req.body;
    await faq.update({ question, answer, category, order, isActive });
    res.json(faq);
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ error: 'Could not update FAQ' });
  }
};

// Delete FAQ
const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    // Use pre-loaded FAQ from faqAuth middleware, or fetch if not available
    const faq = req.faq || await FAQ.findByPk(id);
    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }
    await faq.destroy();
    res.json({ message: 'FAQ deleted' });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ error: 'Could not delete FAQ' });
  }
};

module.exports = { getFAQs, getAllFAQs, createFAQ, updateFAQ, deleteFAQ };
