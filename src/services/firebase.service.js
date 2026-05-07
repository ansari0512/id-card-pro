/**
 * Firebase Service Layer
 * Centralized Firebase operations for better maintainability
 */

class FirebaseService {
  constructor() {
    this.db = firebase.firestore();
    this.auth = firebase.auth();
    this.storage = firebase.storage();
  }

  // Authentication Methods
  async signIn(email, password) {
    try {
      const result = await this.auth.signInWithEmailAndPassword(email, password);
      return result.user;
    } catch (error) {
      throw this.mapAuthError(error);
    }
  }

  async signOut() {
    try {
      await this.auth.signOut();
    } catch (error) {
      throw new Error('Logout failed: ' + error.message);
    }
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }

  onAuthStateChanged(callback) {
    return this.auth.onAuthStateChanged(callback);
  }

  // User Role Methods
  async getUserRole(uid) {
    try {
      const doc = await this.db.collection('users').doc(uid).get();
      return doc.exists ? doc.data().role : 'school';
    } catch (error) {
      console.warn('getUserRole failed:', error.message);
      return 'school';
    }
  }

  async createUser(uid, userData) {
    return await this.db.collection('users').doc(uid).set(userData);
  }

  // School Methods
  async getSchool(schoolId) {
    const doc = await this.db.collection('schools').doc(schoolId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  async getAllSchools() {
    const snapshot = await this.db.collection('schools').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async createSchool(schoolId, schoolData) {
    return await this.db.collection('schools').doc(schoolId).set(schoolData);
  }

  async updateSchool(schoolId, updates) {
    return await this.db.collection('schools').doc(schoolId).update(updates);
  }

  async deleteSchool(schoolId) {
    return await this.db.collection('schools').doc(schoolId).delete();
  }

  // Student Methods
  getStudentsCollection(schoolId, className) {
    return this.db.collection('schools').doc(schoolId)
      .collection('classes').doc(className)
      .collection('students');
  }

  async getStudent(schoolId, className, studentId) {
    const doc = await this.getStudentsCollection(schoolId, className).doc(studentId).get();
    return doc.exists ? { docId: doc.id, ...doc.data() } : null;
  }

  async getAllStudents(schoolId, filters = {}) {
    const classes = filters.class ? [filters.class] : window.ALL_CLASSES;
    
    const snapshots = await Promise.all(
      classes.map(async cls => {
        try {
          let query = this.getStudentsCollection(schoolId, cls);
          if (filters.section) {
            query = query.where('section', '==', filters.section);
          }
          const snapshot = await query.get();
          return snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
        } catch (error) {
          return [];
        }
      })
    );

    let results = snapshots.flat().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      results = results.filter(student =>
        student.name?.toLowerCase().includes(searchTerm) ||
        student.id?.toLowerCase().includes(searchTerm)
      );
    }

    return results;
  }

  async createStudent(schoolId, className, studentData) {
    return await this.getStudentsCollection(schoolId, className).add(studentData);
  }

  async updateStudent(schoolId, className, docId, updates) {
    return await this.getStudentsCollection(schoolId, className).doc(docId).update(updates);
  }

  async deleteStudent(schoolId, className, docId) {
    return await this.getStudentsCollection(schoolId, className).doc(docId).delete();
  }

  // Storage Methods
  async uploadFile(path, file, metadata = {}) {
    const ref = this.storage.ref(path);
    const snapshot = await ref.put(file, metadata);
    return await snapshot.ref.getDownloadURL();
  }

  async deleteFile(path) {
    const ref = this.storage.ref(path);
    return await ref.delete();
  }

  // Counter Methods (for ID generation)
  async getNextStudentNumber(schoolId) {
    const year = new Date().getFullYear();
    const counterRef = this.db.collection('schools').doc(schoolId)
      .collection('counters').doc(String(year));

    return await this.db.runTransaction(async (transaction) => {
      const doc = await transaction.get(counterRef);
      const nextNumber = doc.exists ? doc.data().count + 1 : 1;
      transaction.set(counterRef, { count: nextNumber });
      return nextNumber;
    });
  }

  // Error Mapping
  mapAuthError(error) {
    const errorMap = {
      'auth/invalid-email': 'Invalid email address',
      'auth/user-disabled': 'Account disabled',
      'auth/user-not-found': 'User not found',
      'auth/wrong-password': 'Incorrect password',
      'auth/email-already-in-use': 'Email already registered',
      'auth/weak-password': 'Password should be at least 6 characters',
      'auth/operation-not-allowed': 'Operation not allowed',
      'auth/network-request-failed': 'Network error. Please check connection.'
    };
    
    const message = errorMap[error.code] || error.message;
    const mappedError = new Error(message);
    mappedError.code = error.code;
    return mappedError;
  }
}

// Global Firebase Service Instance
window.firebaseService = new FirebaseService();