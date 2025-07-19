// Admin system types
export interface AdminDashboardStats {
  overview: {
    total_users: number
    active_subscriptions: number
    total_revenue: number
    program_enrollments: number
    growth_rate: number
  }
  programs: {
    total_programs: number
    active_programs: number
    avg_enrollment_rate: number
    top_performing_programs: ProgramPerformance[]
  }
  subscriptions: {
    total_subscribers: number
    churn_rate: number
    mrr: number // Monthly Recurring Revenue
    arr: number // Annual Recurring Revenue
    plan_distribution: PlanDistribution[]
  }
  financial: {
    monthly_revenue: number
    quarterly_revenue: number
    annual_revenue: number
    refund_rate: number
    revenue_by_source: RevenueSource[]
  }
}

export interface ProgramPerformance {
  program_id: string
  title: string
  enrollment_count: number
  completion_rate: number
  satisfaction_score: number
  revenue: number
  capacity_utilization: number
}

export interface PlanDistribution {
  plan_name: string
  subscriber_count: number
  percentage: number
  mrr_contribution: number
}

export interface RevenueSource {
  source: 'programs' | 'subscriptions' | 'refunds'
  amount: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
}

// User management
export interface AdminUserFilters {
  status?: 'active' | 'inactive' | 'suspended'
  subscription_plan?: string
  registration_date_range?: {
    start: string
    end: string
  }
  activity_level?: 'high' | 'medium' | 'low'
  search?: string
}

export interface AdminUserDetails {
  id: string
  email: string
  full_name: string
  phone?: string
  registration_date: string
  last_login: string
  status: 'active' | 'inactive' | 'suspended'
  subscription: {
    plan: string
    status: string
    start_date: string
    end_date: string
    auto_renew: boolean
  }
  program_history: ProgramHistory[]
  payment_history: PaymentHistory[]
  support_tickets: SupportTicket[]
  activity_summary: UserActivitySummary
}

export interface ProgramHistory {
  program_id: string
  program_title: string
  enrollment_date: string
  completion_date?: string
  status: string
  amount_paid: number
  refund_amount?: number
}

export interface PaymentHistory {
  payment_id: string
  amount: number
  date: string
  method: string
  status: string
  description: string
  refund_amount?: number
}

export interface SupportTicket {
  id: string
  subject: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_date: string
  last_update: string
  assigned_to?: string
}

export interface UserActivitySummary {
  total_logins: number
  avg_session_duration: number
  last_activity: string
  engagement_score: number
  programs_completed: number
  subscription_length: number // months
  support_tickets_count: number
}

// Program management
export interface AdminProgramFilters {
  status?: 'open' | 'full' | 'cancelled' | 'completed'
  category?: string
  instructor?: string
  date_range?: {
    start: string
    end: string
  }
  enrollment_status?: 'underbooked' | 'normal' | 'overbooked'
}

export interface AdminProgramDetails {
  id: string
  title: string
  category: string
  instructor: string
  status: string
  is_active: boolean
  enrollment: {
    current: number
    maximum: number
    minimum: number
    utilization_rate: number
  }
  schedule: {
    start_date: string
    end_date: string
    duration_hours: number
    location: string
  }
  pricing: {
    base_price: number
    early_bird_price?: number
    early_bird_deadline?: string
    total_revenue: number
  }
  participants: ProgramParticipant[]
  analytics: {
    completion_rate: number
    satisfaction_score: number
    referral_rate: number
    repeat_enrollment_rate: number
  }
}

export interface ProgramParticipant {
  id: string
  name: string
  email: string
  phone: string
  enrollment_date: string
  payment_status: string
  attendance_status: string
  completion_status: string
  satisfaction_rating?: number
  feedback?: string
}

// Financial management
export interface FinancialReports {
  revenue_report: RevenueReport
  refund_report: RefundReport
  subscription_report: SubscriptionReport
  tax_report: TaxReport
}

export interface RevenueReport {
  period: string
  total_revenue: number
  program_revenue: number
  subscription_revenue: number
  breakdown_by_month: MonthlyRevenue[]
  breakdown_by_program: ProgramRevenue[]
  breakdown_by_plan: PlanRevenue[]
}

export interface MonthlyRevenue {
  month: string
  revenue: number
  growth_rate: number
  program_count: number
  new_subscribers: number
}

export interface ProgramRevenue {
  program_id: string
  program_title: string
  revenue: number
  participant_count: number
  average_revenue_per_participant: number
}

export interface PlanRevenue {
  plan_name: string
  subscriber_count: number
  monthly_revenue: number
  annual_revenue: number
}

export interface RefundReport {
  period: string
  total_refunds: number
  refund_rate: number
  reasons: RefundReason[]
  by_program: ProgramRefund[]
  trend: RefundTrend[]
}

export interface RefundReason {
  reason: string
  count: number
  percentage: number
  average_amount: number
}

export interface ProgramRefund {
  program_id: string
  program_title: string
  refund_count: number
  refund_amount: number
  refund_rate: number
}

export interface RefundTrend {
  month: string
  refund_count: number
  refund_amount: number
  refund_rate: number
}

export interface SubscriptionReport {
  period: string
  new_subscriptions: number
  cancelled_subscriptions: number
  churn_rate: number
  ltv: number // Lifetime Value
  cac: number // Customer Acquisition Cost
  by_plan: PlanMetrics[]
}

export interface PlanMetrics {
  plan_name: string
  new_subscribers: number
  cancelled_subscribers: number
  churn_rate: number
  average_lifespan: number
  ltv: number
}

export interface TaxReport {
  period: string
  total_taxable_amount: number
  tax_collected: number
  tax_rate: number
  by_jurisdiction: JurisdictionTax[]
}

export interface JurisdictionTax {
  jurisdiction: string
  taxable_amount: number
  tax_collected: number
  tax_rate: number
}

// System management
export interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'critical'
    connection_count: number
    query_performance: number
    storage_usage: number
  }
  api: {
    status: 'healthy' | 'warning' | 'critical'
    response_time: number
    error_rate: number
    throughput: number
  }
  payment_system: {
    status: 'healthy' | 'warning' | 'critical'
    success_rate: number
    average_processing_time: number
    failed_transactions: number
  }
  notification_system: {
    status: 'healthy' | 'warning' | 'critical'
    delivery_rate: number
    bounce_rate: number
    queue_size: number
  }
}

export interface AuditLog {
  id: string
  user_id: string
  user_email: string
  action: string
  resource_type: string
  resource_id: string
  details: Record<string, any>
  ip_address: string
  user_agent: string
  timestamp: string
}

export interface AdminPermission {
  id: string
  user_id: string
  permission_type: 'full_admin' | 'program_manager' | 'customer_support' | 'financial_admin'
  granted_by: string
  granted_date: string
  expires_date?: string
  is_active: boolean
}

// Content management
export interface ContentManagement {
  programs: {
    total_count: number
    draft_count: number
    published_count: number
    archived_count: number
  }
  pages: {
    landing_pages: number
    blog_posts: number
    documentation: number
  }
  media: {
    images: number
    videos: number
    documents: number
    total_storage_used: number
  }
}

// Communication management
export interface CommunicationStats {
  email_campaigns: {
    sent: number
    delivered: number
    opened: number
    clicked: number
    bounced: number
    unsubscribed: number
  }
  notifications: {
    push_notifications: number
    in_app_notifications: number
    sms_notifications: number
    delivery_rate: number
  }
  support: {
    total_tickets: number
    open_tickets: number
    average_response_time: number
    satisfaction_rating: number
  }
}