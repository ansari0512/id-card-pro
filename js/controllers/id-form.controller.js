/**
 * ID Form Controller
 * Handles student creation (id-form.html)
 */

/**
 * Update ID card preview
 */
window.updateIdPreview = function() {
    document.getElementById('cardName').textContent = document.getElementById('name').value || 'Student Name';
    document.getElementById('cardClass').textContent = document.getElementById('class').value || '-';
    document.getElementById('cardSection').textContent = document.getElementById('section').value || '-';
    document.getElementById('cardFather').textContent = document.getElementById('father').value || '-';
    const mob = document.getElementById('mobile').value;
    document.getElementById('cardMobile').textContent = mob ? mob.replace(/(\d{5})(\d{5})/, '$1 $2') : '-';
    const dob = document.getElementById('dob').value;
    document.getElementById('cardDob').textContent = dob ? window.normalizeDateValue(dob) : '-';

    // Optional fields preview (only if preview spans exist)
    const el = (id) => document.getElementById(id);
    const setIf = (spanId, inputId) => {
      const span = el(spanId);
      const input = el(inputId);
      if (!span || !input) return;
      const v = input.value?.trim();
      span.textContent = v ? v : '-';
    };
    setIf('cardAddition', 'addition');
    setIf('cardAdmissionNo', 'admissionNo');
    setIf('cardRollNo', 'rollNo');
    setIf('cardMotherName', 'motherName');
    setIf('cardBloodGroup', 'bloodGroup');
    setIf('cardOtherInfo', 'otherInfo');
    setIf('cardAddress', 'address');

};

/**
 * Submit student form
 */
window.generateTeacherStaffId = async function(schoolId) {
  // Teacher/Staff ID generation (separate counter)
  const year = new Date().getFullYear();
  let schoolCode = 'SCH';
  try {
    const schoolDoc = await firebase.firestore().collection('schools').doc(schoolId).get();
    if (schoolDoc.exists) {
      const nm = schoolDoc.data().schoolName || '';
      schoolCode = nm.split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).join('').slice(0, 4) || 'SCH';
    }
  } catch (err) {}

  const counterRef = firebase.firestore().collection('schools').doc(schoolId).collection('counters').doc(String(year));
  // Use a separate field in same counter doc to avoid schema changes.
  // If missing, start at 0.
  const next = await firebase.firestore().runTransaction(async (tx) => {
    const doc = await tx.get(counterRef);
    const data = doc.exists ? doc.data() : {};
    const current = data.teacherCount || 0;
    tx.set(counterRef, { teacherCount: current + 1 }, { merge: true });
    return current + 1;
  });

  return `${schoolCode}-TCH-${year}-${String(next).padStart(4, '0')}`;
};

window.uploadTeacherStaffPhoto = async function(schoolId, teacherId, file, teacherName) {
  let schoolName = 'School';
  try {
    const doc = await firebase.firestore().collection('schools').doc(schoolId).get();
    if (doc.exists) schoolName = doc.data().schoolName || 'School';
  } catch (e) {}

  const safeSchoolName = String(schoolName).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeTeacherName = String(teacherName || teacherId).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const ext = file.type.includes('png') ? 'png' : 'jpg';
  // Path includes schoolId for storage rule school isolation: teacher_photos/{schoolId}/{schoolName}/{fileName}
  const path = `teacher_photos/${schoolId}/${safeSchoolName}/${safeTeacherName}_${teacherId}.${ext}`;
  
  const storageRef = firebase.storage().ref().child(path);
  const snapshot = await storageRef.put(file, { contentType: file.type });
  return await snapshot.ref.getDownloadURL();
};

