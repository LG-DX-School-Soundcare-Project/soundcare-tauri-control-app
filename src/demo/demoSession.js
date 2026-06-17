// 시연(데모) 모드 부트스트랩.
// - 백엔드 연결은 전부 끊긴 상태(목 데이터)지만, GPT 상세 리포트만은 실제 호출을 유지한다.
// - 그 실제 호출에 필요한 유효 JWT를 얻기 위해 시작 시 자동으로 로그인한다.
// - 로그인 화면은 건너뛰고 곧바로 홈으로 진입한다.
import { isDemoMode, tokenStorage } from '../api/client.js';
import { loginWithGoogle } from '../api/authApi.js';

export { isDemoMode };

let bootstrapPromise = null;

// 데모 세션 보장: 토큰이 없으면 실제 백엔드로 자동 로그인(실패 시 데모 토큰 폴백).
export function ensureDemoSession() {
  if (!isDemoMode()) return Promise.resolve();
  if (tokenStorage.get()) return Promise.resolve();
  if (!bootstrapPromise) {
    bootstrapPromise = loginWithGoogle()
      .catch(() => null)
      .finally(() => {
        bootstrapPromise = null;
      });
  }
  return bootstrapPromise;
}

const AUTH_HASHES = new Set(['', '#', '#/', '#/login', '#/create-account']);

// 데모 모드에서 인증 화면(로그인/회원가입)으로 가려는 시도를 홈으로 우회시킨다.
// 우회 시 true를 반환한다.
export function redirectAuthHashToHome() {
  if (!isDemoMode()) return false;
  const hash = window.location.hash || '';
  if (AUTH_HASHES.has(hash)) {
    window.location.hash = '#/home';
    return true;
  }
  return false;
}
