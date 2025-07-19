import { Database } from '@/types/database'
import { NicePayPaymentRecord, PaymentStatus, PaymentMethod } from './nicepay'

// Core reservation types
export type Reservation = Database['public']['Tables']['program_participants']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']

// Enhanced payment type with NicePay support
export interface EnhancedPayment extends Omit<Payment, 'toss_payment_data' | 'status' | 'payment_method'> {
  status: PaymentStatus
  payment_method: PaymentMethod
  payment_provider: 'nicepay' | 'toss'
  raw_data: any // NicePay or TossPayments response data
  approved_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  webhook_received_at: string | null
  webhook_data: any
}

// Enhanced reservation types
export interface EnhancedReservation extends Reservation {
  program?: {
    title: string
    start_date: string
    end_date: string
    location: string
    instructor_name: string
  }
  payment?: EnhancedPayment
}

export type ReservationStatus = 'registered' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
// PaymentStatus is now imported from nicepay.ts

// Reservation form data
export interface ReservationFormData {
  // Program selection
  program_id: string
  session_id?: string
  
  // Participant information
  participant_name: string
  participant_email: string
  participant_phone: string
  emergency_contact?: string
  dietary_restrictions?: string
  special_requests?: string
  
  // Payment information
  payment_method: PaymentMethod
  installment_months?: number
  coupon_code?: string
  
  // Terms and conditions
  terms_agreed: boolean
  privacy_agreed: boolean
  marketing_agreed?: boolean
}


// Note: Coupon system removed as coupons table is not defined in the current database schema

export interface DiscountCalculation {
  original_amount: number
  discount_amount: number
  final_amount: number
  coupon_applied?: any
  early_bird_discount?: number
  loyalty_discount?: number
}

// Notification preferences
export interface NotificationPreferences {
  email_confirmation: boolean
  sms_reminder: boolean
  push_notifications: boolean
  marketing_emails: boolean
  program_updates: boolean
  payment_notifications: boolean
}

// Note: Waitlist management removed as waitlist table is not defined in the current database schema

// Refund management
export interface RefundRequest {
  id: string
  payment_id: string
  user_id: string
  amount: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  processed_by?: string
  processed_at?: string
  refund_method: 'original' | 'account_transfer'
  bank_account?: {
    bank_code: string
    account_number: string
    holder_name: string
  }
  payment_provider: 'nicepay' | 'toss'
  raw_data?: any // NicePay or TossPayments refund response data
  created_at: string
}

// Analytics for reservations
export interface ReservationAnalytics {
  total_reservations: number
  confirmed_reservations: number
  cancellation_rate: number
  average_booking_lead_time: number
  popular_time_slots: Array<{
    day: string
    time: string
    booking_count: number
  }>
  revenue_by_program: Array<{
    program_id: string
    program_name: string
    revenue: number
    participant_count: number
  }>
  conversion_funnel: {
    page_views: number
    program_details_views: number
    reservation_started: number
    payment_attempted: number
    payment_completed: number
  }
}