"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { XCircle, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import Footer from '@/components/Footer'

interface FailureInfo {
  message: string
  orderId?: string
  amount?: string
}

function PaymentFailureContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [failureInfo, setFailureInfo] = useState<FailureInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const message = searchParams.get('message') || '결제 처리 중 오류가 발생했습니다.'
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')

    setFailureInfo({
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

  if (!failureInfo) {
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
          {/* Failure Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="mb-6"
          >
            <XCircle className="w-20 h-20 text-red-500 mx-auto" />
          </motion.div>

          {/* Failure Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">결제에 실패했습니다</h1>
            <p className="text-lg text-gray-600 mb-4">
              결제 처리 중 문제가 발생했습니다.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm text-left">
                  {failureInfo.message}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Failure Details */}
          {(failureInfo.orderId || failureInfo.amount) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="bg-gray-50 rounded-lg p-6 mb-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">결제 시도 정보</h2>
              <div className="space-y-3">
                {failureInfo.orderId && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">주문번호</span>
                    <span className="font-medium">{failureInfo.orderId}</span>
                  </div>
                )}
                {failureInfo.amount && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">결제 시도 금액</span>
                    <span className="font-medium">
                      ₩{new Intl.NumberFormat('ko-KR').format(parseInt(failureInfo.amount))}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Troubleshooting Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mb-8"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">해결 방법</h3>
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">1</span>
                </div>
                <p className="text-gray-700">
                  카드 정보가 정확한지 확인하고 다시 시도해주세요.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">2</span>
                </div>
                <p className="text-gray-700">
                  카드 한도나 잔액을 확인해주세요.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">3</span>
                </div>
                <p className="text-gray-700">
                  다른 결제 수단을 사용해보세요.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">4</span>
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
            <p className="text-sm text-gray-600 mb-2">
              결제 문제가 계속되면 고객센터로 문의해주세요.
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

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <PaymentFailureContent />
    </Suspense>
  )
}