/**
 * Performance Optimization
 * RK Choice ID Card System
 * 
 * Ye file website ki performance ko optimize karti hai
 * Lazy loading, caching, aur optimization techniques
 */

window.PerformanceOptimizer = {
  
  // Lazy load images
  lazyLoadImages: function() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  },

  // Debounce scroll events
  debounceScroll: function() {
    let ticking = false;
    
    function updateScroll() {
      // Scroll-related updates here
      ticking = false;
    }
    
    function requestTick() {
      if (!ticking) {
        window.requestAnimationFrame(updateScroll);
        ticking = true;
      }
    }
    
    window.addEventListener('scroll', requestTick, { passive: true });
  },

  // Optimize Firebase queries with caching
  cacheManager: {
    cache: new Map(),
    ttl: 5 * 60 * 1000, // 5 minutes

    set: function(key, data) {
      this.cache.set(key, {
        data: data,
        timestamp: Date.now()
      });
    },

    get: function(key) {
      const item = this.cache.get(key);
      if (!item) return null;
      
      if (Date.now() - item.timestamp > this.ttl) {
        this.cache.delete(key);
        return null;
      }
      
      return item.data;
    },

    clear: function() {
      this.cache.clear();
    }
  },

  // Preload critical resources
  preloadResources: function() {
    const criticalResources = [
      'src/styles/main.css',
      'src/js/theme.js',
      'src/config/firebase-config.js'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      if (resource.endsWith('.css')) {
        link.as = 'style';
      } else if (resource.endsWith('.js')) {
        link.as = 'script';
      }
      document.head.appendChild(link);
    });
  },

  // Optimize DOM operations
  batchDOMUpdates: function(updates) {
    return new Promise(resolve => {
      // Use requestAnimationFrame for smooth updates
      requestAnimationFrame(() => {
        updates.forEach(update => update());
        resolve();
      });
    });
  },

  // Memory management
  cleanup: function() {
    // Clear unused event listeners
    // Clear cached data
    this.cacheManager.clear();
    
    // Force garbage collection hint
    if (window.gc) {
      window.gc();
    }
  },

  // Monitor performance
  monitor: function() {
    if ('performance' in window) {
      // Page load time
      window.addEventListener('load', () => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`Page load time: ${loadTime}ms`);
        
        // Log slow loading
        if (loadTime > 3000) {
          console.warn('Slow page load detected:', loadTime + 'ms');
        }
      });

      // Monitor long tasks
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            if (entry.duration > 50) {
              console.warn('Long task detected:', entry.duration + 'ms');
            }
          });
        });
        
        observer.observe({ entryTypes: ['longtask'] });
      }
    }
  },

  // Optimize images
  optimizeImages: function() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      // Add loading="lazy" for native lazy loading
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
      
      // Add error handling
      img.addEventListener('error', function() {
        this.src = 'assets/placeholder.png';
      });
    });
  },

  // Initialize performance optimizations
  init: function() {
    console.log('Performance optimization initialized');
    
    // Start monitoring
    this.monitor();
    
    // Setup lazy loading
    this.lazyLoadImages();
    
    // Optimize scroll events
    this.debounceScroll();
    
    // Preload critical resources
    this.preloadResources();
    
    // Optimize images
    this.optimizeImages();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  window.PerformanceOptimizer.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.PerformanceOptimizer;
}
