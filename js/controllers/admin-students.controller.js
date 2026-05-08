/**
 * Admin Students Controller
 * Handles admin view of school students (admin-students.html)
 * Supports: single school view (schoolId param) + View All mode (mode=all)
 */

window.adminSchoolId = null;
window.adminAllStudents = [];
window.adminMode = 'single'; // 'single' ya 'all'
window.adminSchoolsList = []; // View All mode me sab schools

/**
 * Initialize admin students page
 */
window.initAdminStudents = function() {
  const params = new URLSearchParams(window.location.search);
  window.adminSchoolId = params.get('schoolId');
  window.adminMode = params.get('mode') === 'all' ? 'all' : 'single';

  window.initAuth(async (user, role) => {
    if (!user) { window.location.href = 'index.html'; return; }
    if (role !== 'admin') { window.location.href = 'dashboard.html'; return; }

    if (window.adminMode === 'all') {
      // View All Students mode
      document.getElementById('pageTitle').textContent = 'All Students';
      document.getElementById('schoolFilter').style.display = 'block';
      await window.loadSchoolsDropdown();
      window.loadAdminStudents();
    } else {
      // Single school mode
      if (!window.adminSchoolId) {
        document.getElementById('loading').innerHTML = '<p style="color:red;">School ID missing. Please go back and try again.</p>';
        return;
      }
      const schoolName = params.get('schoolName') || 'School';
      document.getElementById('pageTitle').textContent = decodeURIComponent(schoolName) + ' — Students';
      window.loadAdminStudents();
    }
  });
};

/**
 * View All mode: schools dropdown populate karo
 */
window.loadSchoolsDropdown = async function() {
  try {
    const snap = await firebase.firestore().collection('schools').orderBy('schoolName').get();
    window.adminSchoolsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const select = document.getElementById('schoolFilter');
    select.innerHTML = '<option value="">All Schools</option>';
    window.adminSchoolsList.forEach(school => {
      const opt = document.createElement('option');
      opt.value = school.id;
      opt.textContent = school.schoolName || school.email;
      select.appendChild(opt);
    });
  } catch(e) {
    console.warn('Schools dropdown load failed:', e.message);
  }
};

/**
 * School filter change handler
 */
window.onSchoolFilterChange = function() {
  window.loadAdminStudents();
};

/**
 * Load students - school + class filter ke saath
 */
window.loadAdminStudents = async function() {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('studentsGrid').style.display = 'none';
  document.getElementById('emptyState').style.display = 'none';

  try {
    const classFilter = document.getElementById('classFilter').value;
    const filters = classFilter ? { class: classFilter } : {};

    let students = [];

    if (window.adminMode === 'all') {
      const selectedSchool = document.getElementById('schoolFilter').value;

      if (selectedSchool) {
        students = await window.dbGetAllStudents(selectedSchool, filters);
        const school = window.adminSchoolsList.find(s => s.id === selectedSchool);
        if (school) {
          document.getElementById('pageTitle').textContent = (school.schoolName || 'School') + ' — Students';
          window.adminSchoolId = selectedSchool;
        }
      } else {
        document.getElementById('pageTitle').textContent = 'All Students';
        window.adminSchoolId = null;
        const schoolsToLoad = window.adminSchoolsList.length > 0
          ? window.adminSchoolsList
          : (await firebase.firestore().collection('schools').get()).docs.map(d => ({ id: d.id, ...d.data() }));

        const allResults = await Promise.all(
          schoolsToLoad.map(async school => {
            try {
              const s = await window.dbGetAllStudents(school.id, filters);
              return s.map(st => ({ ...st, _schoolName: school.schoolName || school.email, _schoolId: school.id }));
            } catch(e) { return []; }
          })
        );
        students = allResults.flat();
      }
    } else {
      students = await window.dbGetAllStudents(window.adminSchoolId, filters);
    }

    window.adminAllStudents = students;
    document.getElementById('loading').style.display = 'none';

    // Class filter update karo — sirf wahi classes jo students me hain
    window.updateClassFilter(students, classFilter);

    if (students.length === 0) {
      document.getElementById('emptyState').style.display = 'block';
      return;
    }

    window.renderAdminStudents(students);
    document.getElementById('studentsGrid').style.display = 'grid';
  } catch (err) {
    document.getElementById('loading').innerHTML =
      '<p style="color:red;">Failed to load: ' + err.message + '</p>';
  }
};

