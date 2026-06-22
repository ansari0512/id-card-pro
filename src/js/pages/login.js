/**
 * Login Page JavaScript
 * RK Choice ID Card System
 * 
 * Ye file login.html page ke specific functionality ko handle karti hai
 */

document.addEventListener('DOMContentLoaded', function() {
  initializeLoginPage();
});

function initializeLoginPage() {
  console.log('Login page initialized');
  
  // Check if already logged in
  if (window.isLoggedIn()) {
    window.location.href = window.currentRole === 'admin' ? 'admin-panel.html' : 'dashboard.html';
    return;
  }

  // Setup form submission
  setupLoginForm();
  
  // Setup enter key submission
  window.CommonFunctions.setupEnterKeySubmission('loginForm');
}

function setupLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    await handleLogin();
  });
}

async function handleLogin() {
  const btn = document.getElementById('loginBtn');
  const btnText = btn.querySelector('.btn-text');
  const email = window.CommonFunctions.getElementValue('email');
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('errorMsg');

  // Validation
  if (!email || !password) {
    showError('Please enter email and password');
    return;
  }

  // Show loading state
  btn.disabled = true;
  btnText.textContent = 'Signing in...';
  errorMsg.classList.remove('show');

  try {
    const { user, role } = await window.login(email, password);
    window.showToast('✅ Login successful!', 'success');
    
    // Redirect after short delay
    setTimeout(() => {
      window.location.href = role === 'admin' ? 'admin-panel.html' : 'dashboard.html';
    }, 400);
    
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    showError(errorMessage);
  } finally {
    // Reset button state
    btn.disabled = false;
    btnText.textContent = 'Sign In';
  }
}

function showError(message) {
  const errorMsg = document.getElementById('errorMsg');
  if (errorMsg) {
    errorMsg.textContent = message;
    errorMsg.classList.add('show');
  }
}

function getErrorMessage(error) {
  let message = error.message;
  const code = error.code || '';

  // Custom error messages based on requirements
  const errorMessages = {
    'auth/invalid-email': '❌ User not found in database',
    'auth/user-disabled': '❌ Account disabled',
    'auth/user-not-found': '❌ User not found in database',
    'auth/wrong-password': '❌ Invalid Password',
    'auth/too-many-requests': '❌ Too many attempts. Please try later.',
    'auth/network-request-failed': '❌ Network error. Check connection.'
  };

  if (errorMessages[code]) {
    return errorMessages[code];
  }
  
  if (message.includes('User not found in database')) {
    return '❌ User not found in database';
  }
  
  if (message.includes('Invalid Password')) {
    return '❌ Invalid Password';
  }
  
  return '❌ ' + message; // Add ❌ to any other error
}

// Export functions for global access if needed
window.LoginPage = {
  initializeLoginPage,
  handleLogin,
  showError,
  getErrorMessage
};
