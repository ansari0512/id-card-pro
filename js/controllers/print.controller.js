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

    // Admin se print karne pe schoolId URL me hoga, warna apna uid use karo
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
    document.getElementById('cardsContainer').style.display = 'grid';
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

  students.forEach(student => {
    const card = document.createElement('div');
    card.className = 'id-card';
    card.innerHTML = `
      <div class="header">RK CHOICE ID CARD</div>
      <div class="body">
        <img class="photo" src="${student.photo || 'assets/placeholder.png'}" alt="Photo" onerror="this.src='assets/placeholder.png'">
        <div class="details">
          <p><strong>Name:</strong> <span>${student.name || '-'}</span></p>
          <p><strong>ID:</strong> <span>${student.id || '-'}</span></p>
          <p><strong>Class:</strong> <span>${student.class || '-'} - ${student.section || '-'}</span></p>
          <p><strong>Father:</strong> <span>${student.father || '-'}</span></p>
          <p><strong>Mobile:</strong> <span>${student.mobile || '-'}</span></p>
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
        <div class="id-number">${student.id || ''}</div>
        <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=${encodeURIComponent(student.id || '')}" alt="QR" style="position:static;width:40px;height:40px;">
      </div>
    `;
    container.appendChild(card);
  });
};

// Init on load
document.addEventListener('DOMContentLoaded', window.initPrint);
