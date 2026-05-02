/**
 * Student Service
 * All student-related database operations
 */

import { db, auth, storage } from './firebase.service.js';
import { dbStudents, dbGetAllStudents as dbGetAllStudentsMock } from './mock.service.js';
import { ID_PREFIX } from '../config/app.config.js';

/**
 * Determine if using mock or real Firebase
 */
function isMockMode() {
  return !db; // If db is undefined, we're in mock mode
}

/**
 * Generate unique student ID
 */
export function generateStudentId() {
  return ID_PREFIX + Date.now();
}

/**
 * Create new student with photo upload
 */
export async function createStudent(studentData, photoFile) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  const studentId = generateStudentId();

  // Upload photo if provided
  let photoUrl = null;
  if (photoFile) {
    photoUrl = await uploadPhoto(studentId, photoFile);
  }

  // Prepare student data
  const student = {
    id: studentId,
    uid: user.uid,
    schoolId: user.uid,
    ...studentData,
    photo: photoUrl,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // Save to Firestore (or mock)
  if (isMockMode()) {
    const item = { ...student, docId: undefined };
    const arr = getStudents();
    arr.unshift(item);
    saveStudents(arr);
  } else {
    await dbStudents(user.uid, studentData.class).add({
      ...student,
      docId: undefined
    });
  }

  return { ...student, photo: photoUrl };
}

/**
 * Upload photo to storage
 */
async function uploadPhoto(studentId, file) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  // Validate file
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files allowed');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Photo size must be less than 5MB');
  }

  if (isMockMode()) {
    // Mock: return base64 data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  const storageRef = storage.ref(`students/${user.uid}/${studentId}_${Date.now()}`);
  const snapshot = await storageRef.put(file);
  return await snapshot.ref.getDownloadURL();
}

/**
 * Get students with filters (school-specific)
 */
export async function getStudents(filters = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  if (isMockMode()) {
    let results = getStudents().filter(s => s.schoolId === user.uid);

    if (filters.class) results = results.filter(s => s.class === filters.class);
    if (filters.section) results = results.filter(s => s.section === filters.section);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(s =>
        s.name?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q)
      );
    }

    return results
      .map(s => ({ ...s, docId: s.docId || s.id }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  // Real Firebase
  return dbGetAllStudents(user.uid, filters);
}

/**
 * Get single student by ID
 */
export async function getStudent(studentId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  if (isMockMode()) {
    const student = getStudents().find(s => s.id === studentId && s.schoolId === user.uid);
    if (!student) throw new Error('Student not found');
    return { ...student, docId: student.docId || student.id };
  }

  // Real Firebase - search across all classes
  const classes = ['Nursery','LKG','UKG','KG','1','2','3','4','5','6','7','8','9','10'];
  for (const cls of classes) {
    const snapshot = await dbStudents(user.uid, cls)
      .where('id', '==', studentId)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  }
  throw new Error('Student not found');
}

/**
 * Update student
 */
export async function updateStudent(studentId, updates) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  // Verify ownership
  const student = await getStudent(studentId);
  if (student.uid !== user.uid) {
    throw new Error('Unauthorized');
  }

  const updateData = {
    ...updates,
    updatedAt: Date.now()
  };

  if (isMockMode()) {
    const arr = getStudents();
    const idx = arr.findIndex(s => s.docId === student.docId || s.id === studentId);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...updates, updatedAt: Date.now() };
      saveStudents(arr);
    }
    return { id: studentId, ...student, ...updates };
  }

  await dbStudents(user.uid, student.class).doc(student.id).update(updateData);
  return { id: studentId, ...student, ...updates };
}

/**
 * Delete student and associated photo
 */
export async function deleteStudent(studentId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  const student = await getStudent(studentId);
  if (student.uid !== user.uid) {
    throw new Error('Unauthorized');
  }

  // Delete photo
  if (student.photo) {
    try {
      if (isMockMode()) {
        // Mock: nothing to delete
      } else {
        const photoRef = storage.refFromURL(student.photo);
        await photoRef.delete();
      }
    } catch (e) {
      console.warn('Photo delete failed:', e.message);
    }
  }

  // Delete record
  if (isMockMode()) {
    saveStudents(getStudents().filter(s => (s.docId || s.id) !== studentId));
  } else {
    await dbStudents(user.uid, student.class).doc(student.id).delete();
  }

  return true;
}

/**
 * Get student count for a school
 */
export async function getStudentCount(schoolId) {
  if (isMockMode()) {
    return getStudents().filter(s => s.schoolId === schoolId).length;
  }

  try {
    const snapshot = await db.collection('students')
      .where('schoolId', '==', schoolId)
      .count()
      .get();
    return snapshot.data().count;
  } catch (e) {
    console.error('Count error:', e);
    return 0;
  }
}

/**
 * Bulk delete students
 */
export async function bulkDeleteStudentIds(studentIds) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  if (isMockMode()) {
    saveStudents(getStudents().filter(s => !studentIds.includes(s.id)));
    return studentIds.length;
  }

  // Real Firebase batch delete
  const students = [];
  for (const id of studentIds) {
    try {
      const student = await getStudent(id);
      if (student.uid === user.uid) {
        students.push(student);
      }
    } catch (e) {
      console.warn(`Skipping ${id}:`, e.message);
    }
  }

  const batch = db.batch();
  students.forEach(student => {
    batch.delete(dbStudents(user.uid, student.class).doc(student.id));
  });

  await batch.commit();
  return students.length;
}

// Export mock helpers (needed for mock mode)
import { getStudents as getMockStudents, saveStudents as saveMockStudents } from './mock.service.js';
