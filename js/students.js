import { db, storage, auth } from './firebase.js';

/**
 * Students Module
 * Handles all student-related operations
 */

const STUDENTS_COLLECTION = 'students';

/**
 * Generate unique student ID
 */
export function generateStudentId() {
  return 'RK' + Date.now();
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
    schoolId: user.uid, // Data isolation: filtered by school's uid
    ...studentData,
    photo: photoUrl,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // Save to Firestore
  await db.collection(STUDENTS_COLLECTION).add(student);

  return { ...student, photo: photoUrl };
}

/**
 * Upload student photo to Firebase Storage
 */
async function uploadPhoto(studentId, file) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  // Validate file
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files allowed');
  }

  if (file.size > 5 * 1024 * 1024) { // 5MB
    throw new Error('Photo size must be less than 5MB');
  }

  const storageRef = storage.ref(`students/${user.uid}/${studentId}_${Date.now()}`);

  const snapshot = await storageRef.put(file);
  const downloadURL = await snapshot.ref.getDownloadURL();

  return downloadURL;
}

/**
 * Get all students for current user (with optional filters)
 */
export async function getStudents(filters = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  let query = db.collection(STUDENTS_COLLECTION)
    .where('uid', '==', user.uid);

  // Apply filters
  if (filters.class) {
    query = query.where('class', '==', filters.class);
  }
  if (filters.section) {
    query = query.where('section', '==', filters.section);
  }
  if (filters.search) {
    // Firestore doesn't support OR queries easily, fetch and filter client-side
    const snapshot = await db.collection(STUDENTS_COLLECTION)
      .where('uid', '==', user.uid)
      .get();
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(s => 
        s.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        s.id?.toLowerCase().includes(filters.search.toLowerCase())
      );
  }

  const snapshot = await query.orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get single student by ID
 */
export async function getStudent(studentId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  const snapshot = await db.collection(STUDENTS_COLLECTION)
    .where('id', '==', studentId)
    .where('uid', '==', user.uid)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error('Student not found');
  }

  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

/**
 * Update student data
 */
export async function updateStudent(studentId, updates) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  // Verify ownership
  const student = await getStudent(studentId);
  if (student.uid !== user.uid) {
    throw new Error('Unauthorized');
  }

  await db.collection(STUDENTS_COLLECTION).doc(student.id).update({
    ...updates,
    updatedAt: Date.now()
  });

  return { id: studentId, ...student, ...updates };
}

/**
 * Update student photo
 */
export async function updateStudentPhoto(studentId, photoFile) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  const student = await getStudent(studentId);
  if (student.uid !== user.uid) {
    throw new Error('Unauthorized');
  }

  // Delete old photo if exists
  if (student.photo) {
    try {
      const oldRef = storage.refFromURL(student.photo);
      await oldRef.delete();
    } catch (e) {
      console.warn('Old photo not found or deleted');
    }
  }

  // Upload new photo
  const photoUrl = await uploadPhoto(studentId, photoFile);

  // Update record
  await db.collection(STUDENTS_COLLECTION).doc(student.id).update({
    photo: photoUrl,
    updatedAt: Date.now()
  });

  return photoUrl;
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

  // Delete photo from storage
  if (student.photo) {
    try {
      const photoRef = storage.refFromURL(student.photo);
      await photoRef.delete();
    } catch (e) {
      console.warn('Photo delete failed:', e.message);
    }
  }

  // Delete Firestore document
  await db.collection(STUDENTS_COLLECTION).doc(student.id).delete();

  return true;
}

/**
 * Get student count for dashboard
 */
export async function getStudentCount() {
  const user = auth.currentUser;
  if (!user) return 0;

  const snapshot = await db.collection(STUDENTS_COLLECTION)
    .where('uid', '==', user.uid)
    .count()
    .get();

  return snapshot.data().count;
}

/**
 * Bulk delete students
 */
export async function bulkDeleteStudentIds(studentIds) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  const batch = db.batch();
  const deletePromises = [];

  for (const studentId of studentIds) {
    try {
      const student = await getStudent(studentId);
      if (student.uid === user.uid) {
        const docRef = db.collection(STUDENTS_COLLECTION).doc(student.id);
        batch.delete(docRef);

        // Delete photo
        if (student.photo) {
          deletePromises.push(
            storage.refFromURL(student.photo).delete().catch(() => {})
          );
        }
      }
    } catch (e) {
      console.warn(`Failed to queue ${studentId} for deletion:`, e.message);
    }
  }

  await batch.commit();
  await Promise.all(deletePromises);

  return studentIds.length;
}