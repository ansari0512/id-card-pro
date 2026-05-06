/**
 * ID Form Controller
 * Handles student creation (id-form.html)
 */

/**
 * Mock mode detector
 */
window.isMockMode = function() {
  return !window.firebase?.firestore;
};

/**
 * Upload photo — path: students/{schoolName}/{className}/{studentName}_{studentId}.ext
 */
window.uploadPhoto = async function(userId, studentId, file, className, studentName) {
  let schoolName = 'School';
  try {
    const schoolDoc = await firebase.firestore().collection('schools').doc(userId).get();
    if (schoolDoc.exists) schoolName = schoolDoc.data().schoolName || 'School';
  } catch(e) {}

  const cls    = (className   || 'Unknown').replace(/[^a-zA-Z0-9 _-]/g, '');
  const sName  = (studentName || studentId).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const ext    = file.type.includes('png') ? 'png' : 'jpg';
  const safeSch = schoolName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');

  const path = `student_photos/${safeSch}/${cls}/${sName}_${studentId}.${ext}`;
  const storageRef = firebase.storage().ref(path);
  const snapshot = await storageRef.put(file);
  return await snapshot.ref.getDownloadURL();
};

/**
 * Apply proper case to input
 */
window.applyProperCase = function(input) {
  const pos = input.selectionStart;
  input.value = window.toProperCase(input.value);
  input.setSelectionRange(pos, pos);
};

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
};

/**
 * Submit student form
 */
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
    const address = window.sanitize(document.getElementById('address').value.trim());
    const photoFile = document.getElementById('photo').files[0];

    // Validation
    if (!/^\d{10}$/.test(mobile)) throw new Error('Mobile number must be 10 digits');
    if (!photoFile) throw new Error('Photo is required');
    if (!photoFile.type.startsWith('image/')) throw new Error('Only image files allowed');
    if (photoFile.size > 5 * 1024 * 1024) throw new Error('Photo must be less than 5MB');

    const studentId = await window.generateStudentId(user.uid);

    // Upload photo
    const photoUrl = await window.uploadPhoto(user.uid, studentId, photoFile, cls, name);

    // Save to database
    const student = {
      id: studentId,
      uid: user.uid,
      schoolId: user.uid,
      name, father, class: cls, section, mobile, address,
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
    document.getElementById('photoPreview').style.display = 'none';
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
    ['name', 'father', 'address'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', function() {
          const pos = this.selectionStart;
          this.value = window.toProperCase(this.value);
          this.setSelectionRange(pos, pos);
        });
      }
    });

    // Live preview
    document.getElementById('studentForm').querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', window.updateIdPreview);
    });

    // Photo preview
    document.getElementById('photo').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        document.getElementById('previewImg').src = ev.target.result;
        document.getElementById('cardPhoto').src = ev.target.result;
        document.getElementById('photoPreview').style.display = 'block';
      };
      reader.readAsDataURL(file);
    });

    // Form submit
    document.getElementById('studentForm').addEventListener('submit', window.submitStudentForm);
  });

  // Theme
  document.getElementById('themeToggle')?.addEventListener('click', window.toggleTheme);
  // loadTheme HTML mein handle ho raha hai
});
