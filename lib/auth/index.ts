import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { toast } from 'sonner'

// Types
type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export interface SignUpData {
  email: string
  password: string
  full_name?: string
  phone?: string
  birth_date?: string
  gender?: 'male' | 'female' | 'other'
  occupation?: string
  education_level?: string
  interests?: string[]
  learning_goals?: string
  marketing_consent?: boolean
}

export interface SignInData {
  email: string
  password: string
}

export interface AuthError {
  message: string
  code?: string
}

export interface AuthResponse<T = any> {
  data: T | null
  error: AuthError | null
}

// ================================
// AUTHENTICATION FUNCTIONS
// ================================

/**
 * 회원가입 - 향상된 버전
 * @param signUpData - 회원가입 데이터
 * @returns 인증 응답
 */
export async function signUp(signUpData: SignUpData): Promise<AuthResponse> {
  const supabase = createClient()

  try {
    console.log('Starting signup process for:', signUpData.email)
    toast.loading('회원가입을 진행 중입니다...')

    // 이메일 형식 검증
    if (!isValidEmail(signUpData.email)) {
      toast.error('올바른 이메일 주소를 입력해주세요.')
      return {
        data: null,
        error: { message: '올바른 이메일 주소를 입력해주세요.' }
      }
    }

    // 비밀번호 강도 검증
    const passwordValidation = validatePassword(signUpData.password)
    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.message)
      return {
        data: null,
        error: { message: passwordValidation.message }
      }
    }

    // 기존 사용자 확인
    console.log('Checking if user exists...')
    const existingUser = await checkUserExists(signUpData.email)
    if (existingUser) {
      toast.error('이미 등록된 이메일입니다.')
      return {
        data: null,
        error: { message: '이미 등록된 이메일입니다.' }
      }
    }

    // Supabase Auth 회원가입
    console.log('Creating auth user...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: signUpData.email,
      password: signUpData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: signUpData.full_name || '',
          phone: signUpData.phone || ''
        }
      }
    })

    if (authError) {
      console.error('Auth signup error:', authError)
      toast.error(getAuthErrorMessage(authError.message))
      return {
        data: null,
        error: { 
          message: getAuthErrorMessage(authError.message),
          code: authError.message 
        }
      }
    }

    if (!authData.user) {
      console.error('No user returned from auth signup')
      toast.error('회원가입 처리 중 오류가 발생했습니다.')
      return {
        data: null,
        error: { message: '회원가입 처리 중 오류가 발생했습니다.' }
      }
    }

    console.log('Auth user created successfully:', authData.user.id)

    // 프로필 생성
    const profileData: ProfileInsert = {
      id: authData.user.id,
      email: signUpData.email,
      full_name: signUpData.full_name || null,
      phone: signUpData.phone || null,
      birth_date: signUpData.birth_date || null,
      gender: signUpData.gender || null,
      occupation: signUpData.occupation || null,
      education_level: signUpData.education_level || null,
      interests: signUpData.interests || null,
      learning_goals: signUpData.learning_goals || null,
      marketing_consent: signUpData.marketing_consent ?? false,
      is_admin: false
    }

    console.log('Creating profile with data:', profileData)
    const profileCreated = await createProfileSafely(profileData)
    
    if (!profileCreated) {
      console.error('Profile creation failed')
      toast.error('프로필 생성에 실패했습니다. 관리자에게 문의하세요.')
      return {
        data: null,
        error: { message: '프로필 생성에 실패했습니다.' }
      }
    }

    console.log('Profile created successfully')
    toast.success('회원가입이 완료되었습니다!')

    return {
      data: {
        user: authData.user,
        session: authData.session,
        needsEmailConfirmation: !authData.session
      },
      error: null
    }
  } catch (error) {
    console.error('Signup error:', error)
    toast.error('회원가입 중 오류가 발생했습니다.')
    return {
      data: null,
      error: { message: '회원가입 중 오류가 발생했습니다.' }
    }
  }
}

/**
 * 로그인 - 향상된 버전
 * @param signInData - 로그인 데이터
 * @returns 인증 응답
 */