/**
 * Class filter dynamically update karo - sirf available classes dikhao
 */
window.updateClassFilter = function(students, selectedClass) {
  // Agar class filter already selected hai to update mat karo (loop avoid)
  if (selectedClass) return;

  // Students se unique classes nikalo
  const classOrder = ['Nursery','LKG','UKG','KG','1','2','3','4','5','6','7','8','9','10'];
  const availableClasses = [...new Set(students.map(s => s.class).filter(Boolean))]
    .sort((a, b) => {
      const ai = classOrder.indexOf(a);
      const bi = classOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  const select = document.getElementById('classFilter');
  const currentVal = select.value;
  select.innerHTML = '<option value="">All Classes</option>';
  availableClasses.forEach(cls => {
    const opt = document.createElement('option');
    opt.value = cls;
    opt.textContent = isNaN(cls) ? cls : 'Class ' + cls;
    if (cls === currentVal) opt.selected = true;
    select.appendChild(opt);
  });
};

/**
 * Render student cards
 */
window.renderAdminStudents = function(students) {
  const grid = document.getElementById('studentsGrid');
  grid.innerHTML = '';

  students.forEach(student => {
    const schoolBadge = student._schoolName
      ? `<p style="font-size:11px;color:var(--primary);font-weight:600;margin:2px 0;">🏫 ${student._schoolName}</p>`
      : '';
    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
      <div class="header">Student ID: ${student.id || 'N/A'}</div>
      <div class="body">
        <img class="photo" src="${student.photo || 'assets/placeholder.png'}" alt="Photo" onerror="this.src='assets/placeholder.png'">
        <h4 style="margin:5px 0;">${student.name || 'Unknown'}</h4>
        ${schoolBadge}
        <p style="font-size:13px;color:var(--text-muted);">${student.class || ''} - ${student.section || ''}</p>
        <div class="details">
          <p><strong>Father:</strong> <span>${student.father || '-'}</span></p>
          <p><strong>Mobile:</strong> <span>${student.mobile || '-'}</span></p>
          <p><strong>Added:</strong> <span>${student.createdAt ? new Date(student.createdAt).toLocaleDateString('en-IN') : '-'}</span></p>
        </div>
        <div class="actions">
          <button onclick="window.printStudent('${student.id}', '${student._schoolId || window.adminSchoolId || ''}')">🖨️ Print</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
};

/**
 * Clear all filters
 */
window.clearAdminFilters = function() {
  document.getElementById('classFilter').value = '';
  if (window.adminMode === 'all') {
    document.getElementById('schoolFilter').value = '';
    document.getElementById('pageTitle').textContent = 'All Students';
    window.adminSchoolId = null;
  }
  window.loadAdminStudents();
};

/**
 * Print single student
 */
window.printStudent = function(studentId, schoolId) {
  const sid = schoolId || window.adminSchoolId || '';
  window.open(`print.html?id=${studentId}&schoolId=${sid}`, '_blank', 'width=800,height=600');
};

/**
 * Print all students
 */
window.adminBulkPrint = function() {
  if (window.adminAllStudents.length === 0) {
    window.showToast('No students to print', 'error');
    return;
  }
  const ids = window.adminAllStudents.map(s => s.id).join(',');
  const schoolId = window.adminSchoolId || '';
  window.open(`print.html?ids=${ids}&schoolId=${schoolId}`, '_blank', 'width=800,height=600');
};

/**
 * Export CSV
 */
window.adminExportCSV = async function() {
  if (window.adminAllStudents.length === 0) {
    window.showToast('No students to export', 'error');
    return;
  }
  let schoolName = window.adminMode === 'all' ? 'All Schools' : 'School';
  if (window.adminSchoolId) {
    try {
      const doc = await firebase.firestore().collection('schools').doc(window.adminSchoolId).get();
      if (doc.exists) schoolName = doc.data().schoolName || 'School';
    } catch(e) {}
  }

  const headers = ['Student ID', 'Name', 'Father Name', 'Class', 'Section', 'Mobile', 'Address', 'School', 'Added On'];
  const rows = window.adminAllStudents.map(s => [
    s.id||'', s.name||'', s.father||'', s.class||'',
    s.section||'', s.mobile||'', s.address||'',
    s._schoolName || schoolName,
    s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : ''
  ]);
  const csv = [
    [`School: ${schoolName} (Downloaded: ${new Date().toLocaleDateString('en-IN')})`],
    headers,
    ...rows
  ].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const short = schoolName.split(/\s+/).map(w => w[0].toUpperCase()).join('').slice(0,6);
  a.download = `${short}_students_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  window.showToast(`Exported ${window.adminAllStudents.length} students`, 'success');
};

/**
 * Download ZIP (photos + CSV)
 */
window.adminBulkDownload = async function() {
  if (window.adminAllStudents.length === 0) {
    window.showToast('No students to download', 'error');
    return;
  }
  window.showToast(`Preparing ZIP for ${window.adminAllStudents.length} students...`, 'info');
  try {
    const zip = new JSZip();
    let schoolName = window.adminMode === 'all' ? 'All_Schools' : 'School';
    if (window.adminSchoolId) {
      try {
        const doc = await firebase.firestore().collection('schools').doc(window.adminSchoolId).get();
        if (doc.exists) schoolName = doc.data().schoolName || 'School';
      } catch(e) {}
    }

    const short = schoolName.split(/\s+/).map(w => w[0].toUpperCase()).join('').slice(0,6);
    const dateStr = new Date().toISOString().slice(0,10);
    const photosFolder = zip.folder('photos');

    await Promise.all(window.adminAllStudents.filter(s => s.photo).map(s => new Promise(async resolve => {
      try {
        const storageRef = firebase.storage().refFromURL(s.photo);
        const freshUrl = await storageRef.getDownloadURL();
        const blob = await new Promise((res, rej) => {
          const xhr = new XMLHttpRequest();
          xhr.responseType = 'blob';
          xhr.onload = () => xhr.status === 200 ? res(xhr.response) : rej(new Error('HTTP ' + xhr.status));
          xhr.onerror = () => rej(new Error('Network error'));
          xhr.open('GET', freshUrl);
          xhr.send();
        });
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        const classFolder = photosFolder.folder(s.class || 'Unknown');
        classFolder.file(`${s.id}_${(s.name||'student').replace(/\s+/g,'_')}.${ext}`, blob);
      } catch(e) {
        console.warn('Photo download failed:', s.id, e.message);
      }
      resolve();
    })));

    const headers = ['Student ID', 'Name', 'Father Name', 'Class', 'Section', 'Mobile', 'Address', 'School', 'Added On'];
    const rows = window.adminAllStudents.map(s => [
      s.id||'', s.name||'', s.father||'', s.class||'',
      s.section||'', s.mobile||'', s.address||'',
      s._schoolName || schoolName,
      s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : ''
    ]);
    const csv = [
      [`School: ${schoolName} (Downloaded: ${new Date().toLocaleDateString('en-IN')})`],
      headers,
      ...rows
    ].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    zip.file(`${short}_students_${dateStr}.csv`, csv);

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${short}_students_${dateStr}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showToast('ZIP downloaded!', 'success');
  } catch(err) {
    window.showToast('Download failed: ' + err.message, 'error');
  }
};
