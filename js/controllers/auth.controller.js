/**
 * Auth Controller
 * Handles authentication for login.html
 */

window.currentUser = null;
window.currentRole = null;

/**
 * Resolve role from Firestore user data.
 * Tries UID first, then email lookup, then admin email fallback.
 */
window.fetchUserRole = async function(user) {
  if (!user) return null;

  try {
    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      const role = userDoc.data().role;
      if (role) return role;
    }
  } catch (e) {
    console.warn('fetchUserRole Firestore read failed:', e.message);
  }

  return 'school';
};

/**
 * Initialize auth listener
 */
window.initAuth = function(onChange) {
  firebase.auth().onAuthStateChanged(async user => {
    window.currentUser = user;
    if (user) {
      window.currentRole = await window.fetchUserRole(user);
    } else {
      window.currentRole = null;
    }
    onChange(user, window.currentRole);
  });
};

/**
 * Login with email/password
 */
window.login = async function(email, password) {
  try {
    // First check if email exists in our users collection
    const usersSnapshot = await firebase.firestore().collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      // Email not found in our database
      throw new Error('User not found in data base');
    }
    
    // Email exists, now try to authenticate
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    const role = await window.fetchUserRole(user);

    window.currentUser = user;
    window.currentRole = role;

    return { user, role };
  } catch (error) {
    // If it's our custom "User not found" error, throw it as is
    if (error.message === 'User not found in data base') {
      throw error;
    }
    
    // For Firebase auth errors, map them properly
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-login-credentials') {
      throw new Error('Invalid password');
    }
    
    // Use the proper error mapping function for other errors
    throw mapAuthError(error.code, error.message);
  }
};

/**
 * Logout
 */
window.logout = async function() {
  try {
    await firebase.auth().signOut();
    window.currentUser = null;
    window.currentRole = null;
  } catch (error) {
    throw new Error('Logout failed: ' + error.message);
  }
};

/**
 * Admin creates school account (secondary app - doesn't logout admin)
 */
window.createSchoolAccount = async function(email, password, schoolData) {
  const secondaryApp = window.firebase.initializeApp(window.firebase.app().options, 'secondary_' + Date.now());
  const secondaryAuth = secondaryApp.auth();
  const currentUser = firebase.auth().currentUser;

  try {
    const cred = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid;

    await firebase.firestore().collection('users').doc(uid).set({
      role: 'school',
      email,
      createdAt: Date.now(),
      createdBy: currentUser ? currentUser.uid : null
    });

    await firebase.firestore().collection('schools').doc(uid).set({
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
};

/**
 * Check if logged in
 */
window.isLoggedIn = function() {
  return window.currentUser !== null;
};

/**
 * Get current user
 */
window.getCurrentUser = function() {
  return window.currentUser;
};

/**
 * Get current role
 */
window.getRole = function() {
  return window.currentRole;
};

/**
 * Check if admin
 */
window.isAdmin = function() {
  return window.currentRole === 'admin';
};

/**
 * Require auth (redirect if not logged in)
 */
window.requireAuth = function(redirectUrl = 'index.html') {
   if (!window.isLoggedIn()) {
     window.location.href = redirectUrl;
     return false;
   }
   return true;
};

/**
 * Require admin (redirect if not admin)
 */
window.requireAdmin = function(redirectUrl = 'dashboard.html') {
   if (!window.isLoggedIn()) {
     window.location.href = 'index.html';
     return false;
   }
   if (window.currentRole !== 'admin') {
     window.location.href = redirectUrl;
     return false;
   }
   return true;
};

/**
 * Map Firebase auth errors
 */
function mapAuthError(code, message) {
  const errorMap = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'Account disabled',
    'auth/user-not-found': 'User not found in data base',
    'auth/wrong-password': 'Invalid password',
    'auth/invalid-login-credentials': 'Invalid password',
    'auth/email-already-in-use': 'Email already registered',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/operation-not-allowed': 'Operation not allowed',
    'auth/network-request-failed': 'Network error. Please check connection.'
  };
  return new Error(errorMap[code] || message);
}
