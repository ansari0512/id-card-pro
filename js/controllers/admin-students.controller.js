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
