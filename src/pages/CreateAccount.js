import { checkNickname, submitOnboarding } from '../api/users.js';

async function checkNicknameDuplicate(nickname) {
  const result = await checkNickname(nickname);
  if (typeof result === 'boolean') return result;
  if (typeof result?.duplicate === 'boolean') return result.duplicate;
  if (typeof result?.duplicated === 'boolean') return result.duplicated;
  if (typeof result?.exists === 'boolean') return result.exists;
  if (typeof result?.available === 'boolean') return !result.available;
  if (typeof result?.isAvailable === 'boolean') return !result.isAvailable;
  return false;
}

function setNicknameAvailability(message, status) {
  const availability = document.querySelector('#account-availability');
  if (!availability) return;
  availability.classList.remove('is-available', 'is-duplicate', 'is-checking');
  availability.classList.remove('hidden');
  if (status) availability.classList.add(status);
  const label = availability.querySelector('em');
  if (label) label.textContent = message;
}

function setAccountValidation(message) {
  const validation = document.querySelector('.account-validation');
  if (!validation) return;
  validation.textContent = message;
  validation.classList.toggle('hidden', !message);
}

export function renderCreateAccountPage() {
  return `
    <section class="account-page">
      <div class="account-window">
        <header class="account-header">
          <a class="account-back-button" href="#/login" aria-label="로그인으로 돌아가기"><svg class="back-arrow-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg></a>
          <div>
            <h1>계정 생성</h1>
            <a href="#/login">로그인으로 돌아가기</a>
          </div>
        </header>
        <main class="account-content">
          <form class="account-card" id="create-account-form" novalidate>
            <h2>계정 설정</h2>
            <div class="account-info-box">
              <strong>필수 정보</strong>
              <span>가구명, 닉네임, 동의 여부</span>
            </div>

            <label>
              <span>가구명 *</span>
              <input name="householdName" type="text" placeholder="가구명을 입력해주세요" required />
            </label>

            <label>
              <span>닉네임 *</span>
              <div class="account-inline">
                <input name="nick" type="text" placeholder="닉네임을 입력하세요" required />
                <button id="check-nickname-button" type="button">중복 확인</button>
              </div>
            </label>
            <p id="account-availability" class="account-availability hidden"><span aria-hidden="true"></span><em></em></p>

            <label>
              <span>주거 정보 *</span>
              <input name="house" type="text" placeholder="건물 / 호수 정보를 입력하세요" required />
            </label>

            <label class="account-consent">
              <input name="consent" type="checkbox" required />
              <span>개인정보 처리방침 및 서비스 약관에 동의합니다.</span>
            </label>

            <p class="account-required">* 필수 항목</p>
            <button class="account-submit" type="submit">계정 생성</button>
            <p class="account-signin-note">이미 계정이 있으신가요?</p>
          </form>

          <p class="account-validation hidden" aria-live="polite"></p>
        </main>
      </div>
    </section>
  `;
}

export function mountCreateAccountPage({ navigate }) {
  document.querySelector('#check-nickname-button')?.addEventListener('click', async () => {
    const button = document.querySelector('#check-nickname-button');
    const nickname = document.querySelector('input[name="nick"]')?.value.trim();
    if (!nickname) {
      setNicknameAvailability('닉네임을 먼저 입력해 주세요.', 'is-duplicate');
      return;
    }

    button.disabled = true;
    setNicknameAvailability('닉네임을 확인하는 중입니다...', 'is-checking');
    try {
      const isDuplicate = await checkNicknameDuplicate(nickname);
      if (isDuplicate) {
        setNicknameAvailability('이미 사용 중인 닉네임입니다.', 'is-duplicate');
      } else {
        setNicknameAvailability('사용 가능한 닉네임입니다.', 'is-available');
      }
    } catch (error) {
      setNicknameAvailability(`닉네임 확인 실패: ${error.message}`, 'is-duplicate');
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector('#create-account-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const householdName = String(formData.get('householdName') || '').trim();
    const nickname = String(formData.get('nick') || '').trim();
    const householdLabel = String(formData.get('house') || '').trim();
    const consentGranted = Boolean(formData.get('consent'));

    if (!householdName || !nickname || !householdLabel || !consentGranted) {
      setAccountValidation('필수 정보를 모두 입력하고 약관에 동의해 주세요.');
      return;
    }

    setAccountValidation('계정을 생성하는 중입니다...');
    try {
      await submitOnboarding({
        displayName: householdName,
        nickname,
        householdLabel
      });
      setAccountValidation('계정이 생성되었습니다. 홈으로 이동합니다...');
      window.setTimeout(() => navigate('#/home'), 250);
    } catch (error) {
      setAccountValidation(`계정 생성 실패: ${error.message}`);
    }
  });
}
