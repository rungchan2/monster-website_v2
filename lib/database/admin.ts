import { createClient } from '@/lib/supabase/client'
import { 
  AdminDashboardStats,
  AdminUserFilters,
  AdminUserDetails,
  AdminProgramFilters,
  AdminProgramDetails,
  FinancialReports,
  SystemHealth,
  AuditLog,
  CommunicationStats
} from '@/lib/types/admin'

// ================================
// DASHBOARD ANALYTICS
// ================================

/**
 * Get admin dashboard statistics
 * @returns Dashboard statistics
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = createClient()
  
  try {
    // Fetch basic stats in parallel
    const [usersData, subscriptionsData, programsData, paymentsData] = await Promise.all([
      supabase.from('profiles').select('id, created_at').eq('is_admin', false),
      supabase.from('user_subscriptions').select('id, status, plan_id, created_at'),
      supabase.from('programs').select('id, status, current_participants'),
      supabase.from('payments').select('amount, status, created_at')
    ])

    // Calculate overview stats
    const totalUsers = usersData.data?.length || 0
    const activeSubscriptions = subscriptionsData.data?.filter(s => s.status === 'active').length || 0
    const totalRevenue = paymentsData.data?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0
    const programEnrollments = programsData.data?.reduce((sum, p) => sum + (p.current_participants || 0), 0) || 0

    // Calculate growth rate (simplified - last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    
    const recentUsers = usersData.data?.filter(u => u.created_at && u.created_at > thirtyDaysAgo).length || 0
    const previousUsers = usersData.data?.filter(u => u.created_at && u.created_at > sixtyDaysAgo && u.created_at <= thirtyDaysAgo).length || 0
    const growthRate = previousUsers > 0 ? ((recentUsers - previousUsers) / previousUsers) * 100 : 0

    // Program stats
    const totalPrograms = programsData.data?.length || 0
    const activePrograms = programsData.data?.filter(p => p.status === 'open').length || 0
    const avgEnrollmentRate = totalPrograms > 0 ? programEnrollments / totalPrograms : 0

    // Subscription stats
    const churnRate = 0.05 // TODO: Calculate actual churn rate
    const mrr = activeSubscriptions * 50000 // Estimated MRR
    const arr = mrr * 12

    return {
      overview: {
        total_users: totalUsers,
        active_subscriptions: activeSubscriptions,
        total_revenue: totalRevenue,
        program_enrollments: programEnrollments,
        growth_rate: growthRate
      },
      programs: {
        total_programs: totalPrograms,
        active_programs: activePrograms,
        avg_enrollment_rate: avgEnrollmentRate,
        top_performing_programs: [] // TODO: Calculate top performers
      },
      subscriptions: {
        total_subscribers: activeSubscriptions,
        churn_rate: churnRate,
        mrr: mrr,
        arr: arr,
        plan_distribution: [] // TODO: Calculate plan distribution
      },
      financial: {
        monthly_revenue: totalRevenue,
        quarterly_revenue: totalRevenue * 3,
        annual_revenue: totalRevenue * 12,
        refund_rate: 0.02,
        revenue_by_source: [
          { source: 'programs', amount: totalRevenue * 0.7, percentage: 70, trend: 'up' },
          { source: 'subscriptions', amount: totalRevenue * 0.3, percentage: 30, trend: 'up' },
          { source: 'refunds', amount: totalRevenue * -0.02, percentage: -2, trend: 'stable' }
        ]
      }
    }
  } catch (error) {
    console.error('Error getting admin dashboard stats:', error)
    // Return default stats
    return {
      overview: { total_users: 0, active_subscriptions: 0, total_revenue: 0, program_enrollments: 0, growth_rate: 0 },
      programs: { total_programs: 0, active_programs: 0, avg_enrollment_rate: 0, top_performing_programs: [] },
      subscriptions: { total_subscribers: 0, churn_rate: 0, mrr: 0, arr: 0, plan_distribution: [] },
      financial: { monthly_revenue: 0, quarterly_revenue: 0, annual_revenue: 0, refund_rate: 0, revenue_by_source: [] }
    }
  }
}

// ================================
// USER MANAGEMENT
// ================================

/**
 * Get users with admin filters
 * @param filters - Admin user filters
 * @returns Filtered users list
 */
