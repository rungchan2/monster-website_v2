/**
 * 몬스터 협동조합 상수 정의
 */

// 브랜드 컬러
export const BRAND_COLORS = {
  PRIMARY: '#56007C',     // 메인 보라색
  WHITE: '#FFFFFF',       // 화이트
  LIGHT_GRAY: '#F8F9FA',  // 라이트 그레이
  DARK_GRAY: '#343A40',   // 다크 그레이
} as const

// 애니메이션 설정
export const ANIMATION = {
  DURATION: {
    FAST: 0.2,
    NORMAL: 0.3,
    SLOW: 0.5,
  },
  EASE: {
    IN_OUT: [0.25, 0.1, 0.25, 1],
    SPRING: { type: 'spring', stiffness: 300, damping: 30 },
  },
} as const

// 페이지네이션
export const PAGINATION = {
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 50,
} as const

// 프로그램 상태
export const PROGRAM_STATUS = {
  OPEN: 'open',
  FULL: 'full', 
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const

// 결제 상태
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const

// 구독 상태
export const SUBSCRIPTION_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  PAUSED: 'paused',
} as const

// 파일 제한
export const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
} as const

// 연락처 정보
export const CONTACT = {
  EMAIL: 'info@monster-coop.kr',
  PHONE: '02-1234-5678',
  BUSINESS_HOURS: '평일 09:00 - 18:00',
} as const

// 사이트 정보
export const SITE = {
  NAME: '몬스터 협동조합',
  DESCRIPTION: '팀프러너를 양성하는 No.1 교육 기관',
  SLOGAN: '팀프러너로써 변화된 모습을 세상에 마음껏 펼친다',
  DOMAIN: 'monster-coop.kr',
} as const

// 교육 프로그램 카테고리
export const PROGRAM_CATEGORIES = {
  TEAM_ENTREPRENEURSHIP: 'team-entrepreneurship',
  SQUEEZE_LRS: 'squeeze-lrs',
  CHALLENGE_TRIP: 'challenge-trip',
  WRITER_TRIP: 'writer-trip',
} as const

// 구독 플랜
export const SUBSCRIPTION_PLANS = {
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const

// 문의 유형
export const INQUIRY_TYPES = {
  GENERAL: 'general',
  PROGRAM: 'program',
  SUBSCRIPTION: 'subscription',
  TECHNICAL: 'technical',
  REFUND: 'refund',
} as const

// 알림 타입
export const NOTIFICATION_TYPES = {
  PROGRAM: 'program',
  PAYMENT: 'payment',
  SUBSCRIPTION: 'subscription',
  GENERAL: 'general',
} as const

// 환불 정책
export const REFUND_POLICY = {
  DAYS: 7, // 환불 가능 일수
  MESSAGE: '프로그램 시작 7일 전까지 100% 환불 가능합니다.',
} as const

// API 경로
export const API_ROUTES = {
  PROGRAMS: '/api/programs',
  PAYMENTS: '/api/payments',
  SUBSCRIPTIONS: '/api/subscriptions',
  AUTH: '/api/auth',
  INQUIRIES: '/api/inquiries',
} as const

// 외부 서비스
export const EXTERNAL_SERVICES = {
  NOTION: {
    API_URL: 'https://api.notion.com/v1',
  },
} as const