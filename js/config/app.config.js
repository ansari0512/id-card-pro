/**
 * Application Configuration
 * Centralized configuration for the ID Card System
 */

export const APP_CONFIG = {
  name: 'RK Choice ID Card System',
  version: '2.0.0',
  author: 'RK Choice',
  theme: {
    default: 'dark',
    toggle: true
  }
};

export const ROUTES = {
  HOME: 'index.html',
  LOGIN: 'login.html',
  DASHBOARD: 'dashboard.html',
  ID_FORM: 'id-form.html',
  STUDENTS: 'students.html',
  ADMIN_PANEL: 'admin-panel.html',
  ADMIN_STUDENTS: 'admin-students.html',
  PRINT: 'print.html'
};

export const CLASSES = [
  'Nursery', 'LKG', 'UKG', 'KG',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
];

export const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export const STORAGE_KEYS = {
  THEME: 'theme',
  MOCK_STUDENTS: 'mock_students',
  MOCK_SCHOOLS: 'mock_schools',
  MOCK_SESSION: 'mock_session',
  MOCK_SEEDED: 'mock_seeded_v2'
};

export const ID_PREFIX = 'RK';

export const PHOTO_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  defaultPlaceholder: 'assets/placeholder.png'
};
