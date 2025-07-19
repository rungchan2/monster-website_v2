/**
 * Type definitions index file
 * Central export for all type definitions
 */

// Database types
export * from '@/types/database'

// Payment and reservation types
export * from './nicepay'
export * from './reservations'

// Program types - selective export to avoid conflicts
export type {
  Program,
  ProgramInsert,
  ProgramUpdate,
  ProgramCategory,
  ProgramType,
  ProgramStatus,
  DifficultyLevel,
  EnhancedProgram,
  NotionContent,
  ProgramSchedule,
  ProgramFilters
} from './programs'

// Subscription types - selective export to avoid conflicts  
export type {
  SubscriptionPlan,
  UserSubscription,
  SubscriptionStatus,
  SubscriptionUsage,
  LearningPath,
  EnhancedSubscriptionPlan,
  LMSProgress,
  Course,
  Module,
  Achievement
} from './subscriptions'

// Admin types - selective export to avoid conflicts
export type {
  AdminDashboardStats,
  AdminUserFilters,
  AdminUserDetails,
  AdminProgramFilters,
  AdminProgramDetails,
  FinancialReports,
  SystemHealth,
  AuditLog,
  AdminPermission,
  ContentManagement,
  CommunicationStats
} from './admin'

// User journey types
export * from './user-journey'

// Notification types - avoiding conflicts
export type {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  EnhancedNotification,
  EmailTemplate,
  SMSTemplate,
  PushNotificationTemplate,
  NotificationPreferences
} from './notifications'

// Re-export commonly used types for convenience
export type {
  NicePayPaymentRequest,
  NicePayAuthResult,
  NicePayApprovalResponse,
  NicePayPaymentRecord,
  PaymentStatus,
  PaymentMethod,
  PaymentProvider
} from './nicepay'

export type {
  Reservation,
  Payment,
  ReservationStatus
} from './reservations'