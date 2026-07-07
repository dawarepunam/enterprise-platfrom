document.addEventListener("DOMContentLoaded", () => {
    showLogoutMessage();
    initializeNavigationState();
    applyAuthPageRolePreset();
    initAuthInteractions();
    initLogin();
    initRegister();
    initForgotPassword();
    initVerifyOtp();
    initResetPassword();
});

// Normalize role labels coming from mixed legacy pages and API payloads.
function normalizeRole(role) {
    const value = String(role || "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");

    if (value === "TEAMLEAD") return "TEAM_LEAD";
    if (value === "PRODUCTMANAGER") return "PRODUCT_MANAGER";
    if (value === "TEAM_MEMBER") return "MEMBER";
    if (value === "CALLING_TEAM" || value === "CALLER" || value === "CALLING_EXECUTIVE") return "CALLING";
    return value;
}

function saveAuth(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("jmkc_token", data.token);
    if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
    }
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("jmkc_user", JSON.stringify(data.user));
}

function showAuthPopup(title, message, type = "success") {
    let overlay = document.getElementById("authPopupOverlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "authPopupOverlay";
        overlay.className = "auth-popup-overlay";
        overlay.innerHTML = `
      <div class="auth-popup-card">
        <div class="auth-popup-icon" id="authPopupIcon"></div>
        <h3 id="authPopupTitle"></h3>
        <p id="authPopupMessage"></p>
        <div class="auth-popup-actions">
          <button type="button" class="auth-popup-button" id="authPopupButton">OK</button>
        </div>
      </div>
    `;
        document.body.appendChild(overlay);
        overlay.querySelector("#authPopupButton").addEventListener("click", () => {
            overlay.classList.remove("is-visible");
        });
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) overlay.classList.remove("is-visible");
        });
        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && overlay.classList.contains("is-visible")) {
                overlay.classList.remove("is-visible");
            }
        });
    }

    overlay.classList.add("fade-in");
    const icon = overlay.querySelector("#authPopupIcon");
    const titleEl = overlay.querySelector("#authPopupTitle");
    const messageEl = overlay.querySelector("#authPopupMessage");

    titleEl.textContent = title;
    messageEl.textContent = message;
    icon.textContent = type === "success" ? "✓" : type === "error" ? "✗" : "⚠";
    icon.className = `auth-popup-icon ${type}`;
    overlay.classList.add("is-visible");
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem("user") || "null");
}

