"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Save, 
  Users, 
  Calendar, 
  MapPin, 
  Clock, 
  DollarSign,
  Eye,
  Mail,
  Phone,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { updateProgram, UpdateProgramData } from "@/lib/database/programs-server";
import { AdminProgramDetails } from "@/lib/types/admin";

interface ProgramParticipant {
  id: string;
  name: string;
  email: string;
  phone: string;
  enrollment_date: string;
  payment_status: string;
  attendance_status?: string;
  completion_status: string;
  satisfaction_rating?: number;
  feedback?: string;
}

export default function ProgramEditPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;
  
  const [program, setProgram] = useState<AdminProgramDetails | null>(null);
  const [participants, setParticipants] = useState<ProgramParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'participants'>('details');
  
  const [formData, setFormData] = useState<UpdateProgramData>({
    id: programId,
    title: "",
    description: "",
    base_price: 0,
    early_bird_price: 0,
    early_bird_deadline: "",
    max_participants: 0,
    min_participants: 0,
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    location: "",
    difficulty_level: "beginner",
    duration_hours: 0,
    instructor_name: "",
    instructor_bio: "",
    instructor_image_url: "",
    thumbnail_url: "",
    notion_page_id: "",
    tags: [],
    is_featured: false,
    is_active: true,
    status: "open"
  });

  useEffect(() => {
    loadProgramData();
  }, [programId]);

  const loadProgramData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Get program details
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select(`
          *,
          category:program_categories(name)
        `)
        .eq('id', programId)
        .single();

      if (programError) throw programError;

      // Get participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('program_participants')
        .select(`
          *,
          payment:payments(status, amount)
        `)
        .eq('program_id', programId);

      if (participantsError) throw participantsError;

      // Transform program data
      const transformedProgram: AdminProgramDetails = {
        id: programData.id,
        title: programData.title,
        category: programData.category?.name || 'Uncategorized',
        instructor: programData.instructor_name || 'TBD',
        status: programData.status || 'open',
        is_active: programData.is_active || false,
        enrollment: {
          current: programData.current_participants || 0,
          maximum: programData.max_participants || 0,
          minimum: programData.min_participants || 0,
          utilization_rate: programData.max_participants && programData.max_participants > 0 ? 
            (programData.current_participants || 0) / programData.max_participants : 0
        },
        schedule: {
          start_date: programData.start_date || '',
          end_date: programData.end_date || '',
          duration_hours: programData.duration_hours || 0,
          location: programData.location || 'TBD'
        },
        pricing: {
          base_price: Number(programData.base_price) || 0,
          early_bird_price: Number(programData.early_bird_price) || undefined,
          early_bird_deadline: programData.early_bird_deadline || undefined,
          total_revenue: 0 // Will be calculated from participants
        },
        participants: [],
        analytics: {
          completion_rate: 0,
          satisfaction_score: 4.5,
          referral_rate: 0.15,
          repeat_enrollment_rate: 0.25
        }
      };

      // Transform participants data
      const transformedParticipants = participantsData.map(p => ({
        id: p.id,
        name: p.participant_name,
        email: p.participant_email,
        phone: p.participant_phone || '',
        enrollment_date: p.created_at || '',
        payment_status: p.payment_status || '',
        attendance_status: p.attendance_status || '',
        completion_status: p.status || '',
        satisfaction_rating: undefined,
        feedback: undefined
      }));

      // Update form data
      setFormData({
        id: programId,
        title: programData.title,
        description: programData.description || "",
        base_price: Number(programData.base_price) || 0,
        early_bird_price: Number(programData.early_bird_price) || 0,
        early_bird_deadline: programData.early_bird_deadline || "",
        max_participants: programData.max_participants || 0,
        min_participants: programData.min_participants || 0,
        start_date: programData.start_date || "",
        end_date: programData.end_date || "",
        start_time: programData.start_time || "",
        end_time: programData.end_time || "",
        location: programData.location || "",
        difficulty_level: (programData.difficulty_level as "beginner" | "intermediate" | "advanced") || "beginner",
        duration_hours: programData.duration_hours || 0,
        instructor_name: programData.instructor_name || "",
        instructor_bio: programData.instructor_bio || "",
        instructor_image_url: programData.instructor_image_url || "",
        thumbnail_url: programData.thumbnail_url || "",
        notion_page_id: programData.notion_page_id || "",
        tags: programData.tags || [],
        is_featured: programData.is_featured || false,
        is_active: programData.is_active || true,
        status: (programData.status as "completed" | "cancelled" | "full" | "open") || "open"
      });

      setProgram(transformedProgram);
      setParticipants(transformedParticipants);
    } catch (error) {
      console.error('Error loading program data:', error);
      alert('프로그램 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof UpdateProgramData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTagsChange = (tagString: string) => {
    const tags = tagString.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData(prev => ({ ...prev, tags }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      await updateProgram(formData);
      alert('프로그램이 성공적으로 업데이트되었습니다.');
      router.push('/admin/programs');
    } catch (error) {
      console.error('Error updating program:', error);
      alert('프로그램 업데이트에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"><CheckCircle size={12} />완료</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full"><XCircle size={12} />취소</span>;
      case 'registered':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"><User size={12} />등록</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full"><AlertCircle size={12} />{status}</span>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"><CheckCircle size={12} />완료</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full"><Clock size={12} />대기</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full"><XCircle size={12} />실패</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full"><CreditCard size={12} />{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#56007C] mx-auto"></div>
          <p className="mt-4 text-gray-600">프로그램 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/programs"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">프로그램 관리</h1>
            <p className="text-gray-600">{program?.title}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-[#56007C] text-[#56007C]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            프로그램 상세
          </button>
          <button
            onClick={() => setActiveTab('participants')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'participants'
                ? 'border-[#56007C] text-[#56007C]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            참가자 관리 ({participants.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'details' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">기본 정보</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    프로그램 제목 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상태
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                  >
                    <option value="open">모집중</option>
                    <option value="full">마감</option>
                    <option value="cancelled">취소</option>
                    <option value="completed">완료</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  프로그램 설명
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                />
              </div>
            </div>

            {/* 일정 및 장소 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar size={20} />
                일정 및 장소
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시작 시간
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => handleInputChange('start_time', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    종료 시간
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => handleInputChange('end_time', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    총 시간 (시간)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.duration_hours}
                    onChange={(e) => handleInputChange('duration_hours', parseInt(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  장소
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                />
              </div>
            </div>

            {/* 참가자 및 가격 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users size={20} />
                참가자 및 가격
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    최소 참가자 수
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_participants}
                    onChange={(e) => handleInputChange('min_participants', parseInt(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    최대 참가자 수
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_participants}
                    onChange={(e) => handleInputChange('max_participants', parseInt(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    기본 가격 (원) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.base_price}
                    onChange={(e) => handleInputChange('base_price', parseInt(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    얼리버드 가격 (원)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.early_bird_price}
                    onChange={(e) => handleInputChange('early_bird_price', parseInt(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    얼리버드 마감일
                  </label>
                  <input
                    type="date"
                    value={formData.early_bird_deadline}
                    onChange={(e) => handleInputChange('early_bird_deadline', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* 강사 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">강사 정보</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    강사명
                  </label>
                  <input
                    type="text"
                    value={formData.instructor_name}
                    onChange={(e) => handleInputChange('instructor_name', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    강사 프로필 이미지 URL
                  </label>
                  <input
                    type="url"
                    value={formData.instructor_image_url}
                    onChange={(e) => handleInputChange('instructor_image_url', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  강사 소개
                </label>
                <textarea
                  rows={4}
                  value={formData.instructor_bio}
                  onChange={(e) => handleInputChange('instructor_bio', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                />
              </div>
            </div>

            {/* 추가 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">추가 정보</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    썸네일 이미지 URL
                  </label>
                  <input
                    type="url"
                    value={formData.thumbnail_url}
                    onChange={(e) => handleInputChange('thumbnail_url', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notion 페이지 ID
                  </label>
                  <input
                    type="text"
                    value={formData.notion_page_id}
                    onChange={(e) => handleInputChange('notion_page_id', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  태그 (콤마로 구분)
                </label>
                <input
                  type="text"
                  value={formData.tags?.join(', ') || ''}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => handleInputChange('is_featured', e.target.checked)}
                    className="w-4 h-4 text-[#56007C] border-gray-300 rounded focus:ring-[#56007C]"
                  />
                  <span className="text-sm text-gray-700">추천 프로그램</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="w-4 h-4 text-[#56007C] border-gray-300 rounded focus:ring-[#56007C]"
                  />
                  <span className="text-sm text-gray-700">활성화</span>
                </label>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link
                href="/admin/programs"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-[#56007C] text-white rounded-lg hover:bg-[#56007C]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={16} />
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm"
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">참가자 목록</h3>
            
            {participants.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">참가자가 없습니다</h4>
                <p className="text-gray-500">아직 이 프로그램에 참가 신청한 사람이 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        참가자 정보
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        신청일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        결제 상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        참가 상태
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {participants.map((participant) => (
                      <tr key={participant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-[#56007C] flex items-center justify-center">
                                <User className="h-5 w-5 text-white" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{participant.name}</div>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Mail size={12} />
                                  {participant.email}
                                </span>
                                {participant.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone size={12} />
                                    {participant.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(participant.enrollment_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPaymentStatusBadge(participant.payment_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(participant.completion_status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}