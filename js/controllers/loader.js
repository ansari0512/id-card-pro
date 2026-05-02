/**
 * Central Controller Loader
 * Automatically loads the right controller based on current page
 */

// Available controllers mapping
const CONTROLLERS = {
  'login.html': 'js/controllers/auth.controller.js',
  'dashboard.html': 'js/controllers/dashboard.controller.js',
  'id-form.html': 'js/controllers/id-form.controller.js',
  'students.html': 'js/controllers/student.controller.js',
  'admin-panel.html': 'js/controllers/admin.controller.js',
  'admin-students.html': 'js/controllers/admin-students.controller.js',
  'print.html': 'js/controllers/print.controller.js'
};

/**
 * Load controller for current page
 */
async function loadController() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const controllerPath = CONTROLLERS[currentPage];

  if (controllerPath) {
    try {
      await import(controllerPath);
      console.log(`✅ Loaded controller: ${controllerPath}`);
    } catch (err) {
      console.error(`❌ Failed to load controller ${controllerPath}:`, err);
      // Fallback: use legacy utils if controller not found
      if (window.showToast) {
        window.showToast('Controller loading failed, using legacy mode', 'error');
      }
    }
  }
}

// Load controller when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadController);
} else {
  loadController();
}
