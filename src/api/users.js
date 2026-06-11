import { isMockApiEnabled, request } from './client.js';
import { defaultAuthUser, withApiFallback } from './fallbacks.js';

// MVP 기준: /api/users/onboarding, /api/users/nickname/check는 삭제되었다.
// 프로필 수정은 PATCH /api/users/me 하나로 처리한다.

export async function getMyProfile() {
  if (isMockApiEnabled()) {
    return defaultAuthUser();
  }
  return request('/api/users/me')
    .catch((error) => withApiFallback(error, defaultAuthUser, 'my profile'));
}

export async function updateMyProfile(body) {
  if (isMockApiEnabled()) {
    const profile = { ...defaultAuthUser(), ...body };
    window.localStorage.setItem('soundcare.profile', JSON.stringify(profile));
    return profile;
  }
  return request('/api/users/me', {
    method: 'PATCH',
    body
  }).catch((error) => withApiFallback(error, () => ({ ...defaultAuthUser(), ...body }), 'update profile'));
}

/**
 * 기존 온보딩 화면 호환용. nickname/householdLabel/defaultRoomId만 서버에 반영한다.
 */
export async function submitOnboarding(body) {
  return updateMyProfile({
    nickname: body.nickname ?? body.displayName,
    householdLabel: body.householdLabel,
    defaultRoomId: body.defaultRoomId ?? null
  });
}

/**
 * MVP 기준: 서버 닉네임 중복 검사 API는 삭제되었다. 로컬 형식 검증만 수행한다.
 */
export async function checkNickname(nickname) {
  const normalized = String(nickname ?? '').trim();
  return {
    nickname: normalized,
    available: normalized.length >= 2 && normalized.length <= 100
  };
}