export async function getAdminUsers(filters?: AdminUserFilters): Promise<AdminUserDetails[]> {
  const supabase = createClient()
  
  try {
    let query = supabase
      .from('profiles')
      .select(`
        *,
        subscription:user_subscriptions(
          *,
          plan:subscription_plans(name, slug)
        ),
        program_history:program_participants(
          *,
          program:programs(title)
        ),
        payments:payments(*)
      `)
      .eq('is_admin', false)

    // Apply filters
    if (filters?.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }

    if (filters?.registration_date_range) {
      query = query
        .gte('created_at', filters.registration_date_range.start)
        .lte('created_at', filters.registration_date_range.end)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching admin users:', error)
      return []
    }

    // Transform data to AdminUserDetails format
    return data.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name || 'Unknown',
      phone: user.phone || '',
      registration_date: user.created_at || '',
      last_login: user.updated_at || '', // Approximation
      status: 'active', // TODO: Implement user status tracking
      subscription: {
        plan: user.subscription?.[0]?.plan?.name || 'None',
        status: user.subscription?.[0]?.status || 'None',
        start_date: user.subscription?.[0]?.created_at || '',
        end_date: user.subscription?.[0]?.current_period_end || '',
        auto_renew: !user.subscription?.[0]?.cancel_at_period_end
      },
      program_history: user.program_history?.map((ph: any) => ({
        program_id: ph.program_id,
        program_title: ph.program?.title || 'Unknown',
        enrollment_date: ph.created_at,
        completion_date: ph.status === 'completed' ? ph.updated_at : undefined,
        status: ph.status,
        amount_paid: ph.amount_paid,
        refund_amount: undefined // TODO: Get refund data
      })) || [],
      payment_history: user.payments?.map((p: any) => ({
        payment_id: p.id,
        amount: p.amount,
        date: p.created_at,
        method: p.payment_method || 'Unknown',
        status: p.status,
        description: 'Program payment',
        refund_amount: undefined
      })) || [],
      support_tickets: [], // TODO: Implement support ticket system
      activity_summary: {
        total_logins: 0, // TODO: Impl  ement login tracking
        avg_session_duration: 0,
        last_activity: user.updated_at || '',
        engagement_score: 0,
        programs_completed: user.program_history?.filter((ph: any) => ph.status === 'completed').length || 0,
        subscription_length: 0, // TODO: Calculate subscription length
        support_tickets_count: 0
      }
    }))
  } catch (error) {
    console.error('Error in getAdminUsers:', error)
    return []
  }
}

/**
 * Update user status (admin action)
 * @param userId - User ID
 * @param status - New status
 * @param adminId - Admin user ID
 * @returns Update result
 */
export async function updateUserStatus(
  userId: string,
  status: 'active' | 'inactive' | 'suspended',
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  try {
    // Log admin action to notifications table
    await supabase
      .from('notifications')
      .insert({
        type: 'general',
        user_id: userId,
        title: 'User Status Updated',
        message: `User ${userId} status updated to ${status} by admin ${adminId}`,
        action_url: `/admin/users/${userId}`,
        is_read: false
      })

    // TODO: Implement user status field in profiles table
    // For now, we'll just log the action

    return { success: true }
  } catch (error) {
    console.error('Error updating user status:', error)
    return { success: false, error: '사용자 상태 업데이트에 실패했습니다.' }
  }
}

// ================================
// PROGRAM MANAGEMENT
// ================================

/**
 * Get programs with admin filters
 * @param filters - Admin program filters
 * @returns Filtered programs list
 */
