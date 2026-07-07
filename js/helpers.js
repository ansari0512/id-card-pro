/**
 * Helper Utilities
 * Common utility functions for the ID Card System
 */

/**
 * Format date to Indian format
 */
window.formatDateIndian = function(timestamp) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleDateString('en-IN');
};

/**
 * Capitalize first letter of each word
 */
window.toProperCase = function(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
};

/**
 * Apply proper case to input field (preserves cursor position) - SHARED IMPLEMENTATION
 */
window.commonApplyProperCase = function(input) {
  const pos = input.selectionStart;
  input.value = window.toProperCase(input.value);
  input.setSelectionRange(pos, pos);
};

// Backward compatibility wrapper
window.applyProperCase = function(input) {
  return window.commonApplyProperCase && window.commonApplyProperCase(input);
};

/**
 * Mock mode detector - checks if Firebase Firestore is available - SHARED IMPLEMENTATION
 */
window.commonIsMockMode = function() {
  return !window.firebase?.firestore;
};

// Backward compatibility wrapper
window.isMockMode = function() {
  return window.commonIsMockMode && window.commonIsMockMode();
};

/**
 * Sanitize HTML (prevent XSS)
 */
window.sanitize = function(str) {
  if (typeof str !== 'string') return str;
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * Show toast notification
 */
window.showToast = function(msg, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    z-index: 99999;
    font-family: Poppins, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

/**
 * Shared CSV download engine - handles Blob creation, download trigger, and cleanup
 * @param {Array<string>} headers - Column headers
 * @param {Array<Array<string>>} rows - Data rows
 * @param {string} filename - Download filename
 * @param {Array<string>} [prefixRows] - Optional prefix rows (e.g. school name header)
 */
window.csvDownload = function(headers, rows, filename, prefixRows) {
  const csvParts = [];
  
  // Add prefix rows (e.g. school name header line)
  if (prefixRows && prefixRows.length) {
    prefixRows.forEach(function(prefix) {
      csvParts.push(
        prefix.map(function(val) { return '"' + String(val).replace(/"/g, '""') + '"'; }).join(',')
      );
    });
  }
  
  // Add header row
  csvParts.push(
    headers.map(function(h) { return '"' + String(h).replace(/"/g, '""') + '"'; }).join(',')
  );
  
  // Add data rows
  rows.forEach(function(row) {
    csvParts.push(
      row.map(function(val) { return '"' + String(val).replace(/"/g, '""') + '"'; }).join(',')
    );
  });

  const csv = csvParts.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'export_' + new Date().toISOString().slice(0,10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Export data to CSV (backward compatible wrapper using shared engine)
 */
window.exportToCSV = function(data, filename) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map(function(row) {
    return headers.map(function(header) {
      return row[header] || '';
    });
  });

  window.csvDownload(headers, rows, filename);
};

/**
 * Debounce function
 */
window.debounce = function(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

window.ALL_CLASSES = ['Nursery','LKG','UKG','KG','1','2','3','4','5','6','7','8','9','10','11','12'];

window.normalizeClassValue = function(val) {
  const raw = String(val == null ? '' : val).trim();
  if (!raw) return '';

  const classMatch = raw.match(/^class\s*(\d+)$/i);
  if (classMatch && classMatch[1]) return classMatch[1];

  const compact = raw.toUpperCase().replace(/[.\s-]+/g, '');
  if (!compact) return '';

  const romanMap = {
    I: '1',
    II: '2',
    III: '3',
    IV: '4',
    V: '5',
    VI: '6',
    VII: '7',
    VIII: '8',
    IX: '9',
    X: '10',
    XI: '11',
    XII: '12'
  };

  if (romanMap[compact]) return romanMap[compact];

  const aliasMap = {
    LKG: 'LKG',
    UKG: 'UKG',
    KG: 'KG'
  };

  if (aliasMap[compact]) return aliasMap[compact];

  if (/^\d+$/.test(compact)) return compact;

  return compact;
};

window.normalizeDateValue = function(value) {
  if (value == null) return '';
  const raw = typeof value === 'string' ? value.trim() : String(value).trim();
  if (!raw) return '';

  const formatDate = function(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const parseDateParts = function(year, month, day) {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    return date;
  };

  const asNumber = Number(raw);
  const isExcelSerial = Number.isFinite(asNumber) && asNumber > 30 && asNumber < 60000;
  const parseExcelSerial = function(serial) {
    const epoch = Date.UTC(1899, 11, 31);
    const offset = serial > 60 ? serial - 1 : serial;
    return new Date(epoch + offset * 86400000);
  };

  if (/^\d+$/.test(raw)) {
    if (isExcelSerial) {
      const excelDate = parseExcelSerial(asNumber);
      const formatted = formatDate(excelDate);
      if (formatted) return formatted;
    }

    if (raw.length === 8) {
      const dmy = parseDateParts(raw.slice(4), raw.slice(2, 4), raw.slice(0, 2));
      if (dmy) return formatDate(dmy);

      const ymd = parseDateParts(raw.slice(0, 4), raw.slice(4, 6), raw.slice(6));
      if (ymd) return formatDate(ymd);
    }

    if (raw.length === 6) {
      const year = raw.slice(4).length === 2 ? Number(raw.slice(4)) : null;
      if (year !== null) {
        const fullYear = year > 30 ? 1900 + year : 2000 + year;
        const dmy = parseDateParts(fullYear, raw.slice(2, 4), raw.slice(0, 2));
        if (dmy) return formatDate(dmy);
      }
    }

    return raw;
  }

  const isoMatch = raw.match(/^(\d{4})[\/\.\-\s](\d{1,2})[\/\.\-\s](\d{1,2})$/);
  if (isoMatch) {
    const date = parseDateParts(isoMatch[1], isoMatch[2], isoMatch[3]);
    if (date) return formatDate(date);
  }

  const dmyMatch = raw.match(/^(\d{1,2})[\/\.\-\s](\d{1,2})[\/\.\-\s](\d{2,4})$/);
  if (dmyMatch) {
    const year = dmyMatch[3].length === 2 ? (Number(dmyMatch[3]) > 30 ? 1900 + Number(dmyMatch[3]) : 2000 + Number(dmyMatch[3])) : Number(dmyMatch[3]);
    const date = parseDateParts(year, dmyMatch[2], dmyMatch[1]);
    if (date) return formatDate(date);
  }

  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return formatDate(parsed);
  }

  return raw;
};

window.getClassQueryVariants = function(val) {
  const raw = String(val == null ? '' : val).trim();
  if (!raw) return [];

  const normalized = window.normalizeClassValue(raw);
  const variants = [raw, normalized].filter(Boolean);
  return [...new Set(variants)];
};

/**
 * Compress image using canvas (client-side)
 * @param {File} imageFile - Original image file
 * @param {number} maxWidth - Maximum width (default 800)
 * @param {number} maxHeight - Maximum height (default 800)
 * @param {number} quality - JPEG quality 0-1 (default 0.8)
 * @returns {Promise<File>} Compressed image as File
 */
window.compressImage = function(imageFile, maxWidth = 800, maxHeight = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!imageFile.type.startsWith('image/')) {
      resolve(imageFile); // Not an image, return as-is
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          function(blob) {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }
            // Create a new File with same name but compressed
            const compressedFile = new File([blob], imageFile.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = function() {
        reject(new Error('Image loading failed'));
      };
      img.src = e.target.result;
    };
    reader.onerror = function() {
      reject(new Error('File reading failed'));
    };
    reader.readAsDataURL(imageFile);
  });
};

/**
 * Upload photo shared by id-form and student controller.
 * path: student_photos/{schoolName}/{className}/{studentName}_{studentId}.ext
 * Now includes automatic compression for images > 500KB
 * Max upload size: 3MB (enforced by form controllers)
 */
window.uploadPhoto = async function(userId, studentId, file, className, studentName) {
  let schoolName = 'School';
  try {
    const schoolDoc = await firebase.firestore().collection('schools').doc(userId).get();
    if (schoolDoc.exists) schoolName = schoolDoc.data().schoolName || 'School';
  } catch(e) {}

  const cls     = (className   || 'Unknown').replace(/[^a-zA-Z0-9 _-]/g, '');
  const sName   = (studentName || studentId).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeSch = schoolName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');

  // Compress image if it's an image and larger than 500KB
  let finalFile = file;
  if (file.type.startsWith('image/') && file.size > 500 * 1024) { // > 500KB
    try {
      // Compress to max 600px, quality 0.65
      finalFile = await window.compressImage(file, 600, 600, 0.65);
      console.log('Image compressed:', file.size, '→', finalFile.size, 'bytes');
    } catch (err) {
      console.warn('Compression failed, using original:', err.message);
    }
  }

  const ext = finalFile.type.includes('png') ? 'png' : 'jpg';
  // Path includes userId for storage rule school isolation: student_photos/{schoolId}/{schoolName}/{className}/{fileName}
  const path = `student_photos/${userId}/${safeSch}/${cls}/${sName}_${studentId}.${ext}`;
  const storageRef = firebase.storage().ref(path);
  const snapshot = await storageRef.put(finalFile);
  return await snapshot.ref.getDownloadURL();
};

/**
 * Delete photo from Firebase Storage
 * Extracts path from photo URL and deletes the file
 */
window.deletePhoto = async function(photoUrl) {
  if (!photoUrl) return;
  try {
    // Check if user is logged in
    const user = firebase.auth().currentUser;
    if (!user) {
      console.warn('User not logged in, skipping photo delete');
      return;
    }
    
    const storageRef = firebase.storage().refFromURL(photoUrl);
    await storageRef.delete();
  } catch (error) {
    console.warn('Photo delete failed:', error.message);
    // Don't throw error - continue with student deletion
  }
};

/**
 * Generate unique student ID using Firestore transaction (race condition safe)
 * Format: {SCHOOLCODE}-{YEAR}-{0001}
 */
window.generateStudentId = async function(schoolId) {
  const year = new Date().getFullYear();
  const db = firebase.firestore();

  let schoolCode = 'SCH';
  try {
    const schoolDoc = await db.collection('schools').doc(schoolId).get();
    if (schoolDoc.exists) {
      schoolCode = (schoolDoc.data().schoolName || '')
        .split(/\s+/).filter(w => w.length > 0)
        .map(w => w[0].toUpperCase()).join('').slice(0, 4) || 'SCH';
    }
  } catch(e) {}

  // Use a counter document to keep ID generation race-condition safe.
  const counterRef = db.collection('schools').doc(schoolId)
    .collection('counters').doc(String(year));

  const newSerial = await db.runTransaction(async tx => {
    const doc = await tx.get(counterRef);
    const next = doc.exists ? (Number(doc.data().count) || 0) + 1 : 1;
    tx.set(counterRef, { count: next });
    return next;
  });

  return `${schoolCode}-STU-${year}-${String(newSerial).padStart(4, '0')}`;
};

window.dbStudents = function(schoolId, className) {
  return firebase.firestore()
    .collection('schools').doc(schoolId)
    .collection('classes').doc(className)
    .collection('students');
};

window.dbGetAllStudents = async function(schoolId, filters = {}) {
  const sectionFilter = filters.section ? String(filters.section).trim() : '';
  const classFilter = filters.class ? window.normalizeClassValue(filters.class) : '';

  // When a specific class filter is provided, use existing per-class query (backward compatible)
  if (classFilter) {
    const targetClasses = [...new Set([
      filters.class,
      classFilter,
      ...window.getClassQueryVariants(filters.class)
    ].filter(Boolean))];

    const snapshots = await Promise.all(
      targetClasses.map(cls => {
        let q = window.dbStudents(schoolId, cls);
        if (sectionFilter) q = q.where('section', '==', sectionFilter);
        return q.get().then(snap =>
          snap.docs.map(d => ({ docId: d.id, ...d.data() }))
        ).catch(() => []);
      })
    );

    let results = snapshots.flat().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const deduped = new Map();
    results.forEach(student => {
      const key = student.docId || student.id;
      if (key && !deduped.has(key)) deduped.set(key, student);
    });
    results = Array.from(deduped.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(s =>
        s.name?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q)
      );
    }

    return results;
  }

  // No class filter: use collection group query to fetch all students in a single query.
  // Every student document is guaranteed to have schoolId (verified by integrity audit).
  try {
    let q = firebase.firestore().collectionGroup('students')
      .where('schoolId', '==', schoolId);
    if (sectionFilter) q = q.where('section', '==', sectionFilter);
    const snap = await q.get();
    let results = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (filters.search) {
      const query = filters.search.toLowerCase();
      results = results.filter(s =>
        s.name?.toLowerCase().includes(query) || s.id?.toLowerCase().includes(query)
      );
    }

    return results;
  } catch (cgError) {
    // Fallback: if collection group query fails (e.g. index not ready),
    // fall back to existing ALL_CLASSES loop for uninterrupted service.
    console.warn('CollectionGroup query failed, falling back to per-class queries:', cgError.message);
    const targetClasses = window.ALL_CLASSES;
    const snapshots = await Promise.all(
      targetClasses.map(cls => {
        let q = window.dbStudents(schoolId, cls);
        if (filters.section) q = q.where('section', '==', filters.section);
        return q.get().then(snap =>
          snap.docs.map(d => ({ docId: d.id, ...d.data() }))
        ).catch(() => []);
      })
    );

    let results = snapshots.flat().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(s =>
        s.name?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q)
      );
    }

    return results;
  }
};