export async function signIn(signInData: SignInData): Promise<AuthResponse> {
  const supabase = createClient()

  try {
    // 입력 검증
    if (!signInData.email || !signInData.password) {
      return {
        data: null,
        error: { message: '이메일과 비밀번호를 입력해주세요.' }
      }
    }

    if (!isValidEmail(signInData.email)) {
      return {
        data: null,
        error: { message: '올바른 이메일 주소를 입력해주세요.' }
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: signInData.email,
      password: signInData.password
    })

    if (authError) {
      console.error('Auth signin error:', authError)
      return {
        data: null,
        error: { 
          message: getAuthErrorMessage(authError.message),
          code: authError.message 
        }
      }
    }

    // 프로필 정보와 함께 반환
    const profile = await getUserProfile(authData.user.id)

    return {
      data: {
        user: authData.user,
        session: authData.session,
        profile
      },
      error: null
    }
  } catch (error) {
    console.error('Signin error:', error)
    return {
      data: null,
      error: { message: '로그인 중 오류가 발생했습니다.' }
    }
  }
}

/**
 * 로그아웃
 * @returns 인증 응답
 */
export async function signOut(): Promise<AuthResponse> {
  const supabase = createClient()

  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Error signing out:', error)
      return {
        data: null,
        error: { message: '로그아웃에 실패했습니다.' }
      }
    }

    return {
      data: { success: true },
      error: null
    }
  } catch (error) {
    console.error('Signout error:', error)
    return {
      data: null,
      error: { message: '로그아웃 중 오류가 발생했습니다.' }
    }
  }
}

/**
 * 소셜 로그인 (Google, GitHub 등)
 * @param provider - 소셜 제공자
 * @returns 인증 응답
 */
export async function signInWithProvider(provider: 'google' | 'github' | 'kakao'): Promise<AuthResponse> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      console.error('Social signin error:', error)
      return {
        data: null,
        error: { 
          message: getAuthErrorMessage(error.message),
          code: error.message 
        }
      }
    }

    return {
      data,
      error: null
    }
  } catch (error) {
    console.error('Social signin error:', error)
    return {
      data: null,
      error: { message: '소셜 로그인 중 오류가 발생했습니다.' }
    }
  }
}

// ================================
// PASSWORD MANAGEMENT
// ================================

/**
 * 비밀번호 재설정 이메일 발송
 * @param email - 이메일
 * @returns 인증 응답
 */
export async function resetPassword(email: string): Promise<AuthResponse> {
  const supabase = createClient()

  try {
    if (!isValidEmail(email)) {
      return {
        data: null,
        error: { message: '올바른 이메일 주소를 입력해주세요.' }
      }
    }

    // 사용자 존재 확인
    const userExists = await checkUserExists(email)
    if (!userExists) {
      return {
        data: null,
        error: { message: '등록되지 않은 이메일입니다.' }
      }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    if (error) {
      console.error('Error resetting password:', error)
      return {
        data: null,
        error: { 
          message: getAuthErrorMessage(error.message),
          code: error.message 
        }
      }
    }

    return {
      data: { success: true },
      error: null
    }
  } catch (error) {
    console.error('Reset password error:', error)
    return {
      data: null,
      error: { message: '비밀번호 재설정 중 오류가 발생했습니다.' }
    }
  }
}

/**
 * 비밀번호 변경
 * @param newPassword - 새 비밀번호
 * @returns 인증 응답
 */
export async function updatePassword(newPassword: string): Promise<AuthResponse> {
  const supabase = createClient()

  try {
    // 현재 세션 확인
    const session = await getCurrentSession()
    if (!session) {
      return {
        data: null,
        error: { message: '로그인이 필요합니다.' }
      }
    }

    // 비밀번호 강도 검증
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      return {
        data: null,
        error: { message: passwordValidation.message }
      }
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      console.error('Error updating password:', error)
      return {
        data: null,
        error: { 
          message: getAuthErrorMessage(error.message),
          code: error.message 
        }
      }
    }

    return {
      data: { success: true },
      error: null
    }
  } catch (error) {
    console.error('Update password error:', error)
    return {
      data: null,
      error: { message: '비밀번호 변경 중 오류가 발생했습니다.' }
    }
  }
}

// ================================
// PROFILE MANAGEMENT
// ================================

/**
 * 사용자 프로필 조회
 * @param userId - 사용자 ID (옵션, 없으면 현재 사용자)
 * @returns 프로필 데이터
 */