function logout() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken && typeof fetch === "function") {
        fetch(`${window.location.origin}/api/auth/logout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
        }).catch(() => {});
    }

    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    window.location.href = "/login?logout=1";
}

function getDepartmentSetupUrl() {
    return "/modules/admin/departments/departments.html?setup=required";
}

async function fetchDepartmentsForAdminFlow() {
    try {
        const response = await apiRequest("/departments");
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response)) return response;
    } catch (error) {
        // Fall back to the local enterprise store when the API is unavailable.
    }

    return window.enterpriseStore?.getDepartments?.() || [];
}

async function getAdminDepartmentGateState() {
    const departments = await fetchDepartmentsForAdminFlow();
    const departmentCount = Array.isArray(departments) ? departments.length : 0;

    return {
        departments,
        departmentCount,
        hasDepartments: departmentCount > 0,
        requiresDepartmentSetup: departmentCount === 0,
    };
}

async function getAdminLandingUrl() {
    return "/modules/admin/dashboard/dashboard.html";
}

async function ensureAdminDepartmentAccess({ allowDepartmentSetupPage = false } = {}) {
    const user = getCurrentUser();
    if (!user || normalizeRole(user.role) !== "ADMIN") {
        return { allowed: true, requiresDepartmentSetup: false, departmentCount: 0, departments: [] };
    }

    const gate = await getAdminDepartmentGateState();
    const onDepartmentPage = window.location.pathname.includes("/modules/admin/departments/departments.html");

    if (gate.requiresDepartmentSetup && !(allowDepartmentSetupPage && onDepartmentPage)) {
        window.location.href = getDepartmentSetupUrl();
        return {...gate, allowed: false };
    }

    return {...gate, allowed: true };
}

async function redirectByRole(role) {
    switch (normalizeRole(role)) {
        case "ADMIN":
            window.location.href = "/modules/admin/dashboard/dashboard.html";
            break;
        case "MANAGER":
        case "PROJECT_MANAGER":
            window.location.href = "/project-manager/dashboard";
            break;
        case "PRODUCT_MANAGER":
            window.location.href = "/dashboard/product-manager";
            break;
        case "TEAM_LEAD":
            window.location.href = "/modules/teamlead/dashboard/dashboard.html";
            break;
        case "MEMBER":
            window.location.href = "/employee/dashboard";
            break;
        case "MARKETING":
            window.location.href = "/dashboard/marketing";
            break;
        case "CALLING":
            window.location.href = "/modules/calling/dashboard/dashboard.html";
            break;
        case "SALES":
            window.location.href = "/modules/sales/dashboard/dashboard.html";
            break;
        case "HR":
            window.location.href = "/hr";
            break;
        case "CLIENT":
            window.location.href = "/dashboard/client";
            break;
        default:
            window.location.href = "/index.html";
    }
}

function requireAuth() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/login";
    }
}

function applyAuthPageRolePreset() {
    const roleField = document.getElementById("loginRole");
    if (!roleField) return;

    const presetRole = normalizeRole(new URLSearchParams(window.location.search).get("role"));
    if (!presetRole) return;

    const matchingOption = Array.from(roleField.options).find((option) => normalizeRole(option.value) === presetRole);
    if (matchingOption) {
        roleField.value = matchingOption.value;
    }
}

async function initLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", async(e) => {
        e.preventDefault();

        const roleValue = document.getElementById("loginRole")?.value || "ADMIN";
        if (!roleValue) {
            return showAuthPopup("Please Select Role", "Please select a role before login.", "error");
        }

        const payload = {
            loginRole: normalizeRole(roleValue),
            email: document.getElementById("email").value.trim(),
            password: document.getElementById("password").value,
        };

        if (!payload.email) {
            return showAuthPopup("Email Required", "Please enter your email address.", "error");
        }

        if (!payload.password) {
            return showAuthPopup("Password Required", "Please enter your password.", "error");
        }

        try {
            const result = await API.post("/auth/login", payload);
            result.data.user.role = normalizeRole(result.data.user.role);
            saveAuth(result.data);
            showAuthPopup("Login Successful", "Login Successful", "success");

            setTimeout(() => {
                redirectByRole(result.data.user.role);
            }, 900);
        } catch (error) {
            showAuthPopup("Login Failed", error.message || "Invalid Email Or Password.", "error");
        }
    });
}

function findLocalUserByEmail(email) {
    const users = window.enterpriseStore?.getUsers?.() || [];
    return users.find((user) => String(user.email || "").toLowerCase() === String(email || "").toLowerCase()) || null;
}

function showLogoutMessage() {
    const isLoggedOut = new URLSearchParams(window.location.search).get("logout");
    if (isLoggedOut === "1") {
        showAuthPopup("Logged out", "You have been logged out successfully.", "success");
    }
}

function initializeNavigationState() {
    const applyActiveState = () => {
        const sidebar = document.getElementById("sidebar");
        if (!sidebar) return;

        const currentPath = window.location.pathname.replace(/\/+$/, "");
        sidebar.querySelectorAll("a[href]").forEach((link) => {
            const href = link.getAttribute("href");
            if (!href || href === "#" || href.startsWith("javascript:")) return;

            const linkPath = new URL(href, window.location.origin).pathname.replace(/\/+$/, "");
            link.classList.toggle("active", currentPath === linkPath);
        });
    };

    const observer = new MutationObserver(() => {
        applyActiveState();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    applyActiveState();
}

window.getCurrentUser = getCurrentUser;
window.logout = logout;
window.redirectByRole = redirectByRole;
window.requireAuth = requireAuth;
window.normalizeRole = normalizeRole;
window.getAdminDepartmentGateState = getAdminDepartmentGateState;
window.ensureAdminDepartmentAccess = ensureAdminDepartmentAccess;
window.getDepartmentSetupUrl = getDepartmentSetupUrl;

async function initRegister() {
    const form = document.getElementById("registerForm");
    if (!form) return;

    form.addEventListener("submit", async(e) => {
        e.preventDefault();

        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            return showToast("Passwords do not match", "error");
        }

        try {
            const payload = {
                name: document.getElementById("name").value.trim(),
                email: document.getElementById("email").value.trim(),
                password,
            };

            await API.post("/auth/register", payload);
            showToast("Registration successful", "success");

            setTimeout(() => {
                window.location.href = "/login";
            }, 1000);
        } catch (error) {
            showToast(error.message, "error");
        }
    });
}

async function initForgotPassword() {
    const form = document.getElementById("forgotPasswordForm");
    if (!form) return;

    const emailInput = document.getElementById("email");
    const emailFromUrl = new URLSearchParams(window.location.search).get("email");
    const savedEmail = sessionStorage.getItem("resetEmail");
    if (emailInput && !emailInput.value) {
        emailInput.value = emailFromUrl || savedEmail || "";
    }

    form.addEventListener("submit", async(e) => {
        e.preventDefault();
        const email = (emailInput?.value || "").trim();

        if (!email) {
            return showAuthPopup("Email Required", "Please enter your registered email.", "warning");
        }

        try {
            const result = await API.post("/auth/send-otp", { email });
            const debugOtp = result?.data?.debugOtp;
            sessionStorage.setItem("resetEmail", email);

            let message = `A verification code has been sent to ${email}.`;
            if (debugOtp) {
                message += ` OTP preview: ${debugOtp}`;
            }

            showAuthPopup("OTP Sent Successfully", message, "success");
            setTimeout(() => {
                window.location.href = `/verify-otp.html?email=${encodeURIComponent(email)}`;
            }, 1200);
        } catch (error) {
            showAuthPopup("Unable to Send OTP", error.message || "Please try again.", "error");
        }
    });
}

async function initVerifyOtp() {
    const form = document.getElementById("verifyOtpForm");
    if (!form) return;

    const emailField = document.getElementById("verifyEmail");
    const email = new URLSearchParams(window.location.search).get("email") || sessionStorage.getItem("resetEmail") || "";
    if (!email) {
        showAuthPopup("Email Missing", "Please start password recovery from the Forgot Password page.", "warning");
        setTimeout(() => {
            window.location.href = "/forgot-password.html";
        }, 1200);
        return;
    }

    emailField.value = email;
    sessionStorage.setItem("resetEmail", email);
    startOtpTimer();

    form.addEventListener("submit", async(e) => {
        e.preventDefault();
        const code = Array.from(document.querySelectorAll("[data-otp-inputs] input")).map((input) => input.value).join("");
        if (code.length < 6) {
            return showAuthPopup("Invalid OTP", "Please enter the full 6 digit code.", "warning");
        }

        try {
            await API.post("/auth/verify-otp", { email, otp: code });
            sessionStorage.setItem("resetOtp", code);
            showAuthPopup("OTP Verified Successfully", "OTP Verified Successfully", "success");
            setTimeout(() => {
                window.location.href = "/reset-password.html";
            }, 900);
        } catch (error) {
            showAuthPopup("OTP Verification Failed", error.message || "Invalid or expired OTP.", "error");
        }
    });

    document.getElementById("resendOtpButton")?.addEventListener("click", async() => {
        try {
            await API.post("/auth/send-otp", { email });
            startOtpTimer();
            showAuthPopup("OTP Resent", `A new code was sent to ${email}.`, "success");
        } catch (error) {
            showAuthPopup("Unable to Resend OTP", error.message || "Please try again.", "error");
        }
    });
}

async function initResetPassword() {
    const form = document.getElementById("resetPasswordForm");
    if (!form) return;

    form.addEventListener("submit", async(e) => {
        e.preventDefault();

        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            return showAuthPopup("Passwords Do Not Match", "Please make sure both passwords are identical.", "error");
        }

        if (!isPasswordStrong(password)) {
            return showAuthPopup("Password Too Weak", "Password must include uppercase, lowercase, number, special character and at least 8 characters.", "warning");
        }

        try {
            const token = sessionStorage.getItem("resetOtp") || "";
            const email = sessionStorage.getItem("resetEmail") || "";

            if (!token || !email) {
                throw new Error("OTP verification is missing. Start password recovery again.");
            }

            await API.post("/auth/reset-password", { token, email, password });
            sessionStorage.removeItem("resetOtp");
            sessionStorage.removeItem("resetEmail");
            showAuthPopup("Password Updated Successfully", "Password Updated Successfully", "success");

            setTimeout(() => {
                window.location.href = "/login";
            }, 1200);
        } catch (error) {
            showAuthPopup("Reset Failed", error.message || "Unable to update password.", "error");
        }
    });
}

function isPasswordStrong(value = "") {
    return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

function initAuthInteractions() {
    document.querySelectorAll("[data-toggle-password]").forEach((button) => {
        button.addEventListener("click", () => {
            const input = document.getElementById(button.dataset.togglePassword);
            if (!input) return;
            const visible = input.type === "text";
            input.type = visible ? "password" : "text";
            button.textContent = visible ? "Show" : "Hide";
        });
    });

    const password = document.getElementById("password");
    const capsWarning = document.getElementById("capsWarning");
    if (password && capsWarning) {
        password.addEventListener("keyup", (event) => {
            capsWarning.classList.toggle("is-visible", Boolean(event.getModifierState?.("CapsLock")));
        });
        password.addEventListener("blur", () => capsWarning.classList.remove("is-visible"));
    }

    initOtpInputs();
    initPasswordStrength();
}

function initOtpInputs() {
    const inputs = Array.from(document.querySelectorAll("[data-otp-inputs] input"));
    if (!inputs.length) return;

    inputs.forEach((input, index) => {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/g, "").slice(0, 1);
            if (input.value && inputs[index + 1]) inputs[index + 1].focus();
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Backspace" && !input.value && inputs[index - 1]) {
                inputs[index - 1].focus();
            }
        });

        input.addEventListener("paste", (event) => {
            event.preventDefault();
            const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, inputs.length).split("");
            digits.forEach((digit, digitIndex) => {
                inputs[digitIndex].value = digit;
            });
            inputs[Math.min(digits.length, inputs.length) - 1]?.focus();
        });
    });
}

function startOtpTimer() {
    const timer = document.getElementById("otpTimer");
    if (!timer) return;
    clearInterval(window.__otpTimer);
    let seconds = 105;
    const render = () => {
        const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
        const rest = String(seconds % 60).padStart(2, "0");
        timer.textContent = `${minutes}:${rest}`;
        seconds -= 1;
        if (seconds < 0) clearInterval(window.__otpTimer);
    };
    render();
    window.__otpTimer = setInterval(render, 1000);
}

function initPasswordStrength() {
    const input = document.getElementById("password");
    const label = document.getElementById("passwordStrengthLabel");
    const bar = document.getElementById("passwordStrengthBar");
    if (!input || !label || !bar) return;

    input.addEventListener("input", () => {
        const value = input.value;
        const rules = {
            length: value.length >= 8,
            upper: /[A-Z]/.test(value),
            lower: /[a-z]/.test(value),
            number: /\d/.test(value),
            special: /[^A-Za-z0-9]/.test(value),
        };
        Object.entries(rules).forEach(([key, valid]) => {
            document.querySelector(`[data-rule="${key}"]`)?.classList.toggle("is-valid", valid);
        });

        const score = Object.values(rules).filter(Boolean).length;
        const names = ["Weak", "Weak", "Medium", "Strong", "Strong"];
        const colors = ["#dc2626", "#dc2626", "#f97316", "#16a34a", "#16a34a"];
        label.textContent = names[score];
        label.style.color = colors[score];
        bar.style.width = `${Math.max(18, score * 25)}%`;
        bar.style.background = colors[score];
    });
}

function showResetSuccess() {
    const formPanel = document.getElementById("resetFormPanel");
    const successPanel = document.getElementById("resetSuccessPanel");
    if (!formPanel || !successPanel) {
        window.location.href = "/login";
        return;
    }

    formPanel.classList.add("auth-hidden");
    successPanel.classList.remove("auth-hidden");
    let seconds = 3;
    const counter = document.getElementById("redirectCounter");
    const tick = setInterval(() => {
        seconds -= 1;
        if (counter) counter.textContent = String(Math.max(seconds, 0));
        if (seconds <= 0) {
            clearInterval(tick);
            window.location.href = "/login";
        }
    }, 1000);
}

// Ensure forgot-password anchor navigates on first click (fallback)
document.addEventListener('DOMContentLoaded', () => {
    const selectors = [
        'a[href="/forgot-password"]',
        'a[href="/forgot-password.html"]',
        'a[href="forgot-password.html"]',
        '#forgotPasswordAnchor',
        '#forgotPassword'
    ];

    const anchors = document.querySelectorAll(selectors.join(','));
    anchors.forEach((a) => {
        a.addEventListener('click', (e) => {
            try {
                e.preventDefault();
            } catch (err) {}
            const target = a.getAttribute('href') || '/forgot-password.html';
            // Normalize to the static page
            const dest = target.includes('.html') ? target : '/forgot-password.html';
            window.location.href = dest;
        });
    });
});
