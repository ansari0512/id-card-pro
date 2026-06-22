/**
 * Print Controller
 * Handles ID card printing (print.html)
 */

window.printUser = null;

/**
 * Initialize print page
 */
window.initPrint = function() {
  window.initAuth(async (user, role) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    window.printUser = user;
    await window.loadPrintStudents(user);
  });
};

/**
 * Load students for printing
 */
window.loadPrintStudents = async function(user) {
  try {
    const params = new URLSearchParams(window.location.search);
    const idsParam = params.get('ids') || params.get('id');

    // Admin print links include schoolId in the URL; otherwise use the current user's UID.
    const schoolId = params.get('schoolId') || user.uid;

    const allStudents = await window.dbGetAllStudents(schoolId);

    if (idsParam) {
      const idArray = idsParam.split(',');
      const filtered = allStudents.filter(s => idArray.includes(s.id));
      window.renderPrintCards(filtered);
    } else {
      window.renderPrintCards(allStudents);
    }

    document.getElementById('loading').style.display = 'none';
    const container = document.getElementById('cardsContainer');
    container.classList.remove('d-none');
    container.style.display = 'grid';
  } catch (error) {
    document.getElementById('loading').innerHTML =
      '<p style="color:red;">Error loading students: ' + error.message + '</p>';
  }
};

/**
 * Render ID cards
 */
window.renderPrintCards = function(students) {
  const container = document.getElementById('cardsContainer');
  container.innerHTML = '';

  if (students.length === 0) {
    document.getElementById('loading').innerHTML = '<p>No students found.</p>';
    return;
  }

  students.forEach(function(student) {
    const card = document.createElement('div');
    card.className = 'id-card';

    // Header
    const header = document.createElement('div');
    header.className = 'card-header';
    header.textContent = 'RK CHOICE ID CARD';

    // Body
    const body = document.createElement('div');
    body.className = 'card-body';

    // Photo
    const photo = document.createElement('img');
    photo.className = 'card-photo';
    photo.src = student.photo || 'assets/placeholder.png';
    photo.alt = 'Photo';
    photo.onerror = function() { this.src = 'assets/placeholder.png'; };

    // Details
    const details = document.createElement('div');
    details.className = 'card-details';

    // Name
    const nameEl = document.createElement('div');
    nameEl.className = 'card-name';
    nameEl.textContent = student.name || 'Unknown';
    details.appendChild(nameEl);

    // Info rows (no name - name is already the heading)
    const rows = [
      { label: 'ID:', value: student.id || '-' },
      { label: 'Class:', value: (student.class || '-') + ' - ' + (student.section || '-') },
      { label: 'Father:', value: student.father || '-' },
      { label: 'Mobile:', value: student.mobile || '-' },
      { label: 'DOB:', value: student.dob || '-' }
    ];

    if (student.motherName) {
      rows.push({ label: 'Mother:', value: student.motherName });
    }
    if (student.bloodGroup) {
      rows.push({ label: 'Blood:', value: student.bloodGroup });
    }

    rows.forEach(function(row) {
      const div = document.createElement('div');
      div.className = 'card-info-row';

      const strong = document.createElement('strong');
      strong.textContent = row.label;

      const span = document.createElement('span');
      span.textContent = row.value;

      div.appendChild(strong);
      div.appendChild(span);
      details.appendChild(div);
    });

    body.appendChild(photo);
    body.appendChild(details);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'card-footer';

    const idEl = document.createElement('div');
    idEl.className = 'card-id';
    idEl.textContent = student.id || '';

    const qr = document.createElement('img');
    qr.className = 'card-qr';
    qr.src = 'https://api.qrserver.com/v1/create-qr-code/?size=28x28&data=' + encodeURIComponent(student.id || '');
    qr.alt = 'QR';

    footer.appendChild(idEl);
    footer.appendChild(qr);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    container.appendChild(card);
  });
};

/**
 * Save as PDF - show instructions then trigger print
 */
window.saveToPDF = function() {
  const instructions = `
📄 Save as PDF Instructions:

1. Press Ctrl+P (or Cmd+P on Mac)
2. Select "Save as PDF" as destination
3. Set these options for best quality:
   • Paper size: A4
   • Margins: Default
   • Scale: 100%
   • Options: ✓ Background graphics
    
4. Click "Save" to download PDF

Tip: Enable "Background graphics" for colored headers!`;
        
  alert(instructions);
  setTimeout(() => {
    window.print();
  }, 1000);
};

// Init on load
document.addEventListener('DOMContentLoaded', window.initPrint);