export async function getUserProfile(userId?: string): Promise<Profile | null> {
  const supabase = createClient()

  try {
    // 현재 사용자 세션 확인
    if (!userId) {
      const session = await getCurrentSession()
      if (!session) return null
      userId = session.user.id
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Get profile error:', error)
    return null
  }
}

/**
 * 프로필 업데이트
 * @param profileData - 업데이트할 프로필 데이터
 * @returns 인증 응답
 */
export async function updateProfile(profileData: ProfileUpdate): Promise<AuthResponse<Profile>> {
  const supabase = createClient()

  try {
    const session = await getCurrentSession()
    if (!session) {
      return {
        data: null,
        error: { message: '로그인이 필요합니다.' }
      }
    }

    // 이메일 중복 체크 (이메일을 변경하는 경우)
    if (profileData.email) {
      const existingUser = await checkUserExists(profileData.email, session.user.id)
      if (existingUser) {
        return {
          data: null,
          error: { message: '이미 사용 중인 이메일입니다.' }
        }
      }
    }

    const updateData: ProfileUpdate = {
      ...profileData,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', session.user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return {
        data: null,
        error: { message: '프로필 업데이트에 실패했습니다.' }
      }
    }

    // Auth 사용자 정보도 업데이트 (이메일이 변경된 경우)
    if (profileData.email || profileData.full_name) {
      const authUpdateData: any = {}
      if (profileData.email) authUpdateData.email = profileData.email
      if (profileData.full_name) authUpdateData.data = { full_name: profileData.full_name }

      await supabase.auth.updateUser(authUpdateData)
    }

    return {
      data,
      error: null
    }
  } catch (error) {
    console.error('Update profile error:', error)
    return {
      data: null,
      error: { message: '프로필 업데이트 중 오류가 발생했습니다.' }
    }
  }
}

/**
 * 프로필 이미지 업로드
 * @param file - 이미지 파일
 * @param userId - 사용자 ID
 * @returns 업로드된 이미지 URL
 */
export async function uploadProfileImage(file: File, userId?: string): Promise<AuthResponse<string>> {
  const supabase = createClient()

  try {
    const session = await getCurrentSession()
    if (!session) {
      return {
        data: null,
        error: { message: '로그인이 필요합니다.' }
      }
    }

    const targetUserId = userId || session.user.id

    // 파일 확장자 확인
    const fileExt = file.name.split('.').pop()
    const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    if (!fileExt || !allowedTypes.includes(fileExt.toLowerCase())) {
      return {
        data: null,
        error: { message: '지원하지 않는 파일 형식입니다. (jpg, png, gif, webp만 지원)' }
      }
    }

    // 파일 크기 확인 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      return {
        data: null,
        error: { message: '파일 크기는 5MB 이하여야 합니다.' }
      }
    }

    const fileName = `${targetUserId}/profile.${fileExt}`

    // 기존 이미지 삭제
    await supabase.storage
      .from('avatars')
      .remove([fileName])

    // 새 이미지 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return {
        data: null,
        error: { message: '이미지 업로드에 실패했습니다.' }
      }
    }

    // 공개 URL 가져오기
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    return {
      data: urlData.publicUrl,
      error: null
    }
  } catch (error) {
    console.error('Upload profile image error:', error)
    return {
      data: null,
      error: { message: '이미지 업로드 중 오류가 발생했습니다.' }
    }
  }
}

// ================================
// SESSION MANAGEMENT
// ================================

/**
 * 현재 세션 확인
 * @returns 세션 데이터
 */
export async function getCurrentSession() {
  const supabase = createClient()
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    
    return session
  } catch (error) {
    console.error('Get session error:', error)
    return null
  }
}

/**
 * 현재 사용자 정보 가져오기
 * @returns 사용자 데이터
 */
export async function getCurrentUser() {
  const supabase = createClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Error getting user:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}

/**
 * 세션 새로고침
 * @returns 새로고침된 세션
 */
export async function refreshSession() {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.error('Error refreshing session:', error)
      return null
    }
    
    return data.session
  } catch (error) {
    console.error('Refresh session error:', error)
    return null
  }
}

// ================================
// AUTHORIZATION
// ================================

/**
 * 관리자 권한 확인
 * @param userId - 사용자 ID
 * @returns 관리자 여부
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error checking admin status:', error)
      return false
    }

    return data?.is_admin || false
  } catch (error) {
    console.error('Check admin error:', error)
    return false
  }
}

/**
 * 사용자 역할 확인
 * @param userId - 사용자 ID
 * @returns 사용자 역할 정보
 */
export async function getUserRole(userId: string) {
  try {
    const profile = await getUserProfile(userId)
    if (!profile) return null

    return {
      isAdmin: profile.is_admin || false,
      isUser: true
    }
  } catch (error) {
    console.error('Get user role error:', error)
    return null
  }
}

// ================================
// ACCOUNT MANAGEMENT
// ================================

