// Employee Login JavaScript
const BASE = window.location.origin;

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error('Invalid credentials');
  const data = await res.json();
  // Expect { token, otpRequired, role }
  setToken(data.token);
  return data;
}

async function verifyOtp(token, otp) {
  const res = await fetch(`${BASE}/api/auth/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ otp })
  });
  if (!res.ok) throw new Error('Invalid OTP');
  const data = await res.json();
  return data; // expected { role }
}

function redirectToDashboard() {
  window.location.href = `${BASE}/employee/dashboard`;
}

function showOtpModal(onSubmit) {
  const modal = document.createElement('div');
  modal.className = 'otp-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Enter OTP</h3>
      <input type="text" id="otpInput" placeholder="OTP Code" />
      <button id="otpSubmit" class="btn primary">Verify</button>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('otpSubmit').addEventListener('click', () => {
    const otp = document.getElementById('otpInput').value.trim();
    onSubmit(otp);
    modal.remove();
  });
}

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  try {
    const loginRes = await login(email, password);
    if (loginRes.otpRequired) {
      showOtpModal(async otp => {
        try {
          const otpRes = await verifyOtp(getToken(), otp);
          // role can be stored if needed
          redirectToDashboard();
        } catch (err) {
          alert(err.message);
        }
      });
    } else {
      // role detection could be stored for later UI decisions
      redirectToDashboard();
    }
  } catch (err) {
    alert(err.message);
  }
});
