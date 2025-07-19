import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth'
import { Database } from '@/types/database'
import { sendReservationConfirmation, sendCancellationConfirmation } from './notifications'

// Simplified types for compatibility
interface SimpleReservationData {
  program_id: string
  participant_name: string
  participant_email: string
  participant_phone: string
  emergency_contact: string
  dietary_restrictions?: string | null
  special_requests?: string | null
  amount_paid: number
}

export interface DatabaseResponse<T = any> {
  data: T | null
  error: string | null
}

// Types from the existing file
import { 
  ReservationFormData, 
  EnhancedReservation, 
  RefundRequest,
  ReservationAnalytics,
  DiscountCalculation
} from '@/lib/types/reservations'

// ================================
// SIMPLE RESERVATION FUNCTIONS (Compatibility)
// ================================

/**
 * Create a simple reservation
 * @param reservationData - Reservation data
 * @returns Created reservation
 */
export async function createReservation(reservationData: SimpleReservationData): Promise<DatabaseResponse> {
  const supabase = createClient()
  
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { data: null, error: '로그인이 필요합니다.' }
    }

    // Check program availability
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('max_participants, current_participants, status')
      .eq('id', reservationData.program_id)
      .single()

    if (programError || !program) {
      return { data: null, error: '프로그램을 찾을 수 없습니다.' }
    }

    if (program.status !== 'open') {
      return { data: null, error: '현재 예약할 수 없는 프로그램입니다.' }
    }

    if ((program.current_participants || 0) >= (program.max_participants || 0)) {
      return { data: null, error: '프로그램이 마감되었습니다.' }
    }

    // Check if user already has a reservation for this program
    const { data: existingReservation } = await supabase
      .from('program_participants')
      .select('id')
      .eq('user_id', user.id)
      .eq('program_id', reservationData.program_id)
      .neq('status', 'cancelled')
      .single()

    if (existingReservation) {
      return { data: null, error: '이미 이 프로그램에 신청하셨습니다.' }
    }

    // Create participant record
    const { data: participant, error: participantError } = await supabase
      .from('program_participants')
      .insert({
        user_id: user.id,
        program_id: reservationData.program_id,
        participant_name: reservationData.participant_name,
        participant_email: reservationData.participant_email,
        participant_phone: reservationData.participant_phone,
        emergency_contact: reservationData.emergency_contact,
        dietary_restrictions: reservationData.dietary_restrictions,
        special_requests: reservationData.special_requests,
        amount_paid: reservationData.amount_paid,
        status: 'registered',
        payment_status: 'pending'
      })
      .select()
      .single()

    if (participantError) {
      console.error('Error creating participant:', participantError)
      return { data: null, error: '예약 생성에 실패했습니다.' }
    }

    // Note: Payment record creation moved to post-payment processing
    // This function is now only used for direct reservations without payment

    // Send reservation confirmation notification
    try {
      await sendReservationConfirmation(participant.id)
    } catch (error) {
      console.error('Error sending reservation confirmation:', error)
      // Don't fail the reservation if notification fails
    }

    return { data: participant, error: null }
  } catch (error) {
    console.error('Error in createReservation:', error)
    return { data: null, error: '예약 처리 중 오류가 발생했습니다.' }
  }
}

// ================================
// RESERVATION MANAGEMENT
// ================================

/**
 * Create program reservation
 * @param reservationData - Reservation form data
 * @param userId - User ID
 * @returns Created reservation
 */
