import { auth, db, getUserRole } from './firebase.js';

let currentUser = null;
let currentRole = null;

export function initAuth(onChange) {
  auth.onAuthStateChanged(async user => {
    currentUser = user;
    if (user) {
      currentRole = await getUserRole(user.uid);
    } else {
      currentRole = null;
    }
    onChange(user, currentRole);
  });
}

export async function login(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    currentRole = await getUserRole(user.uid);
    currentUser = user;
    return { user, role: currentRole };
  } catch (error) {
    throw mapAuthError(error.code, error.message);
  }
}

export async function logout() {
  try {
    await auth.signOut();
    currentUser = null;
    currentRole = null;
  } catch (error) {
    throw new Error('Logout failed: ' + error.message);
  }
}

// Admin creates school account (does NOT log out admin)
export async function createSchoolAccount(email, password, schoolData) {
  // Use secondary app instance to avoid logging out admin
  const secondaryApp = window.firebase.initializeApp(window.firebase.app().options, 'secondary_' + Date.now());
  const secondaryAuth = secondaryApp.auth();
  try {
    const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    await db.collection('users').doc(uid).set({
      role: 'school',
      email,
      createdAt: Date.now(),
      createdBy: currentUser ? currentUser.uid : null
    });

    await db.collection('schools').doc(uid).set({
      ...schoolData,
      email,
      uid,
      createdAt: Date.now(),
      active: true
    });

    return uid;
  } finally {
    await secondaryAuth.signOut();
    await secondaryApp.delete();
  }
}

export function isLoggedIn() {
  return currentUser !== null;
}

export function getCurrentUser() {
  return currentUser;
}

export function getRole() {
  return currentRole;
}

export function isAdmin() {
  return currentRole === 'admin';
}

function mapAuthError(code, message) {
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
  return new Error(errorMap[code] || message);
}

export function requireAuth(redirectUrl = 'login.html') {
  if (!isLoggedIn()) {
    window.location.href = redirectUrl;
    return false;
  }
  return true;
}

export function requireAdmin(redirectUrl = 'dashboard.html') {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  if (currentRole !== 'admin') {
    window.location.href = redirectUrl;
    return false;
  }
  return true;
}