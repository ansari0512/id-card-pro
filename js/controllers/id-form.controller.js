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
 * Upload photo (mock or real)
 */
window.uploadPhoto = async function(userId, studentId, file) {
  if (window.isMockMode()) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  const storageRef = firebase.storage().ref(`students/${userId}/${studentId}_${Date.now()}`);
  const snapshot = await storageRef.put(file);
  return await snapshot.ref.getDownloadURL();
};

/**
 * Generate student ID
 */
window.generateStudentId = function() {
  return 'RK' + Date.now();
};

/**
 * Sanitize input
 */
window.sanitize = function(str) {
  if (typeof str !== 'string') return str;
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * To proper case
 */
window.toProperCase = function(str) {
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
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
 * Load theme
 */
window.loadTheme = function() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.textContent = savedTheme === 'light' ? '☀️' : '🌙';
  }
};

/**
 * Toggle theme
 */
window.toggleTheme = function() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.textContent = next === 'light' ? '☀️' : '🌙';
  }
};

/**
 * Show toast
 */
window.showToast = function(msg, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed;top:20px;right:20px;padding:12px 24px;background:${type==='error'?'#ef4444':type==='success'?'#22c55e':'#3b82f6'};color:white;border-radius:8px;z-index:99999;font-family:Poppins,sans-serif;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
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

    const studentId = window.generateStudentId();

    // Upload photo
    const photoUrl = await window.uploadPhoto(user.uid, studentId, photoFile);

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
    window.showToast('✅ Student ID created successfully!', 'success');

    // Reset form
    document.getElementById('studentForm').reset();
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('cardPhoto').src = 'assets/placeholder.png';
    document.getElementById('cardId').textContent = '-';
    window.updateIdPreview();

    // Print option
    setTimeout(() => {
      if (confirm('Student saved! Would you like to print the ID card now?')) {
        window.open('print.html?id=' + studentId, '_blank');
      }
    }, 500);

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
      window.location.href = 'login.html';
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
  window.loadTheme();
});
