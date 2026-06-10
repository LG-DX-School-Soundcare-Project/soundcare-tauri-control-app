import { loginWithLocalDev } from '../api/authApi.js';

export function renderLoginPage() {
  return `
    <section class="login-page">
      <div class="login-window">
        <div class="login-stage">
          <div class="login-card">
            <p class="eyebrow">사운드케어 MVP</p>
            <h1>SoundCare ThinQ Clone</h1>
            <p>메인 대시보드, 3D 홈, 기기, 리포트를 확인하려면 로그인하세요.</p>
            <button id="local-login-button" class="primary-button">
              <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/google/google-original.svg" alt="" aria-hidden="true" />
              <span>로그인</span>
            </button>
            <p id="login-status" aria-live="polite"></p>
            <p class="login-create-account">계정이 없으신가요? <a href="#/create-account">계정 만들기</a></p>
          </div>
        </div>
        <div class="login-footer">
          <span>앱 버전 0.1</span>
        </div>
      </div>
    </section>
  `;
}

export function mountLoginPage({ navigate }) {
  document.querySelector('#local-login-button')?.addEventListener('click', async () => {
    const button = document.querySelector('#local-login-button');
    const buttonLabel = button?.querySelector('span');
    const status = document.querySelector('#login-status');
    button.disabled = true;
    if (buttonLabel) buttonLabel.textContent = '로그인 중...';
    if (status) status.textContent = '백엔드 토큰을 요청하는 중입니다...';

    try {
      await loginWithLocalDev();
      if (status) status.textContent = '로그인이 완료되었습니다.';
      navigate('#/home');
    } catch (error) {
      if (status) status.textContent = `로그인 실패: ${error.message}`;
      button.disabled = false;
      if (buttonLabel) buttonLabel.textContent = '로그인';
    }
  });
}