/**
 * 계정 삭제
 * @returns 인증 응답
 */
export async function deleteAccount(): Promise<AuthResponse> {
  try {
    const session = await getCurrentSession()
    if (!session) {
      return {
        data: null,
        error: { message: '로그인이 필요합니다.' }
      }
    }

    const supabase = createClient()

    // 프로필 먼저 삭제 (cascade로 관련 데이터도 삭제됨)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', session.user.id)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      return {
        data: null,
        error: { message: '계정 삭제에 실패했습니다.' }
      }
    }

    return {
      data: { success: true },
      error: null
    }
  } catch (error) {
    console.error('Delete account error:', error)
    return {
      data: null,
      error: { message: '계정 삭제 중 오류가 발생했습니다.' }
    }
  }
}

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * 이메일 형식 검증
 * @param email - 이메일
 * @returns 유효성 여부
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 비밀번호 강도 검증
 * @param password - 비밀번호
 * @returns 검증 결과
 */
export function validatePassword(password: string): { isValid: boolean; message: string } {
  if (password.length < 8) {
    return { isValid: false, message: '비밀번호는 8자 이상이어야 합니다.' }
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: '비밀번호에는 소문자가 포함되어야 합니다.' }
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: '비밀번호에는 대문자가 포함되어야 합니다.' }
  }

  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: '비밀번호에는 숫자가 포함되어야 합니다.' }
  }

  if (!/(?=.*[!@#$%^&*])/.test(password)) {
    return { isValid: false, message: '비밀번호에는 특수문자(!@#$%^&*)가 포함되어야 합니다.' }
  }

  return { isValid: true, message: '안전한 비밀번호입니다.' }
}

/**
 * 사용자 존재 확인
 * @param email - 이메일
 * @param excludeUserId - 제외할 사용자 ID
 * @returns 사용자 존재 여부
 */
async function checkUserExists(email: string, excludeUserId?: string): Promise<boolean> {
  const supabase = createClient()

  try {
    let query = supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1)

    if (excludeUserId) {
      query = query.neq('id', excludeUserId)
    }

    const { data, error } = await query

    if (error) {
      console.log('Error checking user exists:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      toast.error('사용자 확인 중 오류가 발생했습니다.')
      return false
    }

    console.log('User exists check result:', { email, exists: data && data.length > 0 })
    return data && data.length > 0
  } catch (error) {
    console.error('Check user exists error:', error)
    toast.error('사용자 확인 중 오류가 발생했습니다.')
    return false
  }
}

/**
 * 프로필 안전 생성 (이미 존재하면 무시)
 * @param profileData - 프로필 데이터
 * @returns 성공 여부
 */
async function createProfileSafely(profileData: ProfileInsert): Promise<boolean> {
  const supabase = createClient()

  try {
    console.log('Attempting to create profile...')
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })
      .select()

    if (error) {
      console.error('Error creating profile:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        profileData
      })
      toast.error('프로필 생성 중 오류가 발생했습니다.')
      return false
    }

    console.log('Profile created successfully:', data)
    return true
  } catch (error) {
    console.error('Create profile safely error:', error)
    toast.error('프로필 생성 중 오류가 발생했습니다.')
    return false
  }
}

/**
 * Auth 에러 메시지 변환
 * @param errorMessage - 원본 에러 메시지
 * @returns 한국어 에러 메시지
 */
function getAuthErrorMessage(errorMessage: string): string {
  const errorMap: { [key: string]: string } = {
    'Invalid login credentials': '이메일 또는 비밀번호가 잘못되었습니다.',
    'Email not confirmed': '이메일 인증을 완료해주세요.',
    'Invalid email': '올바른 이메일 주소를 입력해주세요.',
    'Password should be at least 6 characters': '비밀번호는 6자 이상이어야 합니다.',
    'User already registered': '이미 등록된 사용자입니다.',
    'Signup is disabled': '회원가입이 비활성화되어 있습니다.',
    'Email rate limit exceeded': '이메일 전송 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요.',
    'Too many requests': '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
  }

  return errorMap[errorMessage] || '인증 중 오류가 발생했습니다.'
}

// ================================
// AUTH STATE HOOKS (for React components)
// ================================

/**
 * 인증 상태 변경 리스너 등록
 * @param callback - 상태 변경 콜백
 * @returns 구독 해제 함수
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  const supabase = createClient()
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  
  return () => subscription.unsubscribe()
}

export async function getProfile(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error getting profile:', error)
    return null
  }

  return data
}