export async function getAdminPrograms(filters?: AdminProgramFilters): Promise<AdminProgramDetails[]> {
  const supabase = createClient()
  
  try {
    let query = supabase
      .from('programs')
      .select(`
        *,
        category:program_categories(name),
        participants:program_participants(
          *,
          payment:payments(status, amount)
        )
      `)

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.category) {
      query = query.eq('category_id', filters.category)
    }

    if (filters?.date_range) {
      query = query
        .gte('start_date', filters.date_range.start)
        .lte('start_date', filters.date_range.end)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching admin programs:', error)
      return []
    }

    // Transform to AdminProgramDetails format
    return data.map(program => {
      const participants = program.participants || []
      const completedParticipants = participants.filter((p: any) => p.status === 'completed')
      const totalRevenue = participants.reduce((sum: number, p: any) => sum + (Number(p.amount_paid) || 0), 0)

      return {
        id: program.id,
        title: program.title,
        category: program.category?.name || 'Uncategorized',
        instructor: program.instructor_name || 'TBD',
        status: program.status || '',
        is_active: program.is_active || false,
        enrollment: {
          current: program.current_participants || 0,
          maximum: program.max_participants || 0,
          minimum: program.min_participants || 0,
          utilization_rate: program.max_participants && program.max_participants > 0 ? 
            (program.current_participants || 0) / program.max_participants : 0
        },
        schedule: {
          start_date: program.start_date || '',
          end_date: program.end_date || '',
          duration_hours: program.duration_hours || 0,
          location: program.location || 'TBD'
        },
        pricing: {
          base_price: Number(program.base_price) || 0,
          early_bird_price: Number(program.early_bird_price) || undefined,
          early_bird_deadline: program.early_bird_deadline || undefined,
          total_revenue: totalRevenue
        },
        participants: participants.map((p: any) => ({
          id: p.id,
          name: p.participant_name,
          email: p.participant_email,
          phone: p.participant_phone || '',
          enrollment_date: p.created_at,
          payment_status: p.payment_status,
          attendance_status: p.attendance_status,
          completion_status: p.status,
          satisfaction_rating: undefined, // TODO: Implement rating system
          feedback: undefined
        })),
        analytics: {
          completion_rate: participants.length > 0 ? completedParticipants.length / participants.length : 0,
          satisfaction_score: 4.5, // TODO: Calculate from actual ratings
          referral_rate: 0.15, // TODO: Implement referral tracking
          repeat_enrollment_rate: 0.25 // TODO: Calculate repeat enrollments
        }
      }
    })
  } catch (error) {
    console.error('Error in getAdminPrograms:', error)
    return []
  }
}

// ================================
// FINANCIAL REPORTING
// ================================

/**
 * Get financial reports
 * @param period - Report period
 * @returns Financial reports
 */
export async function getFinancialReports(period: string = 'monthly'): Promise<FinancialReports> {
  const supabase = createClient()
  
  try {
    // Get payment data
    const { data: payments } = await supabase
      .from('payments')
      .select(`
        *,
        participant:program_participants(
          program:programs(title)
        ),
        subscription:user_subscriptions(
          plan:subscription_plans(name)
        )
      `)
      .order('created_at', { ascending: false })

    // Get refund data
    const { data: refunds } = await supabase
      .from('refunds')
      .select('*')
      .order('created_at', { ascending: false })

    const totalRevenue = payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0
    const programRevenue = payments?.filter(p => p.participant_id)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0
    const subscriptionRevenue = payments?.filter(p => p.subscription_id)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0

    const totalRefunds = refunds?.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0
    const refundRate = totalRevenue > 0 ? totalRefunds / totalRevenue : 0

    return {
      revenue_report: {
        period,
        total_revenue: totalRevenue,
        program_revenue: programRevenue,
        subscription_revenue: subscriptionRevenue,
        breakdown_by_month: [], // TODO: Implement monthly breakdown
        breakdown_by_program: [], // TODO: Implement program breakdown
        breakdown_by_plan: [] // TODO: Implement plan breakdown
      },
      refund_report: {
        period,
        total_refunds: totalRefunds,
        refund_rate: refundRate,
        reasons: [], // TODO: Implement refund reason tracking
        by_program: [], // TODO: Implement program refund breakdown
        trend: [] // TODO: Implement refund trend analysis
      },
      subscription_report: {
        period,
        new_subscriptions: 0, // TODO: Calculate new subscriptions
        cancelled_subscriptions: 0, // TODO: Calculate cancellations
        churn_rate: 0.05, // TODO: Calculate actual churn rate
        ltv: 0, // TODO: Calculate lifetime value
        cac: 0, // TODO: Calculate customer acquisition cost
        by_plan: [] // TODO: Implement plan metrics
      },
      tax_report: {
        period,
        total_taxable_amount: totalRevenue,
        tax_collected: totalRevenue * 0.1, // 10% tax rate approximation
        tax_rate: 0.1,
        by_jurisdiction: [] // TODO: Implement jurisdiction breakdown
      }
    }
  } catch (error) {
    console.error('Error getting financial reports:', error)
    return {
      revenue_report: { period, total_revenue: 0, program_revenue: 0, subscription_revenue: 0, breakdown_by_month: [], breakdown_by_program: [], breakdown_by_plan: [] },
      refund_report: { period, total_refunds: 0, refund_rate: 0, reasons: [], by_program: [], trend: [] },
      subscription_report: { period, new_subscriptions: 0, cancelled_subscriptions: 0, churn_rate: 0, ltv: 0, cac: 0, by_plan: [] },
      tax_report: { period, total_taxable_amount: 0, tax_collected: 0, tax_rate: 0, by_jurisdiction: [] }
    }
  }
}

