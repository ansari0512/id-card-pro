/**
 * Main Application Entry Point
 * Handles initialization and routing
 */

import { APP_CONFIG } from './config/app.config.js';

// Global app state
window.app = {
  name: APP_CONFIG.name,
  version: APP_CONFIG.version,
  initialized: false
};

/**
 * Initialize application
 */
window.initApp = async function() {
  if (window.app.initialized) return;

  // Load saved theme
  window.loadTheme();

  // Initialize auth listener
  window.initAuth(user => {
    if (user) {
      const currentPage = window.location.pathname.split('/').pop();
      if (currentPage === 'login.html' || currentPage === 'index.html') {
        // Redirect based on role
        window.location.href = window.currentRole === 'admin' ? 'admin-panel.html' : 'dashboard.html';
      }
    } else {
      // Not logged in - redirect to login if on protected page
      const currentPage = window.location.pathname.split('/').pop();
      const protectedPages = [
        'dashboard.html', 'id-form.html', 'students.html',
        'print.html', 'admin-panel.html', 'admin-students.html'
      ];
      if (protectedPages.includes(currentPage)) {
        window.location.href = 'login.html';
      }
    }
  });

  window.app.initialized = true;
};

/**
 * Theme management
 */
window.loadTheme = function() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.textContent = savedTheme === 'light' ? '☀️' : '🌙';
  }
};

window.toggleTheme = function() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.textContent = next === 'light' ? '☀️' : '🌙';
  }
};

/**
 * Global error handler
 */
window.setupErrorHandling = function() {
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    window.showToast('An unexpected error occurred', 'error');
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection:', event.reason);
    window.showToast('Operation failed: ' + (event.reason?.message || 'Unknown error'), 'error');
  });
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initApp);
} else {
  window.initApp();
}

// Setup global error handling
window.setupErrorHandling();