export async function createProgramReservation(
  reservationData: ReservationFormData,
  userId: string
): Promise<{ success: boolean; reservation?: any; error?: string }> {
  const supabase = createClient()
  
  try {
    // 1. Check program availability
    const { data: program } = await supabase
      .from('programs')
      .select('max_participants, current_participants, status, base_price, early_bird_price, early_bird_deadline')
      .eq('id', reservationData.program_id)
      .single()

    if (!program) {
      return { success: false, error: '프로그램을 찾을 수 없습니다.' }
    }

    if (program.status !== 'open') {
      return { success: false, error: '현재 예약할 수 없는 프로그램입니다.' }
    }

    if ((program.current_participants || 0) >= (program.max_participants || 0)) {
      return { 
        success: false, 
        error: '프로그램이 마감되었습니다.'
      }
    }

    // 2. Calculate final amount with discounts
    const discountCalculation = await calculateDiscounts(
      program.base_price || 0,
      program.early_bird_price || undefined,
      program.early_bird_deadline || undefined
    )

    // 3. Create participant record
    const { data: participant, error: participantError } = await supabase
      .from('program_participants')
      .insert({
        user_id: userId,
        program_id: reservationData.program_id,
        participant_name: reservationData.participant_name,
        participant_email: reservationData.participant_email,
        participant_phone: reservationData.participant_phone,
        emergency_contact: reservationData.emergency_contact,
        dietary_restrictions: reservationData.dietary_restrictions,
        special_requests: reservationData.special_requests,
        amount_paid: discountCalculation.final_amount,
        status: 'registered',
        payment_status: 'pending'
      })
      .select()
      .single()

    if (participantError) {
      console.error('Error creating participant:', participantError)
      return { success: false, error: '예약 생성에 실패했습니다.' }
    }

    // 4. Generate order ID for payment
    const orderId = `order_${Date.now()}_${userId.slice(0, 8)}`

    // 5. Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        participant_id: participant.id,
        order_id: orderId,
        amount: discountCalculation.final_amount,
        currency: 'KRW',
        payment_method: reservationData.payment_method,
        status: 'pending'
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment:', paymentError)
      // Rollback participant creation
      await supabase.from('program_participants').delete().eq('id', participant.id)
      return { success: false, error: '결제 정보 생성에 실패했습니다.' }
    }

    // 6. Program participant count updated automatically by trigger

    // 7. Send reservation confirmation notification
    try {
      await sendReservationConfirmation(participant.id)
    } catch (error) {
      console.error('Error sending reservation confirmation:', error)
      // Don't fail the reservation if notification fails
    }

    return {
      success: true,
      reservation: {
        participant,
        payment,
        orderId,
        discountCalculation
      }
    }
  } catch (error) {
    console.error('Error in createProgramReservation:', error)
    return { success: false, error: '예약 처리 중 오류가 발생했습니다.' }
  }
}

/**
 * Get user reservations
 * @param userId - User ID
 * @returns User's reservations with program details
 */
