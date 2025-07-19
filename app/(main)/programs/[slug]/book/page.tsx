"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle,
  AlertCircle,
  User,
  CreditCard
} from "lucide-react";
import Link from "next/link";
import { getProgramBySlug } from "@/lib/database/programs-client";
import { getCurrentUser } from "@/lib/auth";
import { createReservation } from "@/lib/database/reservations";
import { 
  generateOrderId, 
  formatAmount 
} from "@/lib/payments/nicepay";
import { useNicePayConfig } from "@/lib/hooks/useNicePayConfig";

import { Database } from "@/types/database";
import Footer from "@/components/Footer";
import Script from "next/script";

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

interface BookingForm {
  participantName: string;
  participantEmail: string;
  participantPhone: string;
  emergencyContact: string;
  dietaryRestrictions: string;
  specialRequests: string;
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
}

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

export default function ProgramBookingPage() {
  const params = useParams();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // NicePay 관련 state
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  
  // NicePay 설정을 안전하게 가져오기
  const { config: nicePayConfig, loading: configLoading, error: configError } = useNicePayConfig();

  // 디버깅을 위한 로그
  useEffect(() => {
    console.log('NicePay Config Loading:', configLoading);
    console.log('NicePay Config:', nicePayConfig);
    console.log('NicePay Config Error:', configError);
    console.log('SDK Loaded:', sdkLoaded);
  }, [configLoading, nicePayConfig, configError, sdkLoaded]);
  
  const [form, setForm] = useState<BookingForm>({
    participantName: '',
    participantEmail: '',
    participantPhone: '',
    emergencyContact: '',
    dietaryRestrictions: '',
    specialRequests: '',
    agreedToTerms: false,
    agreedToPrivacy: false
  });

  const slug = params?.slug as string;

  useEffect(() => {
    if (slug) {
      loadProgram();
      loadUser();
    }
  }, [slug]);

  const loadProgram = async () => {
    try {
      setLoading(true);
      const response = await getProgramBySlug(slug);
      if (response.data) {
        setProgram(response.data);
        
        // 프로그램 상태 확인
        if (response.data.status !== 'open') {
          setError('이 프로그램은 현재 신청할 수 없습니다.');
        }
      } else {
        router.push('/programs');
      }
    } catch (error) {
      console.error('Failed to load program:', error);
      router.push('/programs');
    } finally {
      setLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }
      setUser(currentUser);
      
      // 사용자 정보로 폼 초기화
      setForm(prev => ({
        ...prev,
        participantEmail: currentUser.email || '',
        participantName: currentUser.user_metadata?.full_name || ''
      }));
    } catch (error) {
      console.error('Failed to load user:', error);
      router.push('/auth/login');
    }
  };

  const handleInputChange = (field: keyof BookingForm, value: string | boolean) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!form.participantName.trim()) {
      setError('참가자 이름을 입력해주세요.');
      return false;
    }
    if (!form.participantEmail.trim()) {
      setError('이메일을 입력해주세요.');
      return false;
    }
    if (!form.participantPhone.trim()) {
      setError('연락처를 입력해주세요.');
      return false;
    }
    if (!form.emergencyContact.trim()) {
      setError('비상연락처를 입력해주세요.');
      return false;
    }
    if (!form.agreedToTerms) {
      setError('이용약관에 동의해주세요.');
      return false;
    }
    if (!form.agreedToPrivacy) {
      setError('개인정보처리방침에 동의해주세요.');
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (!validateForm() || !program || !user) return;

    try {
      setPaymentProcessing(true);
      setError(null);

      const effectivePrice = getEffectivePrice(program);
      const orderId = generateOrderId(user.id, program.id);
      
      // NicePay 결제 요청 - 결제 완료 후 서버에서 program_participants에 등록
      if (typeof window !== 'undefined' && (window as any).AUTHNICE && nicePayConfig) {
        const AUTHNICE = (window as any).AUTHNICE;
        
        // 결제 정보를 세션에 저장 (결제 완료 후 서버에서 사용)
        sessionStorage.setItem('nicepay_payment_data', JSON.stringify({
          program_id: program.id,
          participant_name: form.participantName,
          participant_email: form.participantEmail,
          participant_phone: form.participantPhone,
          emergency_contact: form.emergencyContact,
          dietary_restrictions: form.dietaryRestrictions || null,
          special_requests: form.specialRequests || null,
          amount_paid: effectivePrice.price
        }));
        
        AUTHNICE.requestPay({
          clientId: nicePayConfig.clientId,
          method: 'card',
          orderId: orderId,
          amount: effectivePrice.price,
          goodsName: program.title,
          buyerName: form.participantName,
          buyerEmail: form.participantEmail,
          buyerPhone: form.participantPhone,
          returnUrl: `${window.location.origin}/api/nicepay/process`,
          mallReserved: JSON.stringify({
            program_id: program.id,
            user_id: user.id,
            participant_name: form.participantName,
            participant_email: form.participantEmail,
            participant_phone: form.participantPhone,
            emergency_contact: form.emergencyContact,
            dietary_restrictions: form.dietaryRestrictions || null,
            special_requests: form.specialRequests || null
          }),
          fnError: function(result: any) {
            console.error('NicePay 결제 오류:', result);
            setPaymentProcessing(false);
            setError(`결제 처리 중 오류가 발생했습니다: ${result.errorMsg || result.resultMsg || '알 수 없는 오류'}`);
          }
        });
      } else {
        setError('결제 시스템이 초기화되지 않았습니다.');
      }
      
    } catch (error) {
      console.error('결제 처리 실패:', error);
      setError('결제 처리 중 오류가 발생했습니다.');
    } finally {
      // paymentProcessing은 콜백에서 처리
    }
  };


  const formatPrice = (price: number) => {
    return formatAmount(price);
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

  const getEffectivePrice = (program: Program): { price: number; isEarlyBird: boolean } => {
    const now = new Date();
    const earlyBirdDeadline = program.early_bird_deadline ? new Date(program.early_bird_deadline) : null;
    
    const isEarlyBird = earlyBirdDeadline && 
                       now <= earlyBirdDeadline && 
                       program.early_bird_price !== null;

    return {
      price: isEarlyBird ? program.early_bird_price! : program.base_price,
      isEarlyBird: !!isEarlyBird
    };
  };

  if (loading || configLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#56007C] mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {loading ? '프로그램 정보를 불러오는 중...' : '결제 시스템을 준비하는 중...'}
          </p>
        </div>
      </div>
    );
  }

  if (!program || error || configError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">예약할 수 없습니다</h2>
          <p className="text-gray-600 mb-4">
            {error || configError || '프로그램을 찾을 수 없습니다.'}
          </p>
          <Link
            href={`/programs/${slug}`}
            className="bg-[#56007C] text-white px-6 py-2 rounded-lg hover:bg-[#56007C]/90 transition-colors"
          >
            프로그램 상세로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const effectivePrice = getEffectivePrice(program);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href={`/programs/${slug}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-[#56007C] transition-colors"
          >
            <ArrowLeft size={20} />
            프로그램 상세로 돌아가기
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <motion.div
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <motion.h1 
                variants={fadeInUp}
                className="text-2xl font-bold text-gray-900 mb-6"
              >
                프로그램 신청하기
              </motion.h1>

              {error && (
                <motion.div 
                  variants={fadeInUp}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="text-red-600" size={20} />
                    <span className="text-red-800">{error}</span>
                  </div>
                </motion.div>
              )}

              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handlePayment(); }}>
                {/* 참가자 정보 */}
                <motion.div variants={fadeInUp}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User size={20} />
                    참가자 정보
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        참가자 이름 *
                      </label>
                      <input
                        type="text"
                        value={form.participantName}
                        onChange={(e) => handleInputChange('participantName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                        placeholder="실명을 입력해주세요"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        이메일 *
                      </label>
                      <input
                        type="email"
                        value={form.participantEmail}
                        onChange={(e) => handleInputChange('participantEmail', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                        placeholder="example@email.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        연락처 *
                      </label>
                      <input
                        type="tel"
                        value={form.participantPhone}
                        onChange={(e) => handleInputChange('participantPhone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                        placeholder="010-0000-0000"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        비상연락처 *
                      </label>
                      <input
                        type="tel"
                        value={form.emergencyContact}
                        onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                        placeholder="010-0000-0000"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* 추가 정보 */}
                <motion.div variants={fadeInUp}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    추가 정보 (선택사항)
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        식단 제한사항
                      </label>
                      <textarea
                        value={form.dietaryRestrictions}
                        onChange={(e) => handleInputChange('dietaryRestrictions', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                        placeholder="알레르기, 종교적 제약 등이 있으시면 알려주세요"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        특별 요청사항
                      </label>
                      <textarea
                        value={form.specialRequests}
                        onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56007C] focus:border-transparent"
                        placeholder="접근성 지원, 좌석 배치 등 특별한 요청사항이 있으시면 알려주세요"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* 약관 동의 */}
                <motion.div variants={fadeInUp}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    약관 동의
                  </h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={form.agreedToTerms}
                        onChange={(e) => handleInputChange('agreedToTerms', e.target.checked)}
                        className="mt-1 w-4 h-4 text-[#56007C] border-gray-300 rounded focus:ring-[#56007C]"
                      />
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">이용약관</span>에 동의합니다. *
                        <Link href="/privacy#terms" target="_blank" className="text-[#56007C] hover:underline ml-1">
                          전문 보기
                        </Link>
                      </span>
                    </label>
                    
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={form.agreedToPrivacy}
                        onChange={(e) => handleInputChange('agreedToPrivacy', e.target.checked)}
                        className="mt-1 w-4 h-4 text-[#56007C] border-gray-300 rounded focus:ring-[#56007C]"
                      />
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">개인정보처리방침</span>에 동의합니다. *
                        <Link href="/privacy#privacy" target="_blank" className="text-[#56007C] hover:underline ml-1">
                          전문 보기
                        </Link>
                      </span>
                    </label>
                  </div>
                </motion.div>

                {/* 결제 버튼 */}
                <motion.div variants={fadeInUp} className="pt-6">
                  {!sdkLoaded && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#56007C] mx-auto mb-2"></div>
                      <p className="text-gray-600 text-sm">결제 시스템을 준비하는 중...</p>
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={!sdkLoaded || paymentProcessing}
                    className="w-full bg-[#56007C] text-white py-3 px-4 rounded-lg hover:bg-[#56007C]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {paymentProcessing ? '결제 처리 중...' : `₩${formatPrice(getEffectivePrice(program).price)} 결제하기`}
                  </button>
                </motion.div>
              </form>
            </motion.div>
          </div>

          {/* Sidebar - 프로그램 요약 */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-lg shadow-sm p-6 sticky top-8"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">예약 요약</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{program.title}</h4>
                  <p className="text-sm text-gray-600">{program.program_categories?.name}</p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span>{formatDate(program.start_date!)} - {formatDate(program.end_date!)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <span>{formatTime(program.start_time!)} - {formatTime(program.end_time!)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-gray-400" />
                    <span>{program.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    <span>{program.current_participants}/{program.max_participants}명</span>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">참가비</span>
                    <div className="text-right">
                      {effectivePrice.isEarlyBird ? (
                        <div>
                          <div className="text-lg font-bold text-[#56007C]">
                            ₩{formatPrice(effectivePrice.price)}
                          </div>
                          <div className="text-sm text-gray-500 line-through">
                            ₩{formatPrice(program.base_price)}
                          </div>
                          <div className="text-xs text-red-600">얼리버드 할인</div>
                        </div>
                      ) : (
                        <div className="text-lg font-bold text-[#56007C]">
                          ₩{formatPrice(effectivePrice.price)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle size={16} className="text-green-600" />
                    <span>7일 전까지 무료 취소</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
      
      {/* NicePay JS SDK */}
      {nicePayConfig && (
        <Script
          src={nicePayConfig.jsSDKUrl}
          onLoad={() => {
            console.log('NicePay SDK 로드 성공:', nicePayConfig.jsSDKUrl);
            console.log('AUTHNICE 객체:', typeof window !== 'undefined' ? (window as any).AUTHNICE : 'undefined');
            setSdkLoaded(true);
          }}
          onError={(e) => {
            console.error('NicePay SDK 로드 실패:', e);
            console.error('SDK URL:', nicePayConfig.jsSDKUrl);
            setError('결제 시스템 로드에 실패했습니다.');
          }}
          onReady={() => {
            console.log('NicePay SDK Ready');
          }}
        />
      )}
    </div>
  );
}