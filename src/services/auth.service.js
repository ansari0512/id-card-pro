/**
 * Authentication Service
 * Handles all authentication related operations
 */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.currentRole = null;
    this.firebaseService = window.firebaseService;
  }

  // Initialize authentication listener
  init() {
    return new Promise((resolve) => {
      this.firebaseService.onAuthStateChanged(async (user) => {
        this.currentUser = user;
        if (user) {
          this.currentRole = await this.firebaseService.getUserRole(user.uid);
        } else {
          this.currentRole = null;
        }
        resolve({ user: this.currentUser, role: this.currentRole });
      });
    });
  }

  // Login with email and password
  async login(email, password) {
    try {
      const user = await this.firebaseService.signIn(email, password);
      const role = await this.firebaseService.getUserRole(user.uid);
      
      this.currentUser = user;
      this.currentRole = role;
      
      return { user, role };
    } catch (error) {
      throw error;
    }
  }

  // Logout
  async logout() {
    try {
      await this.firebaseService.signOut();
      this.currentUser = null;
      this.currentRole = null;
    } catch (error) {
      throw error;
    }
  }

  // Create school account (admin only)
  async createSchoolAccount(email, password, schoolData) {
    const secondaryApp = firebase.initializeApp(
      firebase.app().options, 
      'secondary_' + Date.now()
    );
    const secondaryAuth = secondaryApp.auth();

    try {
      const credential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
      const uid = credential.user.uid;

      // Create user document
      await this.firebaseService.createUser(uid, {
        role: 'school',
        email,
        createdAt: Date.now(),
        createdBy: this.currentUser ? this.currentUser.uid : null
      });

      // Create school document
      await this.firebaseService.createSchool(uid, {
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

  // Check if user is logged in
  isLoggedIn() {
    return this.currentUser !== null;
  }

  // Get current user
  getUser() {
    return this.currentUser;
  }

  // Get current role
  getRole() {
    return this.currentRole;
  }

  // Check if user is admin
  isAdmin() {
    return this.currentRole === 'admin';
  }

  // Require authentication (redirect if not logged in)
  requireAuth(redirectUrl = 'index.html') {
    if (!this.isLoggedIn()) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }

  // Require admin role (redirect if not admin)
  requireAdmin(redirectUrl = 'dashboard.html') {
    if (!this.isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    if (!this.isAdmin()) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }
}

// Global Auth Service Instance
window.authService = new AuthService();