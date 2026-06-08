export function renderLoginPage() {
  return `
    <section class="login-page">
      <div class="login-window">
        <div class="login-stage">
          <div class="login-card">
            <p class="eyebrow">SoundCare MVP</p>
            <h1>소음에 민감한 사용자를 위한 스마트홈 제어 화면</h1>
            <p>로컬 개발 계정으로 로그인한 뒤 민감 가전 설정, 현재 소음 상태, 알림, 루틴, 리포트를 확인합니다.</p>
            <button id="local-login-button" class="primary-button">로그인</button>
            <p class="login-create-account">계정이 없으신가요? <a href="#/create-account">계정 만들기</a></p>
            <small>개인정보 안내
            사용자의 원본 음성은 업로드되거나 다운로드되지 않으며, 외부에 공유되지 않습니다.
            마이크 등 필요한 권한은 로그인 이후, 특정 기능을 사용할 때에만 요청됩니다.
            서비스를 계속 이용하시면 개인정보 안내 및 데이터 이용 안내에 동의한 것으로 간주됩니다.
            </small>
          </div>
        </div>
        <div class="login-footer">
          <span>App version 0.1 · Service notice · No noise event data before authentication</span>
        </div>
      </div>
    </section>
  `;
}

export function mountLoginPage({ navigate }) {
  document.querySelector('#local-login-button')?.addEventListener('click', async () => {
    const button = document.querySelector('#local-login-button');
    const defaultLabel = button.textContent;
    button.disabled = true;
    button.textContent = '로그인 중...';
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    button.disabled = false;
    button.textContent = defaultLabel;
  });
}
