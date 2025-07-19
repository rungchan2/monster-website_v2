import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'

// Types
type Program = Database['public']['Tables']['programs']['Row']
type ProgramInsert = Database['public']['Tables']['programs']['Insert']
type ProgramUpdate = Database['public']['Tables']['programs']['Update']

// Extended types for CRUD operations
export interface CreateProgramData {
  title: string
  slug: string
  description?: string
  category_id?: string
  base_price: number
  early_bird_price?: number
  early_bird_deadline?: string
  max_participants?: number
  min_participants?: number
  start_date?: string
  end_date?: string
  start_time?: string
  end_time?: string
  location?: string
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  duration_hours?: number
  instructor_name?: string
  instructor_bio?: string
  instructor_image_url?: string
  thumbnail_url?: string
  notion_page_id?: string
  tags?: string[]
  is_featured?: boolean
  is_active?: boolean
}

export interface UpdateProgramData extends Partial<CreateProgramData> {
  id: string
  status?: 'open' | 'full' | 'cancelled' | 'completed'
}

// ================================
// SERVER-SIDE CREATE OPERATIONS
// ================================

/**
 * 새로운 프로그램 생성 (관리자 전용) - 서버 전용
 * @param programData - 프로그램 생성 데이터
 * @returns 생성된 프로그램
 */
export async function createProgram(programData: CreateProgramData): Promise<Program> {
  const supabase = await createClient()

  // Slug 중복 체크
  const { data: existingProgram } = await supabase
    .from('programs')
    .select('id')
    .eq('slug', programData.slug)
    .single()

  if (existingProgram) {
    throw new Error('이미 존재하는 슬러그입니다.')
  }

  const insertData: ProgramInsert = {
    title: programData.title,
    slug: programData.slug,
    description: programData.description || null,
    category_id: programData.category_id || null,
    base_price: programData.base_price,
    early_bird_price: programData.early_bird_price || null,
    early_bird_deadline: programData.early_bird_deadline || null,
    max_participants: programData.max_participants || null,
    min_participants: programData.min_participants || null,
    start_date: programData.start_date || null,
    end_date: programData.end_date || null,
    start_time: programData.start_time || null,
    end_time: programData.end_time || null,
    location: programData.location || null,
    difficulty_level: programData.difficulty_level || null,
    duration_hours: programData.duration_hours || null,
    instructor_name: programData.instructor_name || null,
    instructor_bio: programData.instructor_bio || null,
    instructor_image_url: programData.instructor_image_url || null,
    thumbnail_url: programData.thumbnail_url || null,
    notion_page_id: programData.notion_page_id || null,
    tags: programData.tags || null,
    is_featured: programData.is_featured ?? false,
    is_active: programData.is_active ?? true,
    status: 'open',
    current_participants: 0
  }

  const { data, error } = await supabase
    .from('programs')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error creating program:', error)
    throw new Error('프로그램 생성에 실패했습니다.')
  }

  return data
}

// ================================
// SERVER-SIDE UPDATE OPERATIONS
// ================================

/**
 * 프로그램 업데이트 (관리자 전용) - 서버 전용
 * @param updateData - 업데이트할 프로그램 데이터
 * @returns 업데이트된 프로그램
 */
export async function updateProgram(updateData: UpdateProgramData): Promise<Program> {
  const supabase = await createClient()

  const { id, ...programData } = updateData

  // Slug 중복 체크 (다른 프로그램과)
  if (programData.slug) {
    const { data: existingProgram } = await supabase
      .from('programs')
      .select('id')
      .eq('slug', programData.slug)
      .neq('id', id)
      .single()

    if (existingProgram) {
      throw new Error('이미 존재하는 슬러그입니다.')
    }
  }

  const { data, error } = await supabase
    .from('programs')
    .update(programData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating program:', error)
    throw new Error('프로그램 업데이트에 실패했습니다.')
  }

  return data
}

/**
 * 프로그램 상태 업데이트 - 서버 전용
 * @param id - 프로그램 ID
 * @param status - 새로운 상태
 * @returns 업데이트된 프로그램
 */
export async function updateProgramStatus(
  id: string, 
  status: 'open' | 'full' | 'cancelled' | 'completed'
): Promise<Program> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('programs')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating program status:', error)
    throw new Error('프로그램 상태 업데이트에 실패했습니다.')
  }

  return data
}

/**
 * 프로그램 활성화/비활성화 토글 - 서버 전용
 */
export async function toggleProgramActive(id: string, isActive: boolean): Promise<Program> {
  return updateProgram({ id, is_active: isActive })
}

/**
 * 프로그램 추천 여부 토글 - 서버 전용
 */
