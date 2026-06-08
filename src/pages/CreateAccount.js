import { buildQuery, isMockApiEnabled, request } from '../api/client.js';

const DUPLICATE_NICKNAMES_FOR_MOCK = ['admin', 'test', 'soundcare'];

async function checkNicknameDuplicate(nickname) {
  if (isMockApiEnabled()) {
    return DUPLICATE_NICKNAMES_FOR_MOCK.includes(nickname.toLowerCase());
  }

  const result = await request(`/api/users/nickname/check${buildQuery({ nickname })}`);
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
  if (status) availability.classList.add(status);
  availability.lastChild.textContent = message;
}

export function renderCreateAccountPage() {
  return `
    <section class="account-page">
      <div class="account-window">
        <header class="account-header">
          <a class="account-back-button" href="#/login" aria-label="Back to sign in"><img src="/src/styles/나가기.png" alt="" /></a>
          <div>
            <h1>계정 생성하기</h1>
            <a href="#/login">로그인 페이지로 돌아가기</a>
          </div>
        </header>
        <main class="account-content">
          <form class="account-card" id="create-account-form">
            <h2>계정 생성</h2>
            <div class="account-info-box">
              <strong>작성해야 하는 정보</strong>
              <span>Household, nickname, consent</span>
            </div>

            <label>
              <span>Household Name *</span>
              <input name="householdName" type="text" value="Moonlight House" required />
            </label>

            <label>
              <span>Nick *</span>
              <div class="account-inline">
                <input name="nick" type="text" placeholder="사용하실 닉네임을 작성해주세요 ex. 챱츄챱챱츄" required />
                <button id="check-nickname-button" type="button">Check duplicate</button>
              </div>
            </label>
            <p id="account-availability" class="account-availability"><span></span>Nickname available</p>

            <label>
              <span>House *</span>
              <input name="house" type="text" placeholder="Building / unit details" required />
            </label>

            <label class="account-consent">
              <input name="consent" type="checkbox" required />
              <span>I agree to privacy policy and service terms.</span>
            </label>

            <p class="account-required">* 필수입니다</p>
            <button class="account-submit" type="submit">Create account</button>
            <p class="account-signin-note">이미 생성되어 있는 계정입니다.</p>
          </form>

          <p class="account-validation">Validation and missing consent messages appear here.</p>
        </main>
      </div>
    </section>
  `;
}

export function mountCreateAccountPage() {
  document.querySelector('#check-nickname-button')?.addEventListener('click', async () => {
    const button = document.querySelector('#check-nickname-button');
    const nickname = document.querySelector('input[name="nick"]')?.value.trim();
    if (!nickname) {
      setNicknameAvailability('닉네임을 입력해주세요.', 'is-duplicate');
      return;
    }

    button.disabled = true;
    setNicknameAvailability('닉네임 중복 확인 중입니다.', 'is-checking');
    try {
      const isDuplicate = await checkNicknameDuplicate(nickname);
      if (isDuplicate) {
        setNicknameAvailability('해당 닉네임이 중복되었습니다. 다른 닉네임을 선택해주세요.', 'is-duplicate');
      } else {
        setNicknameAvailability('해당 닉네임은 가능합니다', 'is-available');
      }
    } catch (error) {
      setNicknameAvailability(`닉네임 중복 확인에 실패했습니다: ${error.message}`, 'is-duplicate');
    } finally {
      button.disabled = false;
    }
  });

  document.querySelector('#create-account-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
  });
}