export async function getUserReservations(userId: string): Promise<EnhancedReservation[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('program_participants')
      .select(`
        *,
        program:programs(
          title,
          start_date,
          end_date,
          location,
          instructor_name,
          thumbnail_url
        ),
        payment:payments(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user reservations:', error)
      return []
    }

    return (data as any) || []
  } catch (error) {
    console.error('Error in getUserReservations:', error)
    return []
  }
}

/**
 * Cancel reservation
 * @param reservationId - Reservation ID
 * @param userId - User ID
 * @param reason - Cancellation reason
 * @returns Cancellation result
 */
export async function cancelReservation(
  reservationId: string,
  userId: string,
  reason: string
): Promise<{ success: boolean; refund?: RefundRequest; error?: string }> {
  const supabase = createClient()
  
  try {
    // 1. Get reservation details
    const { data: reservation } = await supabase
      .from('program_participants')
      .select(`
        *,
        program:programs(start_date, title),
        payment:payments(*)
      `)
      .eq('id', reservationId)
      .eq('user_id', userId)
      .single()

    if (!reservation) {
      return { success: false, error: '예약을 찾을 수 없습니다.' }
    }

    if (reservation.status === 'cancelled') {
      return { success: false, error: '이미 취소된 예약입니다.' }
    }

    // 2. Check cancellation policy
    const daysUntilStart = Math.ceil(
      (new Date((reservation.program as any)?.start_date || new Date()).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )

    const refundRate = getRefundRate(daysUntilStart)
    const refundAmount = reservation.amount_paid * refundRate

    // 3. Update reservation status
    const { error: updateError } = await supabase
      .from('program_participants')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', reservationId)

    if (updateError) {
      console.error('Error updating reservation:', updateError)
      return { success: false, error: '예약 취소에 실패했습니다.' }
    }

    // 4. Create refund request if applicable
    let refundRequest = null
    if (refundAmount > 0 && (reservation.payment as any)?.[0]?.status === 'completed') {
      const { data: refund } = await supabase
        .from('refunds')
        .insert({
          payment_id: (reservation.payment as any)?.[0]?.id,
          user_id: userId,
          amount: refundAmount,
          reason: reason,
          status: 'pending'
        })
        .select()
        .single()

      refundRequest = refund
    }

    // 5. Program participant count updated automatically by trigger

    // 6. Update program participant count (handled by trigger)

    // 7. Send cancellation confirmation notification
    try {
      await sendCancellationConfirmation(reservationId, reason)
    } catch (error) {
      console.error('Error sending cancellation confirmation:', error)
      // Don't fail the cancellation if notification fails
    }

    return {
      success: true,
      refund: refundRequest as any
    }
  } catch (error) {
    console.error('Error in cancelReservation:', error)
    return { success: false, error: '예약 취소 처리 중 오류가 발생했습니다.' }
  }
}

// ================================
// WAITLIST MANAGEMENT (REMOVED - TABLE NOT IN SCHEMA)
// ================================

// Note: Waitlist functionality has been removed as the waitlist table
// is not defined in the current database schema.

// ================================
// DISCOUNT AND COUPON SYSTEM
// ================================

/**
 * Calculate discounts for a reservation
 * @param basePrice - Base program price
 * @param earlyBirdPrice - Early bird price
 * @param earlyBirdDeadline - Early bird deadline
 * @returns Discount calculation
 */
export async function calculateDiscounts(
  basePrice: number,
  earlyBirdPrice?: number,
  earlyBirdDeadline?: string
): Promise<DiscountCalculation> {
  let finalPrice = basePrice
  let totalDiscount = 0
  let earlyBirdDiscount = 0

  // Check early bird discount
  if (earlyBirdPrice && earlyBirdDeadline) {
    const now = new Date()
    const deadline = new Date(earlyBirdDeadline)
    
    if (now < deadline) {
      earlyBirdDiscount = basePrice - earlyBirdPrice
      finalPrice = earlyBirdPrice
      totalDiscount += earlyBirdDiscount
    }
  }

  return {
    original_amount: basePrice,
    discount_amount: totalDiscount,
    final_amount: Math.max(0, finalPrice),
    coupon_applied: null,
    early_bird_discount: earlyBirdDiscount
  }
}

// Note: Coupon validation functionality has been removed as the coupons table
// is not defined in the current database schema.

// ================================
// ANALYTICS AND REPORTING
// ================================

/**
 * Get reservation analytics
 * @param dateRange - Date range filter
 * @returns Reservation analytics
 */
export async function getReservationAnalytics(dateRange?: {
  start: string
  end: string
}): Promise<ReservationAnalytics> {
  const supabase = createClient()
  
  try {
    // Build date filter
    let dateFilter = ''
    if (dateRange) {
      dateFilter = `created_at.gte.${dateRange.start},created_at.lte.${dateRange.end}`
    }

    // Get reservation data
    const { data: reservations } = await supabase
      .from('program_participants')
      .select(`
        *,
        program:programs(title),
        payment:payments(amount)
      `)
      .filter(dateFilter || 'created_at', 'gte', '1970-01-01')

    // Calculate metrics
    const totalReservations = reservations?.length || 0
    const confirmedReservations = reservations?.filter(r => r.status === 'confirmed').length || 0
    const cancelledReservations = reservations?.filter(r => r.status === 'cancelled').length || 0
    const cancellationRate = totalReservations > 0 ? cancelledReservations / totalReservations : 0

    // Revenue by program
    const revenueByProgram = reservations?.reduce((acc, reservation) => {
      const programTitle = (reservation.program as any)?.title || 'Unknown'
      const amount = (reservation.payment as any)?.[0]?.amount || 0
      
      if (!acc[programTitle]) {
        acc[programTitle] = { revenue: 0, count: 0 }
      }
      
      acc[programTitle].revenue += Number(amount)
      acc[programTitle].count += 1
      
      return acc
    }, {} as Record<string, { revenue: number; count: number }>)

    const revenueByProgramArray = Object.entries(revenueByProgram || {}).map(([name, data]) => ({
      program_id: '',
      program_name: name,
      revenue: data.revenue,
      participant_count: data.count
    }))

    return {
      total_reservations: totalReservations,
      confirmed_reservations: confirmedReservations,
      cancellation_rate: cancellationRate,
      average_booking_lead_time: 7, // TODO: Calculate actual lead time
      popular_time_slots: [], // TODO: Implement time slot analysis
      revenue_by_program: revenueByProgramArray,
      conversion_funnel: {
        page_views: 0, // TODO: Implement with analytics
        program_details_views: 0,
        reservation_started: 0,
        payment_attempted: 0,
        payment_completed: confirmedReservations
      }
    }
  } catch (error) {
    console.error('Error getting reservation analytics:', error)
    return {
      total_reservations: 0,
      confirmed_reservations: 0,
      cancellation_rate: 0,
      average_booking_lead_time: 0,
      popular_time_slots: [],
      revenue_by_program: [],
      conversion_funnel: {
        page_views: 0,
        program_details_views: 0,
        reservation_started: 0,
        payment_attempted: 0,
        payment_completed: 0
      }
    }
  }
}

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Get refund rate based on cancellation timing
 * @param daysUntilStart - Days until program starts
 * @returns Refund rate (0-1)
 */
function getRefundRate(daysUntilStart: number): number {
  if (daysUntilStart >= 14) return 1.0      // 100% refund
  if (daysUntilStart >= 7) return 0.8       // 80% refund
  if (daysUntilStart >= 3) return 0.5       // 50% refund
  if (daysUntilStart >= 1) return 0.2       // 20% refund
  return 0                                  // No refund
}