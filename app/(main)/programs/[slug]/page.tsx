"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Star, 
  ArrowLeft, 
  Heart,
  Share2,
  CheckCircle,
  AlertCircle,
  User
} from "lucide-react";
import Link from "next/link";
import { getProgramBySlug } from "@/lib/database/programs-client";
import { getCurrentUser } from "@/lib/auth";
import { Database } from "@/types/database";
import Footer from "@/components/Footer";

type Program = Database['public']['Tables']['programs']['Row'] & {
  program_categories?: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    description: string | null;
  } | null;
  program_participants?: Array<{
    id: string;
    status: string | null;
    created_at: string | null;
    profiles: {
      id: string;
      full_name: string | null;
    };
  }>;
};

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true); 
  const [user, setUser] = useState<any>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'curriculum' | 'instructor' | 'reviews'>('overview');

  const slug = params?.slug as string;

  useEffect(() => {
    if (slug) {
      loadProgram();
      loadUser();
    }
  }, [slug]);

  // 프로그램과 사용자 정보가 모두 로드된 후 등록 확인
  useEffect(() => {
    if (user && program) {
      checkUserRegistration(user.id, program.id);
    }
  }, [user, program]);

  const loadProgram = async () => {
    try {
      setLoading(true);
      const response = await getProgramBySlug(slug);
      if (response.data) {
        setProgram(response.data);
      } else {
        router.push('/404');
      }
    } catch (error) {
      console.error('Failed to load program:', error);
      router.push('/404');
    } finally {
      setLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      // checkUserRegistration은 별도 useEffect에서 처리
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const checkUserRegistration = async (userId: string, programId: string) => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('program_participants')
        .select('id, status, payment_status')
        .eq('user_id', userId)
        .eq('program_id', programId)
        .eq('status', 'confirmed') // 결제 완료된 등록만 확인
        .eq('payment_status', 'paid')
        .limit(1);

      if (!error && data && data.length > 0) {
        setHasRegistered(true);
      }
    } catch (error) {
      console.error('Failed to check user registration:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case 'beginner': return '초급';
      case 'intermediate': return '중급';
      case 'advanced': return '고급';
      default: return '전체';
    }
  };

  const isEarlyBird = program?.early_bird_deadline && new Date(program.early_bird_deadline) > new Date();
  const daysUntilStart = program?.start_date ? Math.ceil((new Date(program.start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const spotsLeft = program ? (program.max_participants || 0) - (program.current_participants || 0) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#56007C] mx-auto"></div>
          <p className="mt-4 text-gray-600">프로그램 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!program) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/programs"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-[#56007C] transition-colors"
          >
            <ArrowLeft size={20} />
            프로그램 목록으로 돌아가기
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left: Program Info */}
            <motion.div
              initial="initial"
              animate="animate"
              variants={staggerContainer}
            >
              {/* Category & Featured Badge */}
              <motion.div variants={fadeInUp} className="flex items-center gap-3 mb-4">
                <span className="text-[#56007C] font-semibold">
                  {program.program_categories?.name}
                </span>
                {program.is_featured && (
                  <span className="bg-[#56007C] text-white px-2 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Star size={14} />
                    추천
                  </span>
                )}
                <span className={`px-2 py-1 rounded-full text-sm font-semibold ${getDifficultyColor(program.difficulty_level || '')}`}>
                  {getDifficultyLabel(program.difficulty_level || '')}
                </span>
              </motion.div>

              {/* Title */}
              <motion.h1
                variants={fadeInUp}
                className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
              >
                {program.title}
              </motion.h1>

              {/* Description */}
              <motion.p
                variants={fadeInUp}
                className="text-lg text-gray-600 mb-6"
              >
                {program.description}
              </motion.p>

              {/* Key Info */}
              <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Calendar className="text-[#56007C]" size={24} />
                  <div>
                    <div className="font-semibold text-gray-900">시작일</div>
                    <div className="text-sm text-gray-600">{formatDate(program.start_date!)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Clock className="text-[#56007C]" size={24} />
                  <div>
                    <div className="font-semibold text-gray-900">총 시간</div>
                    <div className="text-sm text-gray-600">{program.duration_hours}시간</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <MapPin className="text-[#56007C]" size={24} />
                  <div>
                    <div className="font-semibold text-gray-900">장소</div>
                    <div className="text-sm text-gray-600">{program.location}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Users className="text-[#56007C]" size={24} />
                  <div>
                    <div className="font-semibold text-gray-900">참가자</div>
                    <div className="text-sm text-gray-600">{program.current_participants}/{program.max_participants}명</div>
                  </div>
                </div>
              </motion.div>

              {/* Tags */}
              {program.tags && program.tags.length > 0 && (
                <motion.div variants={fadeInUp} className="flex flex-wrap gap-2 mb-6">
                  {program.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-[#56007C]/10 text-[#56007C] text-sm rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </motion.div>
              )}

              {/* Action Buttons */}
              <motion.div variants={fadeInUp} className="flex gap-3">
                <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Heart size={20} className={isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-600'} />
                </button>
                <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Share2 size={20} className="text-gray-600" />
                </button>
              </motion.div>
            </motion.div>

            {/* Right: Booking Card */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="lg:sticky lg:top-8"
            >
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
                {/* Price */}
                <div className="mb-6">
                  {isEarlyBird ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-semibold">
                          얼리버드 특가
                        </span>
                        <span className="text-sm text-gray-500">
                          {Math.ceil((new Date(program.early_bird_deadline!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}일 남음
                        </span>
                      </div>
                      <div className="text-3xl font-bold text-[#56007C] mb-1">
                        ₩{formatPrice(program.early_bird_price!)}
                      </div>
                      <div className="text-lg text-gray-500 line-through">
                        ₩{formatPrice(program.base_price)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-[#56007C]">
                      ₩{formatPrice(program.base_price)}
                    </div>
                  )}
                </div>

                {/* Status Alerts */}
                <div className="space-y-3 mb-6">
                  {daysUntilStart <= 7 && (
                    <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <AlertCircle className="text-orange-600" size={16} />
                      <span className="text-sm text-orange-800">
                        {daysUntilStart}일 후 시작! 서둘러 신청하세요.
                      </span>
                    </div>
                  )}
                  {spotsLeft <= 3 && spotsLeft > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="text-red-600" size={16} />
                      <span className="text-sm text-red-800">
                        {spotsLeft}자리만 남았습니다!
                      </span>
                    </div>
                  )}
                  {program.status === 'full' && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <AlertCircle className="text-gray-600" size={16} />
                      <span className="text-sm text-gray-800">
                        마감된 프로그램입니다.
                      </span>
                    </div>
                  )}
                </div>

                {/* Booking Button */}
                {program.status === 'open' ? (
                  <div className="space-y-2">
                    {hasRegistered && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                        <CheckCircle size={16} />
                        <span>이미 신청한 프로그램입니다</span>
                      </div>
                    )}
                    <Link
                      href={user ? `/programs/${program.slug}/book` : '/auth/login'}
                      className="w-full bg-[#56007C] text-white py-3 px-4 rounded-lg hover:bg-[#56007C]/90 transition-colors font-semibold text-center block"
                    >
                      {user ? (hasRegistered ? '추가 신청하기' : '지금 신청하기') : '로그인 후 신청하기'}
                    </Link>
                  </div>
                ) : (
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 py-3 px-4 rounded-lg cursor-not-allowed font-semibold"
                  >
                    신청 마감
                  </button>
                )}

                {/* Additional Info */}
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span>최소 {program.min_participants}명 이상 모집 시 확정</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span>7일 전까지 무료 취소</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span>수료증 발급</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto">
            {[
              { id: 'overview', label: '프로그램 개요' },
              { id: 'curriculum', label: '커리큘럼' },
              { id: 'instructor', label: '강사 소개' },
              { id: 'reviews', label: '후기' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`px-6 py-4 border-b-2 font-semibold whitespace-nowrap transition-colors ${
                  selectedTab === tab.id
                    ? 'border-[#56007C] text-[#56007C]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Tab Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            key={selectedTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {selectedTab === 'overview' && (
              <div className="prose prose-lg max-w-4xl">
                <h3>프로그램 상세 정보</h3>
                <p>{program.description}</p>
                
                <h4>일정 및 시간</h4>
                <ul>
                  <li>시작일: {formatDate(program.start_date!)}</li>
                  <li>종료일: {formatDate(program.end_date!)}</li>
                  <li>시간: {formatTime(program.start_time!)} - {formatTime(program.end_time!)}</li>
                  <li>총 교육시간: {program.duration_hours}시간</li>
                </ul>

                <h4>참가 대상</h4>
                <ul>
                  <li>난이도: {getDifficultyLabel(program.difficulty_level || '')}</li>
                  <li>최대 참가인원: {program.max_participants}명</li>
                  <li>최소 참가인원: {program.min_participants}명</li>
                </ul>
              </div>
            )}

            {selectedTab === 'curriculum' && (
              <div className="prose prose-lg max-w-4xl">
                <h3>커리큘럼</h3>
                <p>상세한 커리큘럼은 Notion 페이지에서 확인하실 수 있습니다.</p>
                {program.notion_page_id && (
                  <div className="not-prose">
                    <div className="bg-gray-100 p-8 rounded-lg text-center">
                      <p className="text-gray-600 mb-4">커리큘럼 상세 내용</p>
                      <button className="bg-[#56007C] text-white px-6 py-2 rounded-lg hover:bg-[#56007C]/90 transition-colors">
                        Notion에서 자세히 보기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'instructor' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">강사 소개</h3>
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <div className="flex items-start gap-6">
                    <div className="w-24 h-24 bg-[#56007C]/10 rounded-full flex items-center justify-center">
                      <User className="text-[#56007C]" size={32} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-900 mb-2">
                        {program.instructor_name}
                      </h4>
                      <p className="text-gray-600">
                        {program.instructor_bio}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'reviews' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">참가자 후기</h3>
                <div className="text-center py-12 text-gray-500">
                  <p>아직 등록된 후기가 없습니다.</p>
                  <p className="text-sm mt-2">프로그램 참가 후 첫 번째 후기를 남겨주세요!</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}