/**
 * NicePay Integration Library
 * Server approval method implementation
 */

// NicePay API endpoints (Server approval method)
const NICEPAY_API_ENDPOINTS = {
  sandbox: 'https://sandbox-api.nicepay.co.kr/v1/payments',
  production: 'https://api.nicepay.co.kr/v1/payments'
}

// NicePay JS SDK URLs  
const NICEPAY_JS_SDK_URLS = {
  sandbox: 'https://pay.nicepay.co.kr/v1/js/',
  production: 'https://pay.nicepay.co.kr/v1/js/'
}

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production'

const API_BASE_URL = NICEPAY_API_ENDPOINTS.production

// NicePay credentials - only used on server side
function getCredentials() {
  const CLIENT_ID = process.env.NICEPAY_ACCESS_CLIENT
  const ACCESS_TOKEN = process.env.NICEPAY_ACCESS_SECRET // This is actually the access token for server approval

  if (!CLIENT_ID || !ACCESS_TOKEN) {
    throw new Error('NicePay credentials not configured. Please set NICEPAY_ACCESS_CLIENT and NICEPAY_ACCESS_SECRET environment variables.')
  }

  return { CLIENT_ID, ACCESS_TOKEN }
}

// Types for NicePay integration
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

export interface NicePayApprovalRequest {
  amount: number
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

/**
 * Generate Authorization header for NicePay API (Server approval method)
 */
function generateAuthHeader(): string {
  const { CLIENT_ID, ACCESS_TOKEN } = getCredentials()
  // NicePay Server 승인에서는 Basic Auth를 사용
  const credentials = `${CLIENT_ID}:${ACCESS_TOKEN}`
  const encoded = Buffer.from(credentials).toString('base64')
  return `Basic ${encoded}`
}

/**
 * Generate unique order ID
 */
export function generateOrderId(userId: string, programId: string): string {
  const timestamp = Date.now()
  const userIdShort = userId.slice(0, 8)
  const programIdShort = programId.slice(0, 8)
  return `ORDER_${timestamp}_${userIdShort}_${programIdShort}`
}

/**
 * Get NicePay JS SDK URL
 */
export function getNicePayJsSDKUrl(): string {
  return isProduction ? NICEPAY_JS_SDK_URLS.production : NICEPAY_JS_SDK_URLS.sandbox
}

/**
 * Get NicePay client ID (safe for client-side use)
 */
export function getNicePayClientId(): string {
  const { CLIENT_ID } = getCredentials()
  return CLIENT_ID
}

/**
 * Process payment approval (server-side)
 * Called after receiving auth result from NicePay
 */
export async function processPaymentApproval(
  tid: string,
  amount: number
): Promise<{
  success: boolean
  data?: NicePayApprovalResponse
  error?: string
}> {
  try {
    // NicePay 공식 승인 API 호출 (cURL reference 기준)
    const requestUrl = `${API_BASE_URL}/${tid}`
    const requestBody = { amount: amount }
    
    console.log('NicePay approval request:', {
      url: requestUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': generateAuthHeader()
      },
      body: requestBody
    })

    // JSON 방식으로 POST 요청 (공식 문서 기준)
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': generateAuthHeader()
      },
      body: JSON.stringify(requestBody)
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('NicePay API error:', errorText)
      return {
        success: false,
        error: `결제 승인 실패: ${response.status} ${response.statusText}`
      }
    }

    const data: NicePayApprovalResponse = await response.json()
    
    // Check if payment was successful
    if (data.resultCode === '0000') {
      return {
        success: true,
        data: data
      }
    } else {
      return {
        success: false,
        error: data.resultMsg || '결제 승인에 실패했습니다.'
      }
    }
  } catch (error) {
    console.error('Payment approval error:', error)
    return {
      success: false,
      error: '결제 승인 처리 중 오류가 발생했습니다.'
    }
  }
}

/**
 * Cancel payment (server-side)
 */
export async function cancelPayment(
  tid: string,
  amount: number,
  reason: string,
  orderId: string
): Promise<{
  success: boolean
  data?: any
  error?: string
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/${tid}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': generateAuthHeader()
      },
      body: JSON.stringify({
        amount: amount,
        reason: reason,
        orderId: orderId
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('NicePay cancel error:', errorText)
      return {
        success: false,
        error: `결제 취소 실패: ${response.status} ${response.statusText}`
      }
    }

    const data = await response.json()
    
    // Check if cancellation was successful
    if (data.resultCode === '0000') {
      return {
        success: true,
        data: data
      }
    } else {
      return {
        success: false,
        error: data.resultMsg || '결제 취소에 실패했습니다.'
      }
    }
  } catch (error) {
    console.error('Payment cancellation error:', error)
    return {
      success: false,
      error: '결제 취소 처리 중 오류가 발생했습니다.'
    }
  }
}

/**
 * Verify payment signature (optional security check)
 */
export function verifyPaymentSignature(authResult: NicePayAuthResult): boolean {
  // Implementation would depend on NicePay's signature verification algorithm
  // For now, we'll do basic validation
  return authResult.authResultCode === '0000'
}

/**
 * Get payment status by TID
 */
export async function getPaymentStatus(tid: string): Promise<{
  success: boolean
  data?: any
  error?: string
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/${tid}`, {
      method: 'GET',
      headers: {
        'Authorization': generateAuthHeader()
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('NicePay status error:', errorText)
      return {
        success: false,
        error: `결제 상태 조회 실패: ${response.status} ${response.statusText}`
      }
    }

    const data = await response.json()
    
    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('Payment status error:', error)
    return {
      success: false,
      error: '결제 상태 조회 중 오류가 발생했습니다.'
    }
  }
}

/**
 * Format amount for display
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount)
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(amount: number): boolean {
  return amount > 0 && amount <= 50000000 // Max 50M KRW
}

/**
 * Generate client-side payment configuration
 */
export function generatePaymentConfig(paymentData: NicePayPaymentRequest) {
  const { CLIENT_ID } = getCredentials()
  return {
    clientId: CLIENT_ID,
    method: 'card',
    orderId: paymentData.orderId,
    amount: paymentData.amount,
    goodsName: paymentData.goodsName,
    buyerName: paymentData.customerName,
    buyerEmail: paymentData.customerEmail,
    buyerTel: paymentData.customerMobilePhone,
    returnUrl: paymentData.returnUrl,
    mallReserved: paymentData.mallReserved
  }
}

export default {
  generateOrderId,
  getNicePayJsSDKUrl,
  getNicePayClientId,
  processPaymentApproval,
  cancelPayment,
  verifyPaymentSignature,
  getPaymentStatus,
  formatAmount,
  validatePaymentAmount,
  generatePaymentConfig
}