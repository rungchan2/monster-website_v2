"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, Calendar, CreditCard, Download, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatAmount } from '@/lib/payments/nicepay'
import Footer from '@/components/Footer'

interface PaymentInfo {
  orderId: string
  amount: string
  programTitle?: string
  participantName?: string
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')

    if (!orderId || !amount) {
      router.push('/programs')
      return
    }

    setPaymentInfo({
      orderId,
      amount,
      programTitle: searchParams.get('programTitle') || undefined,
      participantName: searchParams.get('participantName') || undefined
    })
    setLoading(false)
  }, [searchParams, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#56007C] mx-auto mb-4"></div>
          <p className="text-gray-600">결제 정보를 확인하는 중...</p>
        </div>
      </div>
    )
  }

  if (!paymentInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">결제 정보를 찾을 수 없습니다.</p>
          <Link
            href="/programs"
            className="bg-[#56007C] text-white px-6 py-2 rounded-lg hover:bg-[#56007C]/90 transition-colors"
          >
            프로그램 목록으로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-lg shadow-sm p-8 text-center"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="mb-6"
          >
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
          </motion.div>

          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">결제가 완료되었습니다!</h1>
            <p className="text-lg text-gray-600">
              프로그램 신청이 성공적으로 처리되었습니다.
            </p>
          </motion.div>

          {/* Payment Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="bg-gray-50 rounded-lg p-6 mb-8"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">결제 정보</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">주문번호</span>
                <span className="font-medium">{paymentInfo.orderId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">결제금액</span>
                <span className="font-bold text-[#56007C] text-lg">
                  ₩{formatAmount(parseInt(paymentInfo.amount))}
                </span>
              </div>
              {paymentInfo.programTitle && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">프로그램</span>
                  <span className="font-medium">{paymentInfo.programTitle}</span>
                </div>
              )}
              {paymentInfo.participantName && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">참가자</span>
                  <span className="font-medium">{paymentInfo.participantName}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Next Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mb-8"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">다음 단계</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-left">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">확인 이메일 발송</p>
                  <p className="text-sm text-gray-600">
                    등록하신 이메일로 프로그램 상세 정보와 참가 안내를 보내드립니다.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-left">
                <Calendar className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">프로그램 참가 준비</p>
                  <p className="text-sm text-gray-600">
                    프로그램 시작 3일 전에 상세 안내와 준비물을 안내해드립니다.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-[#56007C] text-white px-6 py-3 rounded-lg hover:bg-[#56007C]/90 transition-colors font-semibold"
            >
              <Calendar className="w-5 h-5" />
              내 예약 확인하기
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/programs"
              className="inline-flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              다른 프로그램 보기
            </Link>
          </motion.div>

          {/* Support Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="mt-8 pt-6 border-t border-gray-200"
          >
            <p className="text-sm text-gray-600 mb-2">
              문의사항이 있으시면 언제든지 연락주세요.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="text-gray-600">이메일: info@monster-coop.kr</span>
              <span className="text-gray-600">전화: 02-1234-5678</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
      
      <Footer />
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  )
}