window.submitStudentForm = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('saveBtn');
  const btnText = btn.querySelector('.btn-text');

  btn.disabled = true;
  btnText.textContent = '⏳ Saving...';

  try {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Not logged in');

    const name = window.sanitize(document.getElementById('name').value.trim());
    const father = window.sanitize(document.getElementById('father').value.trim());
    const cls = document.getElementById('class').value;
    const section = document.getElementById('section').value;
    const mobile = document.getElementById('mobile').value.trim();

    // Optional fields
    const addition = window.sanitize(document.getElementById('addition')?.value.trim() || '');
    const admissionNo = window.sanitize(document.getElementById('admissionNo')?.value.trim() || '');
    const rollNo = window.sanitize(document.getElementById('rollNo')?.value.trim() || '');
    const motherName = window.sanitize(document.getElementById('motherName')?.value.trim() || '');
    const bloodGroup = window.sanitize(document.getElementById('bloodGroup')?.value.trim() || '');
    const otherInfo = window.sanitize(document.getElementById('otherInfo')?.value.trim() || '');

    const address = window.sanitize(document.getElementById('address').value.trim());
    const dob = window.normalizeDateValue(document.getElementById('dob').value.trim());
    const photoFile = document.getElementById('photo').files[0];


    // Validation
    if (!/^\d{10}$/.test(mobile)) throw new Error('Mobile number must be 10 digits');
    if (!photoFile) throw new Error('Photo is required');
    if (!photoFile.type.startsWith('image/')) throw new Error('Only image files allowed');
    if (photoFile.size > 3 * 1024 * 1024) throw new Error('Photo must be less than 3MB');

    const studentId = await window.generateStudentId(user.uid);

    // Upload photo
    const photoUrl = await window.uploadPhoto(user.uid, studentId, photoFile, cls, name);

    // Save to database
    const student = {
      id: studentId,
      uid: user.uid,
      schoolId: user.uid,
      name,
      father,
      class: cls,
      section,
      mobile,
      address,
      dob,

      // Optional fields
      addition,
      admissionNo,
      rollNo,
      motherName,
      bloodGroup,
      otherInfo,

      photo: photoUrl,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };


    if (window.isMockMode()) {
      const newStudent = { ...student, docId: 'doc_' + Date.now() };
      const students = JSON.parse(localStorage.getItem('mock_students') || '[]');
      students.unshift(newStudent);
      localStorage.setItem('mock_students', JSON.stringify(students));
    } else {
      await window.dbStudents(user.uid, cls).add(student);
    }

    // Show success
    document.getElementById('cardId').textContent = studentId;
    window.showToast('✅ Student ID created successfully! Click Print IDs to print.', 'success');

    // Reset form
    document.getElementById('studentForm').reset();
    document.getElementById('cardPhoto').src = 'assets/placeholder.png';
    document.getElementById('cardId').textContent = '-';
    window.updateIdPreview();

  } catch (error) {
    window.showToast('❌ ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = '✅ Save & Generate ID';
  }
};

// ── INITIALIZATION ─────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  // Auth check
  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    // Proper case for inputs
    ['name', 'father', 'address', 'addition', 'motherName', 'otherInfo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', function() {
          window.applyProperCase(this);
        });
      }
    });

    // Mobile number input filter
    const mobileInput = document.getElementById('mobile');
    if (mobileInput) {
      mobileInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
      });
    }

    // Teacher/Staff form proper case and mobile filter
    const teacherFields = ['tsName', 'tsDesignation', 'tsFatherName', 'tsHusbandName', 'tsAddress', 'tsOtherDetails'];
    teacherFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', function() {
          window.applyProperCase(this);
        });
      }
    });

    const tsMobileInput = document.getElementById('tsMobile');
    if (tsMobileInput) {
      tsMobileInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
      });
    }

    // Date picker activation for DOB fields
    function setupDatePicker(inputId) {
      const el = document.getElementById(inputId);
      if (!el) return;
      el.addEventListener('focus', function() {
        this.type = 'date';
      });
      el.addEventListener('blur', function() {
        if (!this.value) this.type = 'text';
      });
    }
    setupDatePicker('dob');
    setupDatePicker('tsDob');

    // Live preview
    document.getElementById('studentForm').querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', window.updateIdPreview);
    });

    // Photo upload → live card preview only
    document.getElementById('photo').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      // Show loading state
      const cardPhoto = document.getElementById('cardPhoto');
      const placeholder = document.querySelector('#studentPreviewCard .student-photo-placeholder-text');
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
    document.getElementById('cardPhoto').addEventListener('load', function() {
      if (this.src !== 'assets/placeholder.png') {
        document.querySelector('#studentPreviewCard .student-photo-placeholder-text').style.display = 'none';
      }
    });

    // Form submit
    document.getElementById('studentForm').addEventListener('submit', window.submitStudentForm);
  });

  // Theme
  document.getElementById('themeToggle')?.addEventListener('click', window.toggleTheme);
  // Theme initialization is handled in the HTML.
});
