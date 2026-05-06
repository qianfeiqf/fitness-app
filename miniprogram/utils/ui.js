/**
 * 通知/对话工具类
 * 使用微信原生 wx.* API，不依赖第三方组件库
 */

/**
 * 显示 Toast 提示
 */
function showToast(options = {}) {
  const {
    message = '',
    icon = 'none',
    duration = 2000
  } = options;

  wx.showToast({
    title: message,
    icon: icon === 'none' ? 'none' : icon === 'check-circle' ? 'success' : icon === 'error' ? 'error' : 'none',
    duration: duration
  });
}

/**
 * 显示成功提示
 */
function showSuccess(message) {
  showToast({ message, icon: 'check-circle' });
}

/**
 * 显示失败提示
 */
function showError(message) {
  showToast({ message, icon: 'error' });
}

/**
 * 显示加载中提示
 */
function showLoading(message = '加载中...') {
  wx.showLoading({ title: message, mask: true });
}

/**
 * 隐藏加载提示
 */
function hideLoading() {
  wx.hideLoading();
}

/**
 * 显示 Dialog 对话框
 * @returns {Promise} - { confirm: bool, cancel: bool }
 */
function showDialog(options = {}) {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title: options.title || '提示',
      content: options.content || '',
      confirmText: options.confirmText || '确定',
      cancelText: options.cancelText || '取消',
      confirmColor: options.confirmColor || '#1A1A1A',
      success: (res) => {
        if (res.confirm) {
          resolve({ confirm: true, cancel: false });
        } else {
          resolve({ confirm: false, cancel: true });
        }
      },
      fail: reject
    });
  });
}

/**
 * 显示确认对话框
 */
function showConfirm(title, content) {
  return showDialog({ title, content });
}

/**
 * 显示删除确认对话框
 */
function showDeleteConfirm() {
  return showDialog({
    title: '确认删除',
    content: '删除后无法恢复，确定要删除吗？',
    confirmText: '删除',
    confirmColor: '#8B0000'
  });
}

/**
 * 震动反馈
 */
function vibrate() {
  wx.vibrateShort({ type: 'heavy' });
}

function vibrateSuccess() {
  wx.vibrateShort({ type: 'medium' });
}

function vibrateWarning() {
  wx.vibrateShort({ type: 'light' });
}

/**
 * 音效控制
 */
function isSoundEnabled() {
  const audio = require('./audio.js');
  return audio.getSoundEnabled();
}

function setSoundEnabled(enabled) {
  const audio = require('./audio.js');
  audio.setSoundEnabled(enabled);
}

module.exports = {
  showToast,
  showSuccess,
  showError,
  showLoading,
  hideLoading,
  showDialog,
  showConfirm,
  showDeleteConfirm,
  vibrate,
  vibrateSuccess,
  vibrateWarning,
  isSoundEnabled,
  setSoundEnabled
};
