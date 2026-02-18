const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  User,
  Ticket,
  Repair,
  ServiceRating,
  StaffRating,
  Appointment,
  AIUsage,
  AuditLog,
  Notification,
  FCMToken,
  Product,
  ProductReview,
} = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * Get dashboard statistics for admin.
 */
async function getDashboardStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeTickets,
    completedRepairs,
    avgRatingResult,
    aiUsageThisMonth,
    newUsersThisWeek,
  ] = await Promise.all([
    // Total users
    User.count({ where: { isActive: true } }),

    // Active tickets (open or in_progress)
    Ticket.count({
      where: {
        status: { [Op.in]: ['open', 'in_progress'] },
      },
    }),

    // Completed repairs (repair_done or ready for pickup)
    Repair.count({
      where: { status: { [Op.in]: ['repair_done', 'ready'] } },
    }),

    // Average rating
    ServiceRating.findAll({
      attributes: [[fn('AVG', col('overall_rating')), 'avgRating']],
      raw: true,
    }),

    // AI usage this month (total tokens)
    AIUsage.findAll({
      where: {
        createdAt: { [Op.gte]: startOfMonth },
      },
      attributes: [
        [fn('SUM', col('total_tokens')), 'totalTokens'],
        [fn('COUNT', col('id')), 'requestCount'],
      ],
      raw: true,
    }),

    // New users this week
    User.count({
      where: {
        createdAt: { [Op.gte]: oneWeekAgo },
      },
    }),
  ]);

  return {
    totalUsers,
    activeTickets,
    completedRepairs,
    averageRating: parseFloat(avgRatingResult[0]?.avgRating) || 0,
    aiUsageThisMonth: {
      totalTokens: parseInt(aiUsageThisMonth[0]?.totalTokens, 10) || 0,
      requestCount: parseInt(aiUsageThisMonth[0]?.requestCount, 10) || 0,
    },
    newUsersThisWeek,
  };
}

/**
 * Get paginated user list with advanced filtering.
 */
