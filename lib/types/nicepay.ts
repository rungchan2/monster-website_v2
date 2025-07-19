/**
 * NicePay Integration Types
 * Updated types for NicePay payment system integration
 */

// Core NicePay payment types (re-export from nicepay.ts for consistency)
export interface NicePayPaymentRequest {
  orderId: string
  amount: number
  goodsName: string
  customerName: string
  customerEmail: string
  customerMobilePhone?: string
  returnUrl: string
  cancelUrl?: string
  mallReserved?: string
}

export interface NicePayAuthResult {
  authResultCode: string
  authResultMsg: string
  tid: string
  clientId: string
  orderId: string
  amount: string
  mallReserved: string
  authToken: string
  signature: string
}

export interface NicePayApprovalResponse {
  resultCode: string
  resultMsg: string
  tid: string
  cancelledTid: string | null
  orderId: string
  ediDate: string
  signature: string
  status: string
  paidAt: string
  failedAt: string
  cancelledAt: string
  payMethod: string
  amount: number
  balanceAmt: number
  goodsName: string
  mallReserved: string | null
  useEscrow: boolean
  currency: string
  channel: string
  approveNo: string
  buyerName: string | null
  buyerTel: string | null
  buyerEmail: string | null
  receiptUrl: string
  mallUserId: string | null
  issuedCashReceipt: boolean
  coupon: any
  card?: {
    cardCode: string
    cardName: string
    cardNum: string
    cardQuota: number
    isInterestFree: boolean
    cardType: string
    canPartCancel: boolean
    acquCardCode: string
    acquCardName: string
  }
  vbank?: any
  cancels?: any
  cashReceipts?: any
}

// Enhanced Payment types for NicePay
export interface NicePayPaymentRecord {
  id: string
  order_id: string
  participant_id: string | null
  user_id: string | null
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  payment_method: 'card' | 'vbank' | 'simple'
  payment_key: string | null // NicePay TID
  approved_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  raw_data: any // NicePay response data
  webhook_received_at: string | null
  webhook_data: any
  created_at: string
}

// Enhanced Refund types for NicePay
export interface NicePayRefundRecord {
  id: string
  payment_id: string
  user_id: string | null
  amount: number
  reason: string | null
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  processed_at: string | null
  processed_by: string | null
  raw_data: any // NicePay refund response data
  created_at: string
}

// Payment method types
export type PaymentMethod = 'card' | 'vbank' | 'simple'
export type PaymentProvider = 'nicepay' | 'toss' // Support both providers during migration

// Payment status mapping
export const PAYMENT_STATUS_MAP = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const

export type PaymentStatus = typeof PAYMENT_STATUS_MAP[keyof typeof PAYMENT_STATUS_MAP]

// NicePay specific configuration
export interface NicePayConfig {
  clientId: string
  secretKey: string
  apiUrl: string
  jsSDKUrl: string
  environment: 'sandbox' | 'production'
}

// API Response types
export interface NicePayApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
}

// Payment webhook types
export interface NicePayWebhookData {
  resultCode: string
  resultMsg: string
  tid: string
  orderId: string
  amount: number
  status: string
  payMethod: string
  paidAt?: string
  failedAt?: string
  cancelledAt?: string
  signature?: string
}

// Error types
export interface NicePayError {
  code: string
  message: string
  details?: any
}

// Form data types for booking
export interface NicePayBookingFormData {
  // Program information
  programId: string
  programTitle: string
  
  // Participant information
  participantName: string
  participantEmail: string
  participantPhone: string
  emergencyContact: string
  dietaryRestrictions?: string
  specialRequests?: string
  
  // Payment information
  amount: number
  paymentMethod: PaymentMethod
  
  // Terms
  agreedToTerms: boolean
  agreedToPrivacy: boolean
}

// Analytics types for payment tracking
export interface PaymentAnalytics {
  totalRevenue: number
  totalTransactions: number
  successRate: number
  averageTransactionAmount: number
  paymentMethodBreakdown: {
    card: number
    vbank: number
    simple: number
  }
  monthlyRevenue: Array<{
    month: string
    revenue: number
    transactions: number
  }>
}

// Utilities
export interface PaymentUtils {
  formatAmount: (amount: number) => string
  generateOrderId: (userId: string, programId: string) => string
  validatePaymentAmount: (amount: number) => boolean
  mapPaymentStatus: (nicePayStatus: string) => PaymentStatus
}

// Types are exported individually above