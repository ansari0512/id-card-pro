/**
 * Admin Students Controller
 * Handles admin view of school students (admin-students.html)
 */

window.adminSchoolId = null;
window.adminAllStudents = [];

/**
 * Initialize admin students page
 */
window.initAdminStudents = function() {
  const params = new URLSearchParams(window.location.search);
  window.adminSchoolId = params.get('schoolId');
  const schoolName = params.get('schoolName') || 'School';

  document.getElementById('pageTitle').textContent = decodeURIComponent(schoolName) + ' — Students';

  window.initAuth(async (user, role) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    if (role !== 'admin') {
      window.location.href = 'dashboard.html';
      return;
    }

    window.loadAdminStudents();
  });
};

/**
 * Load students for selected school
 */
window.loadAdminStudents = async function() {
  try {
    const classFilter = document.getElementById('classFilter').value;
    const filters = classFilter ? { class: classFilter } : {};

    const students = await window.dbGetAllStudents(window.adminSchoolId, filters);
    window.adminAllStudents = students;

    document.getElementById('loading').style.display = 'none';

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
 * Render student cards
 */
window.renderAdminStudents = function(students) {
  const grid = document.getElementById('studentsGrid');
  grid.innerHTML = '';

  students.forEach(student => {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
      <div class="header">Student ID: ${student.id || 'N/A'}</div>
      <div class="body">
        <img class="photo" src="${student.photo || 'assets/placeholder.png'}" alt="Photo" onerror="this.src='assets/placeholder.png'">
        <h4 style="margin:5px 0;">${student.name || 'Unknown'}</h4>
        <p style="font-size:13px;color:var(--text-muted);">${student.class || ''} - ${student.section || ''}</p>
        <div class="details">
          <p><strong>Father:</strong> <span>${student.father || '-'}</span></p>
          <p><strong>Mobile:</strong> <span>${student.mobile || '-'}</span></p>
          <p><strong>Added:</strong> <span>${new Date(student.createdAt).toLocaleDateString('en-IN')}</span></p>
        </div>
        <div class="actions">
          <button onclick="window.printStudent('${student.id}')">🖨️ Print</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
};

/**
 * Clear class filter
 */
window.clearAdminFilters = function() {
  document.getElementById('classFilter').value = '';
  window.loadAdminStudents();
};

/**
 * Print single student
 */
window.printStudent = function(studentId) {
  window.open('print.html?id=' + studentId, '_blank', 'width=800,height=600');
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
  window.open('print.html?ids=' + ids, '_blank', 'width=800,height=600');
};

/**
 * Export CSV
 */
window.adminExportCSV = function() {
  if (window.adminAllStudents.length === 0) {
    window.showToast('No students to export', 'error');
    return;
  }
  const headers = ['Student ID', 'Name', 'Father Name', 'Class', 'Section', 'Mobile', 'Address', 'Added On'];
  const rows = window.adminAllStudents.map(s => [
    s.id || '', s.name || '', s.father || '', s.class || '',
    s.section || '', s.mobile || '', s.address || '',
    s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : ''
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `students_${new Date().toISOString().slice(0,10)}.csv`;
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
    const headers = ['Student ID', 'Name', 'Father Name', 'Class', 'Section', 'Mobile', 'Address'];
    const rows = window.adminAllStudents.map(s => [s.id||'', s.name||'', s.father||'', s.class||'', s.section||'', s.mobile||'', s.address||'']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    zip.file('students.csv', csv);

    const photosFolder = zip.folder('photos');
    await Promise.all(window.adminAllStudents.filter(s => s.photo).map(s => {
      return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d').drawImage(img, 0, 0);
          canvas.toBlob(blob => {
            if (blob) {
              const ext = blob.type.includes('png') ? 'png' : 'jpg';
              photosFolder.file(`${s.id}_${(s.name||'student').replace(/\s+/g,'_')}.${ext}`, blob);
            }
            resolve();
          }, 'image/jpeg', 0.9);
        };
        img.onerror = () => resolve();
        img.src = s.photo + (s.photo.includes('?') ? '&' : '?') + 't=' + Date.now();
      });
    }));

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.showToast('ZIP downloaded!', 'success');
  } catch(err) {
    window.showToast('Download failed: ' + err.message, 'error');
  }
};