async function getUserList({ page = 1, limit = 20, search, role, status }) {
  const where = {};

  if (search) {
    where[Op.or] = [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { customerNumber: { [Op.iLike]: `%${search}%` } },
      { username: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (status === 'active') {
    where.isActive = true;
  } else if (status === 'inactive') {
    where.isActive = false;
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: {
      exclude: ['password', 'refreshToken', 'emailVerificationToken', 'passwordResetToken', 'passwordResetExpires', 'pinCode'],
    },
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit, 10),
    offset,
    paranoid: false, // include soft-deleted
  });

  return {
    users: rows,
    pagination: {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Get paginated audit log with filters.
 */
async function getAuditLog({ page = 1, limit = 50, action, userId, from, to }) {
  const where = {};

  if (action) {
    where.action = action;
  }

  if (userId) {
    where.userId = userId;
  }

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Op.gte] = new Date(from);
    if (to) where.createdAt[Op.lte] = new Date(to);
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'actor',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit, 10),
    offset,
  });

  return {
    logs: rows,
    pagination: {
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Send a broadcast notification to all users or users with specific roles.
 * Supports both `roles` array (new) and `role` string (legacy).
 */
async function sendBroadcast({ title, message, type, roles, role }) {
  const where = { isActive: true };

  // Support both `roles` array and legacy `role` string
  const targetRoles = Array.isArray(roles) && roles.length > 0
    ? roles
    : (role ? [role] : null);

  if (targetRoles) {
    where.role = targetRoles.length === 1
      ? targetRoles[0]
      : { [Op.in]: targetRoles };
  }

  const users = await User.findAll({
    where,
    attributes: ['id'],
  });

  if (users.length === 0) {
    logger.warn('Broadcast: no users found for target roles', {
      roles: targetRoles || 'all',
      title,
    });
    return { recipientCount: 0 };
  }

  // Create notifications for each user
  const notifications = users.map((user) => ({
    userId: user.id,
    title,
    message,
    type: type || 'system',
    category: 'system',
  }));

  await Notification.bulkCreate(notifications);

  logger.info('Broadcast notification sent', {
    recipientCount: users.length,
    roles: targetRoles || 'all',
    title,
  });

  return { recipientCount: users.length };
}

/**
 * Get detailed analytics (super admin).
 */
async function getDetailedAnalytics() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Monthly signups (last 6 months)
  const monthlySignups = await User.findAll({
    where: {
      createdAt: { [Op.gte]: sixMonthsAgo },
    },
    attributes: [
      [fn('DATE_TRUNC', 'month', col('created_at')), 'month'],
      [fn('COUNT', col('id')), 'count'],
    ],
    group: [literal("DATE_TRUNC('month', created_at)")],
    order: [[literal("DATE_TRUNC('month', created_at)"), 'ASC']],
    raw: true,
  });

  // Ticket trends (last 6 months)
  const ticketTrends = await Ticket.findAll({
    where: {
      createdAt: { [Op.gte]: sixMonthsAgo },
    },
    attributes: [
      [fn('DATE_TRUNC', 'month', col('created_at')), 'month'],
      [fn('COUNT', col('id')), 'count'],
    ],
    group: [literal("DATE_TRUNC('month', created_at)")],
    order: [[literal("DATE_TRUNC('month', created_at)"), 'ASC']],
    raw: true,
  });

  // Rating trends (last 6 months)
  const ratingTrends = await ServiceRating.findAll({
    where: {
      createdAt: { [Op.gte]: sixMonthsAgo },
    },
    attributes: [
      [fn('DATE_TRUNC', 'month', col('created_at')), 'month'],
      [fn('AVG', col('overall_rating')), 'avgRating'],
      [fn('COUNT', col('id')), 'count'],
    ],
    group: [literal("DATE_TRUNC('month', created_at)")],
    order: [[literal("DATE_TRUNC('month', created_at)"), 'ASC']],
    raw: true,
  });

  // Popular products (top 10 by review count)
  const popularProducts = await Product.findAll({
    attributes: ['id', 'name', 'category'],
    include: [
      {
        model: ProductReview,
        as: 'reviews',
        attributes: [],
      },
    ],
    group: ['Product.id'],
    order: [[fn('COUNT', col('reviews.id')), 'DESC']],
    limit: 10,
    subQuery: false,
  });

  // AI usage trends (last 6 months)
  const aiUsageTrends = await AIUsage.findAll({
    where: {
      createdAt: { [Op.gte]: sixMonthsAgo },
    },
    attributes: [
      [fn('DATE_TRUNC', 'month', col('created_at')), 'month'],
      [fn('SUM', col('total_tokens')), 'totalTokens'],
      [fn('COUNT', col('id')), 'requestCount'],
      [fn('SUM', col('cost')), 'totalCost'],
    ],
    group: [literal("DATE_TRUNC('month', created_at)")],
    order: [[literal("DATE_TRUNC('month', created_at)"), 'ASC']],
    raw: true,
  });

  return {
    monthlySignups,
    ticketTrends,
    ratingTrends,
    popularProducts,
    aiUsageTrends,
  };
}

/**
 * Get yearly overview with per-employee stats and overall totals.
 */
async function getYearlyOverview(year) {
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const dateFilter = { [Op.gte]: yearStart, [Op.lt]: yearEnd };

  // Get all staff members (non-customer roles)
  const staff = await User.findAll({
    where: {
      role: { [Op.ne]: 'customer' },
    },
    attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive'],
    raw: true,
  });

  const staffIds = staff.map((s) => s.id);

  // Tickets per employee (assigned)
  const ticketStats = await Ticket.findAll({
    where: { assignedTo: { [Op.in]: staffIds }, createdAt: dateFilter },
    attributes: [
      'assignedTo',
      [fn('COUNT', col('id')), 'total'],
      [fn('SUM', literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")), 'completed'],
    ],
    group: ['assignedTo'],
    raw: true,
  });

  // Repairs per technician
  const repairStats = await Repair.findAll({
    where: { technicianId: { [Op.in]: staffIds }, createdAt: dateFilter },
    attributes: [
      'technicianId',
      [fn('COUNT', col('id')), 'total'],
      [fn('SUM', literal("CASE WHEN status IN ('repair_done', 'ready') THEN 1 ELSE 0 END")), 'completed'],
      [fn('SUM', col('cost')), 'revenue'],
    ],
    group: ['technicianId'],
    raw: true,
  });

  // Appointments per employee
  const appointmentStats = await Appointment.findAll({
    where: { assignedTo: { [Op.in]: staffIds }, createdAt: dateFilter },
    attributes: [
      'assignedTo',
      [fn('COUNT', col('id')), 'total'],
      [fn('SUM', literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")), 'completed'],
    ],
    group: ['assignedTo'],
    raw: true,
  });

  // Staff ratings per employee
  const ratingStats = await StaffRating.findAll({
    where: { staffId: { [Op.in]: staffIds }, createdAt: dateFilter },
    attributes: [
      'staffId',
      [fn('AVG', col('rating')), 'avgRating'],
      [fn('COUNT', col('id')), 'ratingCount'],
    ],
    group: ['staffId'],
    raw: true,
  });

  // Build lookup maps
  const ticketMap = {};
  ticketStats.forEach((t) => { ticketMap[t.assignedTo] = t; });
  const repairMap = {};
  repairStats.forEach((r) => { repairMap[r.technicianId] = r; });
  const appointmentMap = {};
  appointmentStats.forEach((a) => { appointmentMap[a.assignedTo] = a; });
  const ratingMap = {};
  ratingStats.forEach((r) => { ratingMap[r.staffId] = r; });

  // Build per-employee result
  const employees = staff.map((s) => {
    const tickets = ticketMap[s.id];
    const repairs = repairMap[s.id];
    const appointments = appointmentMap[s.id];
    const ratings = ratingMap[s.id];

    return {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      role: s.role,
      isActive: s.isActive,
      tickets: {
        total: parseInt(tickets?.total || 0, 10),
        completed: parseInt(tickets?.completed || 0, 10),
      },
      repairs: {
        total: parseInt(repairs?.total || 0, 10),
        completed: parseInt(repairs?.completed || 0, 10),
        revenue: parseFloat(repairs?.revenue || 0),
      },
      appointments: {
        total: parseInt(appointments?.total || 0, 10),
        completed: parseInt(appointments?.completed || 0, 10),
      },
      rating: {
        average: ratings?.avgRating ? parseFloat(parseFloat(ratings.avgRating).toFixed(1)) : null,
        count: parseInt(ratings?.ratingCount || 0, 10),
      },
    };
  });

  // Overall totals
  const overall = {
    tickets: {
      total: employees.reduce((sum, e) => sum + e.tickets.total, 0),
      completed: employees.reduce((sum, e) => sum + e.tickets.completed, 0),
    },
    repairs: {
      total: employees.reduce((sum, e) => sum + e.repairs.total, 0),
      completed: employees.reduce((sum, e) => sum + e.repairs.completed, 0),
      revenue: employees.reduce((sum, e) => sum + e.repairs.revenue, 0),
    },
    appointments: {
      total: employees.reduce((sum, e) => sum + e.appointments.total, 0),
      completed: employees.reduce((sum, e) => sum + e.appointments.completed, 0),
    },
    rating: {
      average: (() => {
        const rated = employees.filter((e) => e.rating.average !== null);
        if (rated.length === 0) return null;
        const sum = rated.reduce((s, e) => s + e.rating.average * e.rating.count, 0);
        const totalCount = rated.reduce((s, e) => s + e.rating.count, 0);
        return totalCount > 0 ? parseFloat((sum / totalCount).toFixed(1)) : null;
      })(),
      count: employees.reduce((sum, e) => sum + e.rating.count, 0),
    },
    staffCount: employees.length,
  };

  return { year, employees, overall };
}

module.exports = {
  getDashboardStats,
  getUserList,
  getAuditLog,
  sendBroadcast,
  getDetailedAnalytics,
  getYearlyOverview,
};
