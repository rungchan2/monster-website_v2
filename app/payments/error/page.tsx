"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, ArrowLeft, Phone, Mail } from 'lucide-react'
import Link from 'next/link'
import Footer from '@/components/Footer'

interface ErrorInfo {
  message: string
  orderId?: string
  amount?: string
}

function PaymentErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const message = searchParams.get('message') || '결제 처리 중 시스템 오류가 발생했습니다.'
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')

    setErrorInfo({
      message: decodeURIComponent(message),
      orderId: orderId || undefined,
      amount: amount || undefined
    })
    setLoading(false)
  }, [searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#56007C] mx-auto mb-4"></div>
          <p className="text-gray-600">정보를 확인하는 중...</p>
        </div>
      </div>
    )
  }

  if (!errorInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">오류 정보를 찾을 수 없습니다.</p>
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
          {/* Error Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="mb-6"
          >
            <AlertTriangle className="w-20 h-20 text-amber-500 mx-auto" />
          </motion.div>

          {/* Error Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">시스템 오류가 발생했습니다</h1>
            <p className="text-lg text-gray-600 mb-4">
              결제 처리 중 예상치 못한 오류가 발생했습니다.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-amber-700 text-sm text-left">
                  {errorInfo.message}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Error Details */}
          {(errorInfo.orderId || errorInfo.amount) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="bg-gray-50 rounded-lg p-6 mb-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">오류 발생 정보</h2>
              <div className="space-y-3">
                {errorInfo.orderId && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">주문번호</span>
                    <span className="font-medium">{errorInfo.orderId}</span>
                  </div>
                )}
                {errorInfo.amount && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">결제 시도 금액</span>
                    <span className="font-medium">
                      ₩{new Intl.NumberFormat('ko-KR').format(parseInt(errorInfo.amount))}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">오류 발생 시간</span>
                  <span className="font-medium">
                    {new Date().toLocaleString('ko-KR')}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* What to do next */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mb-8"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">다음 단계</h3>
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">1</span>
                </div>
                <p className="text-gray-700">
                  잠시 후 다시 시도해주세요. 일시적인 시스템 오류일 수 있습니다.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">2</span>
                </div>
                <p className="text-gray-700">
                  브라우저를 새로고침하거나 다시 시작해보세요.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">3</span>
                </div>
                <p className="text-gray-700">
                  문제가 계속되면 고객센터로 문의해주세요.
                </p>
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
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center gap-2 bg-[#56007C] text-white px-6 py-3 rounded-lg hover:bg-[#56007C]/90 transition-colors font-semibold"
            >
              <RefreshCw className="w-5 h-5" />
              다시 시도하기
            </button>
            <Link
              href="/programs"
              className="inline-flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              프로그램 목록으로
            </Link>
          </motion.div>

          {/* Support Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="mt-8 pt-6 border-t border-gray-200"
          >
            <h4 className="text-lg font-semibold text-gray-900 mb-4">고객 지원</h4>
            <p className="text-sm text-gray-600 mb-4">
              시스템 오류가 계속되면 아래 연락처로 문의해주세요.<br />
              담당자가 신속하게 도움을 드리겠습니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">이메일: info@monster-coop.kr</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">전화: 02-1234-5678</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              운영시간: 평일 09:00 - 18:00 (점심시간 12:00 - 13:00 제외)
            </p>
          </motion.div>
        </motion.div>
      </div>
      
      <Footer />
    </div>
  )
}

export default function PaymentErrorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <PaymentErrorContent />
    </Suspense>
  )
}