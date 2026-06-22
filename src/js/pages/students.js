/**
 * Students Page JavaScript
 * RK Choice ID Card System
 */

// Tab Switching Function
window.switchTab = function(tab) {
  const tabs = ['completeTab', 'pendingTab', 'promoteTab'];
  const buttons = ['tabComplete', 'tabPending', 'tabPromote'];

  tabs.forEach(tabId => {
    const element = document.getElementById(tabId);
    if (element) element.classList.remove('active');
  });

  buttons.forEach(buttonId => {
    const element = document.getElementById(buttonId);
    if (element) element.classList.remove('active');
  });

  const tabElement = document.getElementById(tab + 'Tab');
  const buttonElement = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));

  if (tabElement) tabElement.classList.add('active');
  if (buttonElement) buttonElement.classList.add('active');

  if (tab === 'complete') {
    window.loadStudents();
  } else if (tab === 'pending') {
    window.loadPendingStudents();
  } else if (tab === 'promote') {
    // Ensure promote table loads immediately after tab becomes active
    window.loadPromoteStudentsTable();
  }
};

// Auto-switch tab based on URL parameter
document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  
  if (tabParam && ['complete', 'pending', 'promote'].includes(tabParam)) {
    // Wait for Firebase auth to complete, then switch tab
    const unsubscribe = firebase.auth().onAuthStateChanged(user => {
      if (user) {
        // Auth is ready, switch tab
        window.switchTab(tabParam);
        unsubscribe();
      }
    });
  }
});
