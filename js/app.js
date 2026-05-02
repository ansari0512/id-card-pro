/**
 * Main Application Controller
 * Handles auth guards, initialization, and shared functionality
 */

import { initAuth, requireAuth, isLoggedIn } from './js/auth.js';
import { showToast } from './js/utils.js';

// Pages that require authentication
const protectedPages = [
  'dashboard.html',
  'id-form.html',
  'students.html',
  'print.html',
  'admin-schools.html'
];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  // Check if current page needs auth
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  if (protectedPages.includes(currentPage)) {
    const user = await requireAuth('index.html');
    if (!user) return;
  }

  // Initialize auth listener
  initAuth((user) => {
    if (user && currentPage === 'index.html') {
      // Redirect to dashboard if already logged in
      window.location.href = 'dashboard.html';
    } else if (!user && currentPage !== 'index.html' && currentPage !== 'login.html') {
      // Redirect to login if not logged in
      window.location.href = 'index.html';
    }
  });

  // Setup theme toggle on all pages
  setupThemeToggle();
}

function setupThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      themeToggle.textContent = next === 'light' ? '☀️' : '🌙';
      localStorage.setItem('theme', next);
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'light' ? '☀️' : '🌙';
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  showToast('An unexpected error occurred', 'error');
});

// Unhandled promise rejection
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  showToast('Operation failed: ' + (event.reason?.message || 'Unknown error'), 'error');
});