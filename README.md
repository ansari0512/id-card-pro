# RK Choice ID Card System - Setup Guide

## 1. Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Click "Add project" → Name: `rk-choice-id`
3. Enable Google Analytics (optional) → Create

## 2. Enable Firebase Services
- **Authentication**: Enable Email/Password sign-in
- **Firestore Database**: Create in `test mode` (set strict rules before going to production)
- **Storage**: Enable Firebase Storage

## 3. Get Firebase Config
Project Settings → "Your apps" → Add a Web app
Copy the config values and update `js/firebase.js`:
- `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`

## 4. Deploy Security Rules

### Firestore Rules:
Paste the contents of `firestore.rules` in Firebase Console → Firestore → Rules tab.

### Storage Rules:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /students/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## 5. Create Admin Account (One-Time Setup)

### Step 1: Create the user in Firebase Authentication
1. Firebase Console → **Authentication** → Users → **Add User**
   - Email: `admin@rkchoice.com` (or any email you prefer)
   - Password: your strong password
2. After creation — **copy the UID** (e.g. `abc123xyz`)

### Step 2: Assign admin role in Firestore
1. Firebase Console → **Firestore Database**
2. Create a `users` collection (if it does not exist)
3. Add a document with ID = **admin's UID** (from Step 1)
4. Set the following fields:
   ```
   role: "admin"
   email: "admin@rkchoice.com"
   createdAt: (current timestamp)
   ```

That's it. Log in at `login.html` with your admin credentials — you will be redirected to the Admin Panel automatically.

## 6. Deploy Files
Upload all files to your server or Firebase Hosting:
```
firebase deploy --only hosting,firestore:rules,storage
```

---

## How to Use the App

### Admin (You)
1. Open `login.html` in browser
2. Enter your admin email and password → you will land on **Admin Panel**
3. Click **"Add New School"** → enter school name, email, password → Submit
4. Share that email and password with the school

### School
1. Open `login.html` in browser
2. Enter the email and password given by admin → you will land on **Dashboard**
3. Click **"Create New ID"** → fill student details, upload photo → Save
4. To view all students → click **"View Students"**
5. To print ID cards → click **"Print IDs"** or use Print button on any student card
6. To edit a student → go to View Students → click ✏️ Edit button
7. To delete a student → click 🗑️ Delete button
8. To export student data as Excel/CSV → click **"Export CSV"**
9. To download all photos as ZIP → go to View Students → click **"Download ZIP"**

### Printing ID Cards
1. Go to **View Students**
2. Select students using checkboxes → click **"Print Selected"**
   — OR —
   Click 🖨️ Print on any single student card
3. Print page will open → click **"Print"** button
4. To save as PDF → click **"Save as PDF"** or press Ctrl+P → select "Save as PDF"

---

## How the System Works

### Login & Roles
- Both admin and schools use the same `login.html`
- After login, the system checks the user's role and redirects automatically:
  - `admin` → `admin-panel.html`
  - `school` → `dashboard.html`

### Adding a School (from Admin Panel)
1. Admin Panel → **"Add New School"** button
2. Enter school name, login email, and password
3. Submit — a Firebase account is created for the school
4. Share the email and password with the school

### Data Isolation
- Each school can only see their own students
- Admin can view all schools and all students
- Enforced through Firestore Security Rules

---

## File Structure

```
id-card-pro/
├── login.html              # Common login page (auto-redirects by role)
├── dashboard.html          # School dashboard
├── admin-panel.html        # Admin dashboard (manage schools)
├── id-form.html            # Create ID card
├── students.html           # View and manage students
├── print.html              # Print ID cards
├── register.html           # School self-registration (optional)
├── css/
│   └── style.css           # All styles
├── js/
│   ├── firebase.js         # Firebase initialization
│   ├── auth.js             # Authentication + role management
│   ├── students.js         # Student CRUD operations
│   ├── schools.js          # School management
│   └── utils.js            # Helper functions
├── assets/
│   └── placeholder.png     # Default photo
└── firestore.rules         # Firestore security rules
```

---

## Features

- **Authentication**: Email/password login, role-based redirect, auth guards on all pages
- **Student Management**: Create with photo upload, live ID card preview, search, filter, bulk print, bulk delete
- **ID Card Generation**: Auto-generated unique ID, QR code, print-ready A4 layout (3 cards per row)
- **Admin Panel**: Create/disable/delete school accounts, view student count per school
- **Security**: Data isolation per school, XSS protection, file type and size validation (5MB max)
- **UI/UX**: Responsive, dark/light theme, toast notifications, loading states

## Browser Support
Chrome 90+ · Firefox 88+ · Safari 14+ · Edge 90+

## Notes
- Set strict Firebase rules before going to production
- SSL is provided automatically by Firebase Hosting
- Schedule regular Firestore exports as a backup strategy
