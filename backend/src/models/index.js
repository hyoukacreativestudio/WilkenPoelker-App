const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Post = require('./Post');
const Comment = require('./Comment');
const Like = require('./Like');
const Ticket = require('./Ticket');
const ChatMessage = require('./ChatMessage');
const Notification = require('./Notification');
const Product = require('./Product');
const ProductReview = require('./ProductReview');
const ServiceRating = require('./ServiceRating');
const StaffRating = require('./StaffRating');
const Appointment = require('./Appointment');
const Repair = require('./Repair');
const FCMToken = require('./FCMToken');
const AuditLog = require('./AuditLog');
const AISession = require('./AISession');
const AIUsage = require('./AIUsage');
const Favorite = require('./Favorite');
const OpeningHour = require('./OpeningHour');
const Holiday = require('./Holiday');
const ShareTracking = require('./ShareTracking');
const FAQ = require('./FAQ');
const AboutContent = require('./AboutContent');
const CustomerNumberRequest = require('./CustomerNumberRequest');

// ==========================================
// ASSOCIATIONS
// ==========================================

// User -> Posts (one-to-many)
User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// Post -> Comments (one-to-many)
Post.hasMany(Comment, { foreignKey: 'postId', as: 'comments' });
Comment.belongsTo(Post, { foreignKey: 'postId', as: 'post' });

// User -> Comments (one-to-many)
User.hasMany(Comment, { foreignKey: 'userId', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// Comment -> Comment (self-referential for nested comments)
Comment.hasMany(Comment, { foreignKey: 'parentId', as: 'replies' });
Comment.belongsTo(Comment, { foreignKey: 'parentId', as: 'parent' });

// Post -> Likes (one-to-many)
Post.hasMany(Like, { foreignKey: 'postId', as: 'likes' });
Like.belongsTo(Post, { foreignKey: 'postId' });

// User -> Likes (one-to-many)
User.hasMany(Like, { foreignKey: 'userId', as: 'likes' });
Like.belongsTo(User, { foreignKey: 'userId' });

// User -> Tickets (one-to-many)
User.hasMany(Ticket, { foreignKey: 'userId', as: 'tickets' });
Ticket.belongsTo(User, { foreignKey: 'userId', as: 'creator' });

// Ticket -> assigned staff
Ticket.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });

// Ticket -> ChatMessages (one-to-many)
Ticket.hasMany(ChatMessage, { foreignKey: 'ticketId', as: 'messages' });
ChatMessage.belongsTo(Ticket, { foreignKey: 'ticketId' });

// User -> ChatMessages (one-to-many)
User.hasMany(ChatMessage, { foreignKey: 'userId', as: 'chatMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'userId', as: 'sender' });

// User -> Notifications (one-to-many)
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId' });

// Product -> ProductReviews (one-to-many)
Product.hasMany(ProductReview, { foreignKey: 'productId', as: 'reviews' });
ProductReview.belongsTo(Product, { foreignKey: 'productId' });

// User -> ProductReviews (one-to-many)
User.hasMany(ProductReview, { foreignKey: 'userId', as: 'productReviews' });
ProductReview.belongsTo(User, { foreignKey: 'userId', as: 'reviewer' });

// User -> ServiceRatings (one-to-many)
User.hasMany(ServiceRating, { foreignKey: 'userId', as: 'serviceRatings' });
ServiceRating.belongsTo(User, { foreignKey: 'userId' });

// ServiceRating -> Ticket
ServiceRating.belongsTo(Ticket, { foreignKey: 'ticketId' });

// ServiceRating -> Staff (the staff member being rated)
ServiceRating.belongsTo(User, { foreignKey: 'staffId', as: 'ratedStaff' });
User.hasMany(ServiceRating, { foreignKey: 'staffId', as: 'staffServiceRatings' });

// User -> StaffRatings (as rater)
User.hasMany(StaffRating, { foreignKey: 'userId', as: 'givenRatings' });
StaffRating.belongsTo(User, { foreignKey: 'userId', as: 'rater' });

// User -> StaffRatings (as staff being rated)
User.hasMany(StaffRating, { foreignKey: 'staffId', as: 'receivedRatings' });
StaffRating.belongsTo(User, { foreignKey: 'staffId', as: 'staff' });

// User -> Appointments (one-to-many)
User.hasMany(Appointment, { foreignKey: 'userId', as: 'appointments' });
Appointment.belongsTo(User, { foreignKey: 'userId', as: 'customer' });

// Appointment -> Ticket
Appointment.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });

// Appointment -> assigned staff
Appointment.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });

// Appointment -> registrant (staff who registered the appointment)
Appointment.belongsTo(User, { foreignKey: 'registeredBy', as: 'registrant' });

// Appointment -> questioner (staff who asked a follow-up question)
Appointment.belongsTo(User, { foreignKey: 'staffQuestionBy', as: 'questioner' });

// User -> Repairs (one-to-many)
User.hasMany(Repair, { foreignKey: 'userId', as: 'repairs' });
Repair.belongsTo(User, { foreignKey: 'userId', as: 'customer' });

// Repair -> technician
Repair.belongsTo(User, { foreignKey: 'technicianId', as: 'technician' });

// User -> FCMTokens (one-to-many)
User.hasMany(FCMToken, { foreignKey: 'userId', as: 'fcmTokens' });
FCMToken.belongsTo(User, { foreignKey: 'userId' });

// User -> AuditLogs (one-to-many)
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'actor' });

// User -> AISessions (one-to-many)
User.hasMany(AISession, { foreignKey: 'userId', as: 'aiSessions' });
AISession.belongsTo(User, { foreignKey: 'userId' });

// AISession -> Ticket (escalation)
AISession.belongsTo(Ticket, { foreignKey: 'escalatedTicketId', as: 'escalatedTicket' });

// AISession -> AIUsage (one-to-many)
AISession.hasMany(AIUsage, { foreignKey: 'sessionId', as: 'usage' });
AIUsage.belongsTo(AISession, { foreignKey: 'sessionId' });

// User -> AIUsage (one-to-many)
User.hasMany(AIUsage, { foreignKey: 'userId', as: 'aiUsage' });
AIUsage.belongsTo(User, { foreignKey: 'userId' });

// User -> Favorites (one-to-many)
User.hasMany(Favorite, { foreignKey: 'userId', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'userId' });

// Product -> Favorites (one-to-many)
Product.hasMany(Favorite, { foreignKey: 'productId', as: 'favorites' });
Favorite.belongsTo(Product, { foreignKey: 'productId' });

// User -> ShareTracking (one-to-many)
User.hasMany(ShareTracking, { foreignKey: 'userId', as: 'shares' });
ShareTracking.belongsTo(User, { foreignKey: 'userId' });

// User -> CustomerNumberRequests (one-to-many)
User.hasMany(CustomerNumberRequest, { foreignKey: 'userId', as: 'customerNumberRequests' });
CustomerNumberRequest.belongsTo(User, { foreignKey: 'userId', as: 'requester' });

// CustomerNumberRequest -> reviewer (admin who reviewed)
CustomerNumberRequest.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });

module.exports = {
  sequelize,
  User,
  Post,
  Comment,
  Like,
  Ticket,
  ChatMessage,
  Notification,
  Product,
  ProductReview,
  ServiceRating,
  StaffRating,
  Appointment,
  Repair,
  FCMToken,
  AuditLog,
  AISession,
  AIUsage,
  Favorite,
  OpeningHour,
  Holiday,
  ShareTracking,
  FAQ,
  AboutContent,
  CustomerNumberRequest,
};
