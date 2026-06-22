/**
 * Centralized Theme System
 * RK Choice ID Card System
 * 
 * Ye file sabhi pages mein theme manage karti hai
 * Dark/Light mode toggle functionality
 */

// Theme Manager Class
class ThemeManager {
  constructor() {
    this.storageKey = 'theme';
    this.defaultTheme = 'dark';
    this.init();
  }

  // Initialize theme on page load
  init() {
    // Apply saved theme immediately (before page renders)
    this.applyTheme(this.getSavedTheme());
    
    // Setup theme toggle button
    this.setupThemeToggle();
    
    console.log('Theme system initialized');
  }

  // Get saved theme from localStorage
  getSavedTheme() {
    return localStorage.getItem(this.storageKey) || this.defaultTheme;
  }

  // Apply theme to document
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.updateToggleButton(theme);
  }

  // Update toggle button text/icon
  updateToggleButton(theme) {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      toggleBtn.textContent = theme === 'light' ? '☀️' : '🌙';
    }
  }

  // Toggle between themes
  toggleTheme() {
    const currentTheme = this.getSavedTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    // Save new theme
    localStorage.setItem(this.storageKey, newTheme);
    
    // Apply new theme
    this.applyTheme(newTheme);
    
    console.log(`Theme changed to: ${newTheme}`);
  }

  // Setup theme toggle button event listener
  setupThemeToggle() {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      // Remove existing listeners to prevent duplicates
      toggleBtn.removeEventListener('click', this.toggleTheme);
      // Add new listener
      toggleBtn.addEventListener('click', () => this.toggleTheme());
    }
  }

  // Get current theme
  getCurrentTheme() {
    return this.getSavedTheme();
  }

  // Set specific theme
  setTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      localStorage.setItem(this.storageKey, theme);
      this.applyTheme(theme);
    }
  }
}

// Global theme manager instance - sirf ek baar banana hai
if (!window.themeManager) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.themeManager = new ThemeManager();
    });
  } else {
    window.themeManager = new ThemeManager();
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
}
