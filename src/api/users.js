import { buildQuery, isMockApiEnabled, request } from './client.js';
import { defaultAuthUser, withApiFallback } from './fallbacks.js';

const duplicateNicknamesForMock = ['admin', 'test', 'soundcare'];

export async function submitOnboarding(body) {
  if (isMockApiEnabled()) {
    const profile = {
      ...defaultAuthUser(),
      displayName: body.displayName,
      nickname: body.nickname,
      householdLabel: body.householdLabel,
      defaultRoomId: body.defaultRoomId ?? null,
      onboardingCompleted: true
    };
    window.localStorage.setItem('soundcare.onboardingProfile', JSON.stringify(profile));
    return profile;
  }
  return request('/api/users/onboarding', {
    method: 'POST',
    body
  }).catch((error) => withApiFallback(error, () => ({
    ...defaultAuthUser(),
    ...body,
    onboardingCompleted: true
  }), 'submit onboarding'));
}

export async function checkNickname(nickname) {
  if (isMockApiEnabled()) {
    return {
      nickname,
      available: !duplicateNicknamesForMock.includes(String(nickname).toLowerCase())
    };
  }
  return request(`/api/users/nickname/check${buildQuery({ nickname })}`)
    .catch((error) => withApiFallback(error, () => ({ nickname, available: true }), 'nickname check'));
}
