/**
 * Admin Excel Export Styles
 * RK Choice ID Card System
 * 
 * Ye file admin-panel.html mein Excel export ke inline styles ko handle karti hai
 * Ye JavaScript file mein CSS classes banayi gayi hain
 */

window.ExcelStyles = {
  // Table header styles
  getTableHeaderStyle: function(isTotalCol = false) {
    const baseStyle = 'background:#D9D9D9;font-weight:bold;border:1px solid #AAAAAA;padding:6px 10px;text-align:center;font-size:12px;';
    return baseStyle + (isTotalCol ? 'color:#1F3864;' : '');
  },

  // Table cell styles
  getCellStyle: function(isLeftAlign = false, isTotalCol = false) {
    const align = isLeftAlign ? 'left' : 'center';
    const baseStyle = `border:1px solid #DDDDDD;padding:5px 10px;text-align:${align};font-size:12px;`;
    return baseStyle + (isTotalCol ? 'font-weight:bold;color:#1F3864;' : '');
  },

  // Total cell styles
  getTotalCellStyle: function(isLeftAlign = false, isTotalCol = false) {
    const align = isLeftAlign ? 'left' : 'center';
    const baseStyle = `background:#FFF2CC;font-weight:bold;border:1px solid #AAAAAA;padding:6px 10px;text-align:${align};font-size:12px;`;
    return baseStyle + (isTotalCol ? 'color:#1F3864;' : '');
  },

  // Table wrapper styles
  getTableWrapperStyle: function() {
    return 'font-family:Arial,sans-serif;border-collapse:collapse;';
  },

  // Title cell styles
  getTitleCellStyle: function() {
    return 'font-size:14px;font-weight:bold;padding:8px 10px;color:#1F3864;';
  },

  // Spacer cell styles
  getSpacerCellStyle: function() {
    return 'padding:4px;';
  }
};
