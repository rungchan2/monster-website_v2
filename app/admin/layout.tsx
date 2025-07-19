"use client";

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { AdminNavigation } from '@/components/admin/AdminNavigation'
import { Toaster, toast } from 'sonner'
import { getProfile } from '@/lib/auth/index'


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser()
      const profile = await getProfile(currentUser?.id ?? '')
      
      if (!currentUser || !profile?.is_admin) {
        router.push('/')
        return
      }
      
      setUser(currentUser)
    } catch (error) {
      console.error('Auth check failed:', error)
      toast.error('인증 확인 중 오류가 발생했습니다.')
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#56007C] mx-auto"></div>
          <p className="mt-4 text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={user} />
      <div className="lg:pl-64">
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  )
}