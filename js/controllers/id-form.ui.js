/**
 * id-form.ui.js
 * UI-only helpers for id-form.html (segmented toggle + floating label state)
 *
 * NOTE: Save/Firebase/DB/print logic lives in existing controllers.
 */
(function() {
  function syncFloatState(root) {
    const fields = root.querySelectorAll('.float-field');
    fields.forEach(f => {
      const input = f.querySelector('input, select, textarea');
      if (!input) return;

      const isDate = input.type === 'date';
      const hasVal = isDate
        ? !!input.value
        : (input.value != null && String(input.value).trim().length > 0);

      f.classList.toggle('has-value', hasVal);
    });
  }

  function getSafe(id) {
    return document.getElementById(id) || null;
  }

  function initToggle() {
    const studentRadio = getSafe('idCardTypeStudent');
    const teacherRadio = getSafe('idCardTypeTeacherStaff');
    const studentForm = getSafe('studentForm');
    const teacherForm = getSafe('teacherStaffForm');

    const segStudent = getSafe('segStudent');
    const segTeacherStaff = getSafe('segTeacherStaff');

    const studentTitle = getSafe('studentTypeTitle');
    const teacherTitle = getSafe('teacherTypeTitle');

    function applyToggle(isStudent) {
      if (studentForm) studentForm.style.display = isStudent ? 'block' : 'none';
      if (teacherForm) teacherForm.style.display = isStudent ? 'none' : 'block';

      if (studentTitle) studentTitle.style.display = isStudent ? 'block' : 'none';
      if (teacherTitle) teacherTitle.style.display = isStudent ? 'none' : 'block';

      if (segStudent) segStudent.classList.toggle('active', !!isStudent);
      if (segTeacherStaff) segTeacherStaff.classList.toggle('active', !isStudent);

      // Hidden inputs: keep student default
      if (studentRadio) studentRadio.checked = !!isStudent;
      if (teacherRadio) teacherRadio.checked = !isStudent;

      // Update preview cards
      if (typeof window.switchIdCardType === 'function') {
        window.switchIdCardType(isStudent ? 'student' : 'teacher');
      }

      // Hide/Show submit button to avoid HTML5 validation on hidden form
      const tsSaveBtn = getSafe('tsSaveBtn');
      if (tsSaveBtn) tsSaveBtn.style.display = isStudent ? 'none' : 'inline-flex';
    }

    if (segStudent) segStudent.addEventListener('click', function() { applyToggle(true); });
    if (segTeacherStaff) segTeacherStaff.addEventListener('click', function() { applyToggle(false); });

    // Default selection (based on URL param)
    try {
      const params = new URLSearchParams(window.location.search || '');
      const type = (params.get('type') || '').toLowerCase();
      if (type === 'teacher') {
        applyToggle(false);
        return;
      }
    } catch (e) {}

    applyToggle(true);

  }

  function init() {
    // Floating label state
    syncFloatState(document.body);

    document.body.addEventListener('input', function(e) {
      const t = e && e.target;
      if (!t || !t.closest) return;
      const field = t.closest('.float-field');
      if (!field) return;

      const hasVal = t.value != null && String(t.value).trim().length > 0;
      // date fields also follow input.value
      field.classList.toggle('has-value', hasVal);
    });

    document.body.addEventListener('change', function(e) {
      const t = e && e.target;
      if (!t || !t.closest) return;
      const field = t.closest('.float-field');
      if (!field) return;

      const hasVal = t.value != null && String(t.value).trim().length > 0;
      field.classList.toggle('has-value', hasVal);
    });

    initToggle();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

/**
 * Navigation helper — opens teacher/staff list page
 */
if (typeof window.openTeacherStaffList === 'undefined') {
  window.openTeacherStaffList = function() { window.location.href = 'teacher-staff.html'; };
}

