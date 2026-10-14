const form = document.querySelector('#loginForm');
const usernameInput = document.querySelector('#username');
const passwordInput = document.querySelector('#password');
const errorBox = document.querySelector('#loginError');
const submitButton = document.querySelector('#loginButton');
const togglePasswordButton = document.querySelector('#togglePassword');
const rememberInput = document.querySelector('[name="remember"]');

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function clearError() {
  errorBox.textContent = '';
  errorBox.classList.add('hidden');
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? 'Đang đăng nhập...' : 'Đăng nhập';
}

if (togglePasswordButton) {
  togglePasswordButton.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    togglePasswordButton.textContent = isHidden ? 'Ẩn' : 'Hiện';
  });
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      showError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);

    try {
      const data = await window.OngVangApp.apiRequest('/api/auth/login', {
        method: 'POST',
        body: {
          username,
          password
        }
      });

      if (!data?.success) {
        throw new Error(data?.message || 'Đăng nhập thất bại.');
      }

      window.OngVangApp.setAuth(data.token, data.user, Boolean(rememberInput?.checked));
      window.OngVangApp.showToast('Đăng nhập thành công', 'success');

      setTimeout(() => {
        window.location.href = './home.html';
      }, 500);
    } catch (error) {
      showError(error.message || 'Tên đăng nhập hoặc mật khẩu không đúng.');
    } finally {
      setLoading(false);
    }
  });
}