export async function toggleProgramFeatured(id: string, isFeatured: boolean): Promise<Program> {
  return updateProgram({ id, is_featured: isFeatured })
}

// ================================
// SERVER-SIDE DELETE OPERATIONS
// ================================

/**
 * 프로그램 삭제 (관리자 전용) - 서버 전용
 * @param id - 프로그램 ID
 * @param forceDelete - 강제 삭제 여부
 */
export async function deleteProgram(id: string, forceDelete = false): Promise<void> {
  const supabase = await createClient()

  if (!forceDelete) {
    // 참가자가 있는지 확인
    const { data: participants } = await supabase
      .from('program_participants')
      .select('id')
      .eq('program_id', id)
      .limit(1)

    if (participants && participants.length > 0) {
      throw new Error('참가자가 있는 프로그램은 삭제할 수 없습니다. 먼저 비활성화하세요.')
    }
  }

  const { error } = await supabase
    .from('programs')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting program:', error)
    throw new Error('프로그램 삭제에 실패했습니다.')
  }
}

/**
 * 프로그램 소프트 삭제 (비활성화) - 서버 전용
 * @param id - 프로그램 ID
 * @returns 업데이트된 프로그램
 */
export async function softDeleteProgram(id: string): Promise<Program> {
  return updateProgram({ id, is_active: false, status: 'cancelled' })
}

// ================================
// SERVER-SIDE UTILITY OPERATIONS
// ================================

/**
 * 프로그램 참가자 수 업데이트 - 서버 전용
 * @param programId - 프로그램 ID
 * @param increment - 증가/감소 수
 */
export async function updateProgramParticipants(programId: string, increment: number): Promise<void> {
  const supabase = await createClient()

  // 현재 참가자 수 조회
  const { data: program } = await supabase
    .from('programs')
    .select('current_participants, max_participants')
    .eq('id', programId)
    .single()

  if (!program) {
    throw new Error('프로그램을 찾을 수 없습니다.')
  }

  const newCount = (program.current_participants || 0) + increment

  // 최대 참가자 수 확인
  if (program.max_participants && newCount > program.max_participants) {
    throw new Error('최대 참가자 수를 초과했습니다.')
  }

  // 음수 방지
  if (newCount < 0) {
    throw new Error('참가자 수는 0보다 작을 수 없습니다.')
  }

  const { error } = await supabase
    .from('programs')
    .update({ 
      current_participants: newCount,
      status: program.max_participants && newCount >= program.max_participants ? 'full' : 'open'
    })
    .eq('id', programId)

  if (error) {
    console.error('Error updating program participants:', error)
    throw new Error('참가자 수 업데이트에 실패했습니다.')
  }
}

/**
 * 프로그램 통계 조회 - 서버 전용
 * @param programId - 특정 프로그램 ID (선택사항)
 * @returns 프로그램 통계
 */
export async function getProgramStats(programId?: string) {
  const supabase = await createClient()

  try {
    if (programId) {
      // 특정 프로그램 통계
      const [programData, participantsData, paymentsData] = await Promise.all([
        supabase.from('programs').select('*').eq('id', programId).single(),
        supabase.from('program_participants').select('*').eq('program_id', programId),
        supabase.from('payments').select('amount, status').eq('program_id', programId)
      ])

      const totalRevenue = paymentsData.data?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0
      const completedPayments = paymentsData.data?.filter(p => p.status === 'completed').length || 0

      return {
        program: programData.data,
        total_participants: participantsData.data?.length || 0,
        active_participants: participantsData.data?.filter(p => p.status === 'registered').length || 0,
        total_revenue: totalRevenue,
        completed_payments: completedPayments,
        conversion_rate: participantsData.data?.length ? (completedPayments / participantsData.data.length) * 100 : 0
      }
    } else {
      // 전체 프로그램 통계
      const [programsData, participantsData, paymentsData] = await Promise.all([
        supabase.from('programs').select('*'),
        supabase.from('program_participants').select('*'),
        supabase.from('payments').select('amount, status')
      ])

      const totalPrograms = programsData.data?.length || 0
      const activePrograms = programsData.data?.filter(p => p.status === 'open').length || 0
      const totalParticipants = participantsData.data?.length || 0
      const totalRevenue = paymentsData.data?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0

      return {
        total_programs: totalPrograms,
        active_programs: activePrograms,
        total_participants: totalParticipants,
        total_revenue: totalRevenue,
        avg_participants_per_program: totalPrograms > 0 ? totalParticipants / totalPrograms : 0
      }
    }
  } catch (error) {
    console.error('Error getting program stats:', error)
    throw new Error('프로그램 통계 조회에 실패했습니다.')
  }
} 