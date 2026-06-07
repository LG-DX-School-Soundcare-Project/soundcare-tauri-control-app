import { loginWithLocalDev } from '../api/authApi.js';

export function renderLoginPage() {
  return `
    <section class="page page--center login-page">
      <div class="login-card">
        <p class="eyebrow">SoundCare MVP</p>
        <h1>소음에 민감한 사용자를 위한 스마트홈 제어 화면</h1>
        <p>로컬 개발 계정으로 로그인한 뒤 민감 가전 설정, 현재 소음 상태, 알림, 루틴, 리포트를 확인합니다.</p>
        <button id="local-login-button" class="primary-button">로컬 개발 로그인</button>
        <small>개발 모드에서는 placeholder 계정으로 Spring API 토큰을 발급받습니다. 실제 Google OAuth는 연결하지 않습니다.</small>
      </div>
    </section>
  `;
}

export function mountLoginPage({ navigate }) {
  document.querySelector('#local-login-button')?.addEventListener('click', async () => {
    const button = document.querySelector('#local-login-button');
    button.disabled = true;
    button.textContent = '로그인 중...';
    try {
      await loginWithLocalDev();
      navigate('#/home');
    } catch (error) {
      window.alert(`로컬 로그인 실패: ${error.message}`);
    } finally {
      button.disabled = false;
      button.textContent = '로컬 개발 로그인';
    }
  });
}