// ================================
// SYSTEM MONITORING
// ================================

/**
 * Get system health status
 * @returns System health metrics
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const supabase = createClient()
  
  try {
    // Check database health
    const { data: dbTest, error: dbError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)

    // Check recent payments for payment system health
    const { data: recentPayments } = await supabase
      .from('payments')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const totalPayments = recentPayments?.length || 0
    const successfulPayments = recentPayments?.filter(p => p.status === 'completed').length || 0
    const paymentSuccessRate = totalPayments > 0 ? successfulPayments / totalPayments : 1

    return {
      database: {
        status: dbError ? 'critical' : 'healthy',
        connection_count: 10, // Mock data
        query_performance: 95, // Mock data
        storage_usage: 45 // Mock data
      },
      api: {
        status: 'healthy',
        response_time: 120, // Mock data
        error_rate: 0.02, // Mock data
        throughput: 1500 // Mock data
      },
      payment_system: {
        status: paymentSuccessRate > 0.95 ? 'healthy' : paymentSuccessRate > 0.9 ? 'warning' : 'critical',
        success_rate: paymentSuccessRate,
        average_processing_time: 3.2, // Mock data
        failed_transactions: totalPayments - successfulPayments
      },
      notification_system: {
        status: 'healthy',
        delivery_rate: 0.98, // Mock data
        bounce_rate: 0.02, // Mock data
        queue_size: 5 // Mock data
      }
    }
  } catch (error) {
    console.error('Error getting system health:', error)
    return {
      database: { status: 'critical', connection_count: 0, query_performance: 0, storage_usage: 0 },
      api: { status: 'critical', response_time: 0, error_rate: 1, throughput: 0 },
      payment_system: { status: 'critical', success_rate: 0, average_processing_time: 0, failed_transactions: 0 },
      notification_system: { status: 'critical', delivery_rate: 0, bounce_rate: 1, queue_size: 0 }
    }
  }
}

// ================================
// COMMUNICATION STATS
// ================================

/**
 * Get communication statistics
 * @returns Communication stats
 */
export async function getCommunicationStats(): Promise<CommunicationStats> {
  const supabase = createClient()
  
  try {
    // Get notification data
    const { data: notifications } = await supabase
      .from('notifications')
      .select('type, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const totalNotifications = notifications?.length || 0

    return {
      email_campaigns: {
        sent: totalNotifications,
        delivered: Math.floor(totalNotifications * 0.98),
        opened: Math.floor(totalNotifications * 0.25),
        clicked: Math.floor(totalNotifications * 0.05),
        bounced: Math.floor(totalNotifications * 0.02),
        unsubscribed: Math.floor(totalNotifications * 0.01)
      },
      notifications: {
        push_notifications: Math.floor(totalNotifications * 0.3),
        in_app_notifications: Math.floor(totalNotifications * 0.5),
        sms_notifications: Math.floor(totalNotifications * 0.2),
        delivery_rate: 0.98
      },
      support: {
        total_tickets: 0, // TODO: Implement support ticket system
        open_tickets: 0,
        average_response_time: 0,
        satisfaction_rating: 4.5
      }
    }
  } catch (error) {
    console.error('Error getting communication stats:', error)
    return {
      email_campaigns: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 },
      notifications: { push_notifications: 0, in_app_notifications: 0, sms_notifications: 0, delivery_rate: 0 },
      support: { total_tickets: 0, open_tickets: 0, average_response_time: 0, satisfaction_rating: 0 }
    }
  }
}