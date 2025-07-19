"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Trash2,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  MapPin,
  Clock,
  EyeOff
} from "lucide-react";
import Link from "next/link";
import { getAdminPrograms } from "@/lib/database/admin";
import { AdminProgramDetails, AdminProgramFilters } from "@/lib/types/admin";
import { toggleProgramActive, deleteProgram } from "@/lib/database/programs-server";
import CreateProgramModal from "./CreateProgramModal";

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

export default function AdminProgramsPage() {
  const [programs, setPrograms] = useState<AdminProgramDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<AdminProgramFilters>({});
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadPrograms();
  }, [filters]);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      const programData = await getAdminPrograms(filters);
      setPrograms(programData);
    } catch (error) {
      console.error('Failed to load programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // For now, we'll filter on the frontend
    // In a real app, you'd pass search to the API
    const filtered = programs.filter(program =>
      program.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      program.instructor.toLowerCase().includes(searchTerm.toLowerCase())
    );
    // For demo purposes, we'll just reload all data
    loadPrograms();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            모집중
          </span>
        );
      case 'full':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            마감
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            취소
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
            완료
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            {status}
          </span>
        );
    }
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 0.9) return 'text-red-600';
    if (rate >= 0.7) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleToggleActive = async (programId: string, isActive: boolean) => {
    try {
      setActionLoading(programId);
      await toggleProgramActive(programId, !isActive);
      await loadPrograms();
    } catch (error) {
      console.error('Error toggling program active:', error);
      alert('프로그램 활성화 상태 변경에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteProgram = async (programId: string, participantCount: number) => {
    if (participantCount > 0) {
      alert('이미 참가자가 있어서 삭제할 수 없습니다.');
      return;
    }

    if (!confirm('정말로 이 프로그램을 삭제하시겠습니까?')) {
      return;
    }

    try {
      setActionLoading(programId);
      await deleteProgram(programId);
      await loadPrograms();
    } catch (error) {
      console.error('Error deleting program:', error);
      alert('프로그램 삭제에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateSuccess = () => {
    loadPrograms();
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">프로그램 관리</h1>
          <p className="text-gray-600">총 {programs.length}개의 프로그램이 등록되어 있습니다</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#56007C] text-white rounded-lg hover:bg-[#56007C]/90 transition-colors"
          >
            <Plus size={16} />
            새 프로그램
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="text-blue-600" size={20} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">전체 프로그램</p>
              <p className="text-2xl font-bold text-gray-900">{programs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">모집중</p>
              <p className="text-2xl font-bold text-gray-900">
                {programs.filter(p => p.status === 'open').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="text-purple-600" size={20} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">총 참가자</p>
              <p className="text-2xl font-bold text-gray-900">
                {programs.reduce((sum, p) => sum + p.enrollment.current, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-[#56007C]/10 rounded-lg">
              <DollarSign className="text-[#56007C]" size={20} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">총 매출</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(programs.reduce((sum, p) => sum + p.pricing.total_revenue, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm p-6"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="프로그램명, 강사명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any || undefined }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
            >
              <option value="">모든 상태</option>
              <option value="open">모집중</option>
              <option value="full">마감</option>
              <option value="completed">완료</option>
              <option value="cancelled">취소</option>
            </select>

            <select
              value={filters.category || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
            >
              <option value="">모든 카테고리</option>
              <option value="team-entrepreneurship">팀기업가정신</option>
              <option value="squeeze-lrs">SQUEEZE LRS</option>
              <option value="challenge-trip">챌린지 트립</option>
              <option value="writer-trip">작가가 되는 트립</option>
            </select>

            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-[#56007C] text-white rounded-lg hover:bg-[#56007C]/90 transition-colors"
            >
              검색
            </button>
          </div>
        </div>
      </motion.div>

      {/* Programs Grid */}
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="grid gap-6"
      >
        {programs.map((program) => (
          <div key={program.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{program.title}</h3>
                    {getStatusBadge(program.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{program.category}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users size={14} />
                      <span>{program.instructor}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{formatDate(program.schedule.start_date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      <span>{program.schedule.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{program.schedule.duration_hours}시간</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/programs/${program.id}/edit`}
                    className="p-2 text-gray-400 hover:text-[#56007C] transition-colors"
                    title="상세보기 및 편집"
                  >
                    <Eye size={16} />
                  </Link>
                  <button
                    onClick={() => handleToggleActive(program.id, program.is_active)}
                    disabled={actionLoading === program.id}
                    className={`p-2 transition-colors ${
                      program.is_active 
                        ? 'text-gray-400 hover:text-orange-600' 
                        : 'text-orange-400 hover:text-[#56007C]'
                    }`}
                    title={program.is_active ? '숨기기' : '표시하기'}
                  >
                    {program.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => handleDeleteProgram(program.id, program.enrollment.current)}
                    disabled={actionLoading === program.id}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Enrollment */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">참가자</span>
                    <span className={`text-sm font-medium ${getUtilizationColor(program.enrollment.utilization_rate)}`}>
                      {(program.enrollment.utilization_rate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {program.enrollment.current} / {program.enrollment.maximum}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-[#56007C] h-2 rounded-full"
                      style={{ width: `${Math.min(program.enrollment.utilization_rate * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Revenue */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">매출</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(program.pricing.total_revenue)}
                  </div>
                  <div className="text-sm text-gray-500">
                    기본가 {formatCurrency(program.pricing.base_price)}
                  </div>
                </div>

                {/* Completion Rate */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">완료율</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {(program.analytics.completion_rate * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">
                    만족도 {program.analytics.satisfaction_score.toFixed(1)}/5
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">빠른 실행</div>
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/admin/programs/${program.id}/participants`}
                      className="text-sm text-[#56007C] hover:underline"
                    >
                      참가자 관리
                    </Link>
                    <Link
                      href={`/admin/programs/${program.id}/analytics`}
                      className="text-sm text-[#56007C] hover:underline"
                    >
                      상세 분석
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {programs.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">프로그램이 없습니다</h3>
          <p className="text-gray-500 mb-4">첫 번째 프로그램을 만들어보세요.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#56007C] text-white rounded-lg hover:bg-[#56007C]/90 transition-colors"
          >
            <Plus size={16} />
            새 프로그램 만들기
          </button>
        </div>
      )}

      <CreateProgramModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}