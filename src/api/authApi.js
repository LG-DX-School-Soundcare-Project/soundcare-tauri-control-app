import { DEV_AUTH_PROFILE, request, requestLive, tokenStorage, isMockApiEnabled, isDemoMode } from './client.js';
import { DEMO_AUTH_TOKEN, defaultAuthUser, withApiFallback } from './fallbacks.js';

export async function loginWithGoogle(idToken, profile = {}) {
  const authProfile = {
    ...DEV_AUTH_PROFILE,
    ...profile,
    idToken: idToken || profile.idToken || DEV_AUTH_PROFILE.idToken
  };

  // 데모 모드: 다른 호출은 전부 목이지만, GPT 상세 리포트가 실제 백엔드를 호출하려면
  // 유효한 JWT가 필요하다. 그래서 인증만큼은 실제 백엔드로 로그인해 토큰을 받아둔다.
  // 백엔드/네트워크가 없으면 데모 토큰으로 폴백해 앱은 계속 동작한다(GPT만 폴백 텍스트).
  if (isDemoMode()) {
    const result = await requestLive('/api/auth/google', {
      method: 'POST',
      body: authProfile
    }).catch(() => ({ accessToken: DEMO_AUTH_TOKEN, user: defaultAuthUser(authProfile) }));
    if (result?.accessToken) {
      tokenStorage.set(result.accessToken);
    }
    // 데모에서는 화면 표시 이름을 고정(demoSession.pinDemoNickname)하므로
    // 백엔드 응답 닉네임으로 localStorage를 덮어쓰지 않는다.
    return result;
  }

  if (isMockApiEnabled()) {
    const token = DEMO_AUTH_TOKEN;
    tokenStorage.set(token);
    return {
      accessToken: token,
      user: defaultAuthUser(authProfile)
    };
  }

  const result = await request('/api/auth/google', {
    method: 'POST',
    body: authProfile
  }).catch((error) => withApiFallback(error, () => ({
    accessToken: DEMO_AUTH_TOKEN,
    user: defaultAuthUser(authProfile)
  }), 'Google login'));

  if (result?.accessToken) {
    tokenStorage.set(result.accessToken);
  }
  const nickname = result?.nickname ?? result?.user?.nickname;
  if (nickname && typeof window !== 'undefined') {
    window.localStorage.setItem('soundcare.nickname', nickname);
  }
  return result;
}

export function loginWithLocalDev() {
  // 테스트용: 백엔드 없이 데모 토큰으로 즉시 로그인
  const token = DEMO_AUTH_TOKEN;
  tokenStorage.set(token);
  return Promise.resolve({
    accessToken: token,
    user: defaultAuthUser(DEV_AUTH_PROFILE)
  });
}

export async function getMe() {
  if (isMockApiEnabled()) {
    return defaultAuthUser(DEV_AUTH_PROFILE);
  }
  return request('/api/auth/me')
    .catch((error) => withApiFallback(error, () => defaultAuthUser(DEV_AUTH_PROFILE), 'current user'));
}

export function logout() {
  tokenStorage.clear();
}
