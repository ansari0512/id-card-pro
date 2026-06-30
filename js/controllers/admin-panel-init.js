/**
 * admin-panel-init.js
 * Defensive DOM wiring for admin-panel.html (Add/Edit School modals)
 */

(function() {
  // Define closeEditSchoolModal immediately (not just on DOMContentLoaded)
  // This ensures it's available whenever needed
  window.closeEditSchoolModal = function() {
    const editModal = document.getElementById('editModal');
    const editError = document.getElementById('editError');
    
    if (editModal) {
      editModal.classList.remove('open');
      console.log('✅ Edit modal closed');
    }
    if (editError) {
      editError.style.display = 'none';
      editError.textContent = '';
    }
  };

  function safeBind() {
    const addForm = document.getElementById('addSchoolForm');
    if (addForm && typeof window.createSchool === 'function') {
      addForm.addEventListener('submit', window.createSchool);
    }

    const editForm = document.getElementById('editSchoolForm');
    if (editForm && typeof window.updateSchool === 'function') {
      editForm.addEventListener('submit', window.updateSchool);
    }

    // Bind modal overlay backdrop click handler
    const editModal = document.getElementById('editModal');
    if (editModal) {
      editModal.addEventListener('click', function(e) {
        if (e.target === e.currentTarget) {
          window.closeEditSchoolModal();
        }
      });
    }

    // Admin logout button
    document.getElementById('adminLogoutBtn')?.addEventListener('click', function() {
      window.adminLogout();
    });

    // Add school button
    document.getElementById('adminAddSchoolBtn')?.addEventListener('click', function() {
      window.openAddModal();
    });

    // View all school data button
    document.getElementById('viewAllSchoolDataBtn')?.addEventListener('click', function() {
      window.location.href = 'admin-students.html?mode=all';
    });

    // Refresh schools button
    document.getElementById('refreshSchoolsBtn')?.addEventListener('click', function() {
      window.refreshSchools();
    });

    // Export schools button
    document.getElementById('exportSchoolsBtn')?.addEventListener('click', function() {
      window.exportSchoolsData();
    });

    // Add first school button (empty state)
    document.getElementById('addFirstSchoolBtn')?.addEventListener('click', function() {
      window.openAddModal();
    });

    // Close add modal button
    document.getElementById('closeAddModalBtn')?.addEventListener('click', function() {
      window.closeAddModal();
    });

    // Close edit modal button
    document.getElementById('closeEditModalBtn')?.addEventListener('click', function() {
      window.closeEditSchoolModal();
    });

    // New school name proper case
    document.getElementById('newSchoolName')?.addEventListener('input', function() {
      window.applyProperCase(this);
    });

    // New school city proper case
    document.getElementById('newSchoolCity')?.addEventListener('input', function() {
      window.applyProperCase(this);
    });

    // Login ID availability check on input
    document.getElementById('newSchoolLoginId')?.addEventListener('input', function() {
      window.checkLoginIdAvailability();
    });
  }

  document.addEventListener('DOMContentLoaded', safeBind);
})();

