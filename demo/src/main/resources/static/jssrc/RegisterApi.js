// RegisterApi.js
// Connects register.html's SIGN UP button to POST /api/auth/register.
// After a successful registration it logs the new user in (POST /api/auth/login)
// and stores the session the same way login.js does, so UserApi.js's
// getCurrentUserId() / authHeaders() pick up the NEW user on account.html.
// Only messages returned by the API are displayed.

const API_BASE = ""; // same-origin, same as UserApi.js; change if the backend lives elsewhere

// Where to go once registered and logged in.
const REDIRECT_AFTER_SIGNUP = "account.html";

document.addEventListener("DOMContentLoaded", function () {
    const signupButton = document.getElementById("signup-button");
    const mailInput = document.getElementById("mail");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirm_password");

    if (!signupButton || !mailInput || !usernameInput || !passwordInput || !confirmPasswordInput) {
        console.error("RegisterApi.js: expected elements not found on page");
        return;
    }

    signupButton.onclick = handleSignUp;

    // Pressing Enter in any field submits the form
    document.querySelectorAll(".signupbox input").forEach(function (input) {
        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                handleSignUp();
            }
        });
    });

    async function postJson(path, body) {
        const response = await fetch(`${API_BASE}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        let data = null;
        try {
            data = await response.json();
        } catch (parseErr) {
            // no JSON body in the response
        }
        return { response: response, data: data };
    }

    async function handleSignUp() {
        const mail = mailInput.value;
        const password = passwordInput.value;

        clearMessage();
        signupButton.disabled = true;

        try {
            // Step 1: register.
            // Field names match RegisterRequest: mail, username, password, confirmPassword
            const reg = await postJson("/api/auth/register", {
                mail: mail,
                username: usernameInput.value,
                password: password,
                confirmPassword: confirmPasswordInput.value,
            });

            if (reg.response.status !== 201) {
                // API: {"error": "<reason from AuthService.signUp>"}
                showMessage((reg.data && reg.data.error) || "", true);
                signupButton.disabled = false;
                return;
            }

            // Step 2: log in with the new account to get the JWT
            // (the register endpoint itself doesn't return a token).
            const log = await postJson("/api/auth/login", {
                mail: mail,
                password: password,
            });

            // Clear whatever a previous login left behind
            localStorage.removeItem("token");
            localStorage.removeItem("userId");

            if (log.response.ok && log.data && log.data.token) {
                // Same keys as login.js / UserApi.js: "token" and "userId"
                localStorage.setItem("token", log.data.token);
                if (log.data.user && log.data.user.id !== undefined) {
                    localStorage.setItem("userId", String(log.data.user.id));
                }
                showMessage((reg.data && reg.data.message) || "", false);
                setTimeout(function () {
                    window.location.href = REDIRECT_AFTER_SIGNUP;
                }, 800);
            } else {
                // API: {"error": "..."}
                showMessage((log.data && log.data.error) || "", true);
                signupButton.disabled = false;
            }
        } catch (networkErr) {
            console.error("Registration request failed:", networkErr);
            signupButton.disabled = false;
        }
    }

    // Message element inside the signup box, mirrors login.js's showError/clearError
    function showMessage(message, isError) {
        let el = document.getElementById("signup-message");
        if (!el) {
            el = document.createElement("p");
            el.id = "signup-message";
            el.style.textAlign = "center";
            el.style.fontWeight = "bold";
            el.style.minHeight = "1.2em";
            document.querySelector(".signupbox").appendChild(el);
        }
        el.style.color = isError ? "red" : "green";
        el.textContent = message;
    }

    function clearMessage() {
        const el = document.getElementById("signup-message");
        if (el) {
            el.textContent = "";
        }
    }
});