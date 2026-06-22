/**
 * Common JavaScript Functions
 * RK Choice ID Card System
 * 
 * Ye file common JavaScript functions ko handle karti hai
 * Reusable functions jo multiple pages mein use hote hain
 */

// Common utility functions
window.CommonFunctions = {
  
  // Initialize page with common setup
  initPage: function() {
    console.log('Page initialized with common functions');
  },

  // Handle Enter key submission for forms
  setupEnterKeySubmission: function(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          form.dispatchEvent(new Event('submit'));
        }
      });
    }
  },

  // Show loading state
  showLoading: function(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `
        <div class="text-center">
          <div class="spinner spinner-large"></div>
          <p class="text-muted">${message}</p>
        </div>
      `;
      element.style.display = 'block';
    }
  },

  // Hide loading state
  hideLoading: function(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = 'none';
    }
  },

  // Toggle element visibility
  toggleElement: function(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.toggle('d-none');
    }
  },

  // Show element
  showElement: function(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.remove('d-none');
    }
  },

  // Hide element
  hideElement: function(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.add('d-none');
    }
  },

  // Set element content safely
  setElementContent: function(elementId, content) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = content;
    }
  },

  // Get element value safely
  getElementValue: function(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value.trim() : '';
  },

  // Clear form inputs
  clearForm: function(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.reset();
    }
  },

  // Setup modal close on backdrop click
  setupModalClose: function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          modal.classList.add('d-none');
        }
      });
    }
  },

  // Debounce function for performance - delegates to shared implementation
  debounce: function(func, wait) {
    return window.debounce && window.debounce(func, wait);
  },

  // Throttle function for performance
  throttle: function(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Format file size
  formatFileSize: function(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Validate email
  isValidEmail: function(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  // Validate phone number
  isValidPhone: function(phone) {
    const re = /^[\d\s\-\+\(\)]+$/;
    return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
  },

  // Generate random ID
  generateId: function(prefix = 'id') {
    return prefix + '_' + Math.random().toString(36).substr(2, 9);
  },

  // Copy to clipboard
  copyToClipboard: async function(text) {
    try {
      await navigator.clipboard.writeText(text);
      window.showToast('✅ Copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to copy: ', err);
      window.showToast('❌ Failed to copy', 'error');
    }
  },

  // Download data as file
  downloadFile: function(data, filename, type = 'text/plain') {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // Parse CSV data
  parseCSV: function(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }
    
    return data;
  },

  // Removed: setupResponsiveTable (unused), initTooltips (unused)
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  window.CommonFunctions.initPage();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.CommonFunctions;
}
