/**
 * Utility Service
 * Common utility functions and helpers
 */

class UtilityService {
  constructor() {
    this.toastContainer = null;
  }

  // Format date to Indian format
  formatDate(timestamp) {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('en-IN');
  }

  // Capitalize first letter of each word
  toProperCase(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/\w\S*/g, word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
  }

  // Sanitize HTML to prevent XSS
  sanitizeHtml(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Show toast notification
  showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Apply styles
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 24px',
      borderRadius: '8px',
      zIndex: '99999',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      animation: 'slideIn 0.3s ease',
      minHeight: '44px',
      display: 'flex',
      alignItems: 'center'
    });

    // Set background color based on type
    const colors = {
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    toast.style.background = colors[type] || colors.info;
    toast.style.color = 'white';

    // Add to DOM
    document.body.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  // Export data to CSV
  exportToCSV(data, filename) {
    if (!data || data.length === 0) {
      this.showToast('No data to export', 'warning');
      return;
    }

    try {
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      this.downloadBlob(blob, filename || `export_${this.getDateString()}.csv`);
      this.showToast('CSV exported successfully', 'success');
    } catch (error) {
      this.showToast('Export failed: ' + error.message, 'error');
    }
  }

  // Download blob as file
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Get current date as string (YYYY-MM-DD)
  getDateString() {
    return new Date().toISOString().slice(0, 10);
  }

  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate mobile number (10 digits)
  isValidMobile(mobile) {
    const mobileRegex = /^\d{10}$/;
    return mobileRegex.test(mobile);
  }

  // Generate random ID
  generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Check if file is image
  isImageFile(file) {
    return file && file.type && file.type.startsWith('image/');
  }

  // Resize image file
  async resizeImage(file, maxWidth = 800, maxHeight = 800, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Set canvas size and draw image
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(resolve, file.type, quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Parse CSV content
  parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        rows.push(row);
      }
    }

    return rows;
  }

  // Show loading state
  showLoading(element, message = 'Loading...') {
    if (!element) return;
    
    element.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <div class="spinner" style="width: 40px; height: 40px; margin: 0 auto 1rem;"></div>
        <p>${message}</p>
      </div>
    `;
  }

  // Hide loading and show content
  hideLoading(element, content = '') {
    if (!element) return;
    element.innerHTML = content;
  }

  // Show empty state
  showEmptyState(element, title, message, actionButton = null) {
    if (!element) return;

    let buttonHtml = '';
    if (actionButton) {
      buttonHtml = `<button onclick="${actionButton.onclick}" style="margin-top: 1rem;">${actionButton.text}</button>`;
    }

    element.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 4rem; margin-bottom: 1rem;">📭</div>
        <h3>${title}</h3>
        <p>${message}</p>
        ${buttonHtml}
      </div>
    `;
  }
}

// Global Utility Service Instance
window.utilityService = new UtilityService();

// Backward compatibility - expose common functions globally
window.showToast = (msg, type) => window.utilityService.showToast(msg, type);
window.exportToCSV = (data, filename) => window.utilityService.exportToCSV(data, filename);
window.formatDateIndian = (timestamp) => window.utilityService.formatDate(timestamp);
window.toProperCase = (str) => window.utilityService.toProperCase(str);
window.sanitize = (str) => window.utilityService.sanitizeHtml(str);
window.debounce = (func, wait) => window.utilityService.debounce(func, wait);