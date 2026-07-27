
/**
 * Teacher/Staff ID form controller
 */

(function() {
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  window.updateTeacherStaffPreview = function() {
    setText('tsCardName', document.getElementById('tsName')?.value || 'Teacher Name');
    setText('tsCardDesignation', document.getElementById('tsDesignation')?.value || '-');
    setText('tsCardFather', document.getElementById('tsFatherName')?.value || '-');
    setText('tsCardHusband', document.getElementById('tsHusbandName')?.value || '-');
    setText('tsCardTeacherId', document.getElementById('tsTeacherId')?.value || '-');

    const dob = document.getElementById('tsDob')?.value || '';
    setText('tsCardDob', dob ? window.normalizeDateValue(dob) : '-');

    setText('tsCardBlood', document.getElementById('tsBloodGroup')?.value || '-');
    setText('tsCardAddress', document.getElementById('tsAddress')?.value || '-');
    const mob = document.getElementById('tsMobile')?.value || '';
    setText('tsCardMobile', mob ? mob.replace(/(\d{5})(\d{5})/, '$1 $2') : '-');
    setText('tsCardOther', document.getElementById('tsOtherDetails')?.value || '-');
  };

  window.switchIdCardType = function(type) {
    const isStudent = type === 'student';
    const studentSection = document.getElementById('studentTypeSection');
    const teacherSection = document.getElementById('teacherTypeSection');
    if (studentSection) studentSection.style.display = isStudent ? 'block' : 'none';
    if (teacherSection) teacherSection.style.display = isStudent ? 'none' : 'block';

    // Ensure default student workflow stays same
    document.getElementById('idCardTypeStudent').checked = isStudent;
    document.getElementById('idCardTypeTeacherStaff').checked = !isStudent;

    // Toggle preview cards
    document.getElementById('studentPreviewCard').style.display = isStudent ? 'block' : 'none';
    document.getElementById('teacherPreviewCard').style.display = isStudent ? 'none' : 'block';
  };

  window.submitTeacherStaffForm = async function(e) {
    e.preventDefault();

    const btn = document.getElementById('tsSaveBtn');
    const btnText = btn.querySelector('.btn-text');
    const errEl = document.getElementById('tsFormError');

    btn.disabled = true;
    btnText.textContent = '⏳ Saving...';
    errEl.style.display = 'none';

    try {
      const user = firebase.auth().currentUser;
      if (!user) throw new Error('Not logged in');

      const required = {
        name: document.getElementById('tsName').value.trim(),
        designation: document.getElementById('tsDesignation').value.trim(),
        fatherName: document.getElementById('tsFatherName').value.trim(),
        dob: window.normalizeDateValue(document.getElementById('tsDob').value.trim()),
        mobile: document.getElementById('tsMobile').value.trim(),
      };

      const other = {
        husbandName: document.getElementById('tsHusbandName').value.trim(),
        teacherId: document.getElementById('tsTeacherId').value.trim(),
        otherDetails: document.getElementById('tsOtherDetails').value.trim(),
        bloodGroup: document.getElementById('tsBloodGroup').value.trim(),
        address: document.getElementById('tsAddress').value.trim()
      };

      if (!required.name) throw new Error('Name is required');
      if (!required.designation) throw new Error('Designation is required');
      if (!required.fatherName) throw new Error("Father's Name is required");
      if (!required.dob) throw new Error('D.O.B. is required');
      if (!required.mobile || !/^\d{10}$/.test(required.mobile)) throw new Error('Mobile number must be 10 digits');

      const photoFile = document.getElementById('tsPhoto').files[0];
      if (!photoFile) throw new Error('Photo is required');
      if (!photoFile.type.startsWith('image/')) throw new Error('Only image files allowed');
      if (photoFile.size > 3 * 1024 * 1024) throw new Error('Photo must be less than 3MB');

      // Generate unique teacher/staff id
      const schoolId = user.uid;
      const teacherId = await window.generateTeacherStaffId(schoolId);

      // Upload photo
      const photoUrl = await window.uploadTeacherStaffPhoto(schoolId, teacherId, photoFile, required.name);

      const record = {
        id: teacherId,
        uid: user.uid,
        schoolId: user.uid,
        name: window.sanitize(required.name),
        designation: window.sanitize(required.designation),
        fatherName: window.sanitize(required.fatherName),
        dob: window.normalizeDateValue(required.dob),
        bloodGroup: window.sanitize(other.bloodGroup),
        address: window.sanitize(other.address),
        mobile: required.mobile,
        otherDetails: other.otherDetails ? window.sanitize(other.otherDetails) : '',
        husbandName: other.husbandName ? window.sanitize(other.husbandName) : '',
        teacherId: other.teacherId ? window.sanitize(other.teacherId) : '',
        photo: photoUrl,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      if (window.isMockMode()) {
        const newTeacher = { ...record, docId: 'doc_' + Date.now() };
        const list = JSON.parse(localStorage.getItem('mock_teachers') || '[]');
        list.unshift(newTeacher);
        localStorage.setItem('mock_teachers', JSON.stringify(list));
      } else {
        await window.dbTeachersCollection(user.uid).add(record);
      }

      window.showToast('✅ Teacher/Staff ID created successfully! Click Print IDs to print.', 'success');

      setText('tsCardTeacherIdFinal', teacherId);
      window.updateTeacherStaffPreview();

      // Clear teacher form and preview
      document.getElementById('teacherStaffForm').reset();
      document.getElementById('tsCardPhoto').src = 'assets/placeholder.png';
      window.updateTeacherStaffPreview();

    } catch (error) {
      errEl.textContent = '❌ ' + error.message;
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btnText.textContent = '✅ Save & Generate ID';
    }
  };


  // Initialize on load (only if the teacher form exists)
  document.addEventListener('DOMContentLoaded', function() {
    const teacherForm = document.getElementById('teacherStaffForm');
    const cardTypeStudent = document.getElementById('idCardTypeStudent');
    const cardTypeTeacher = document.getElementById('idCardTypeTeacherStaff');

    if (!teacherForm) return;

    // Bind validation updates
    const ids = [
      'tsName','tsDesignation','tsFatherName','tsDob','tsBloodGroup','tsAddress','tsMobile',
      'tsHusbandName','tsTeacherId','tsOtherDetails'
    ];
    ids.forEach(id => {
      document.getElementById(id)?.addEventListener('input', window.updateTeacherStaffPreview);
    });

    // Toggle
    cardTypeStudent?.addEventListener('change', () => window.switchIdCardType('student'));
    cardTypeTeacher?.addEventListener('change', () => window.switchIdCardType('teacher'));

    // Teacher/student toggle & active styling are handled by id-form.ui.js (applyToggle).

    // IMPORTANT: Don't force Student as default here.
    // id-form.html already contains the correct state (hidden inputs + segment UI).
    const studentRadio = document.getElementById('idCardTypeStudent');
    const teacherRadio = document.getElementById('idCardTypeTeacherStaff');
    if (studentRadio && teacherRadio) {
      const isStudentSelected = !!studentRadio.checked;
      window.switchIdCardType(isStudentSelected ? 'student' : 'teacher');
    } else {
      // Fallback (should not happen): keep existing behavior safe.
      window.switchIdCardType('student');
    }

    // Submit
    teacherForm.addEventListener('submit', window.submitTeacherStaffForm);

    // Photo upload → live card preview only
    document.getElementById('tsPhoto').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      // Show loading state
      const cardPhoto = document.getElementById('tsCardPhoto');
      const placeholder = document.querySelector('#teacherPreviewCard .student-photo-placeholder-text');
      cardPhoto.style.opacity = '0.5';
      if (placeholder) placeholder.textContent = 'Loading...';
      
      const reader = new FileReader();
      reader.onload = ev => {
        cardPhoto.src = ev.target.result;
        cardPhoto.style.opacity = '1';
        if (placeholder) placeholder.style.display = 'none';
      };
      reader.onerror = () => {
        cardPhoto.style.opacity = '1';
        if (placeholder) {
          placeholder.textContent = 'Failed to load';
          placeholder.style.display = 'block';
        }
        window.showToast('❌ Failed to load photo preview', 'error');
      };
      reader.readAsDataURL(file);
    });

    // Hide placeholder when real photo loads
    document.getElementById('tsCardPhoto').addEventListener('load', function() {
      if (this.src !== 'assets/placeholder.png') {
        document.querySelector('#teacherPreviewCard .student-photo-placeholder-text').style.display = 'none';
      }
    });

    // required mobile input filter
    document.getElementById('tsMobile')?.addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9]/g,'').slice(0,10);
    });
  });
})();
