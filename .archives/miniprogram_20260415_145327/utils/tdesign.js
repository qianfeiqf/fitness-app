/**
 * TDesign 组件工具类
 * 封装常用的 TDesign 组件调用
 */

let toastIndex = 0;

/**
 * 显示 Toast 提示
 * @param {Object} options - 配置项
 * @param {string} options.message - 提示文本
 * @param {string} options.icon - 图标类型：success, fail, loading, etc.
 * @param {number} options.duration - 显示时长（毫秒）
 * @param {Object} options.context - 页面上下文（this）
 */
function showToast(options = {}) {
  const {
    message = '',
    icon = 'none',
    duration = 2000,
    context = null
  } = options;

  // 使用 TDesign Toast
  const Toast = require('tdesign-miniprogram/toast/index');

  // 生成唯一的 selector
  const selector = `#t-toast-${++toastIndex}`;

  Toast({
    context: context || getCurrentPage(),
    selector: selector,
    message: message,
    icon: icon === 'none' ? undefined : icon,
    icon: icon,
    duration: duration
  });
}

/**
 * 显示成功提示
 */
function showSuccess(message, context) {
  showToast({
    message,
    icon: 'check-circle',
    context
  });
}

/**
 * 显示失败提示
 */
function showError(message, context) {
  showToast({
    message,
    icon: 'error',
    context
  });
}

/**
 * 显示加载中提示
 */
function showLoading(message = '加载中...', context) {
  const Toast = require('tdesign-miniprogram/toast/index');

  Toast({
    context: context || getCurrentPage(),
    selector: '#t-toast-loading',
    message,
    loading: true
  });
}

/**
 * 隐藏加载提示
 */
function hideLoading() {
  const Toast = require('tdesign-miniprogram/toast/index');

  Toast({
    context: getCurrentPage(),
    selector: '#t-toast-loading',
    visible: false
  });
}

/**
 * 显示 Dialog 对话框
 * @param {Object} options - 配置项
 * @param {string} options.title - 标题
 * @param {string} options.content - 内容
 * @param {string} options.confirmText - 确认按钮文本
 * @param {string} options.cancelText - 取消按钮文本
 * @param {string} options.confirmColor - 确认按钮颜色
 * @returns {Promise} - 用户操作 Promise
 */
function showDialog(options = {}) {
  return new Promise((resolve, reject) => {
    const Dialog = require('tdesign-miniprogram/dialog/index');

    const {
      title = '提示',
      content = '',
      confirmText = '确定',
      cancelText = '取消',
      confirmColor = '#e63946'
    } = options;

    Dialog({
      context: getCurrentPage(),
      selector: '#t-dialog',
      title,
      content,
      confirmBtn: confirmText,
      cancelBtn: cancelText,
      confirmColor,
      zIndex: 10000
    }).then(res => {
      if (res.confirm) {
        resolve({ confirm: true, cancel: false });
      } else {
        resolve({ confirm: false, cancel: true });
      }
    }).catch(err => {
      reject(err);
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
    confirmColor: '#e74c3c'
  });
}

/**
 * 获取当前页面实例
 */
function getCurrentPage() {
  const pages = getCurrentPages();
  return pages[pages.length - 1];
}

/**
 * 震动反馈（配合训练动作）
 */
function vibrate() {
  wx.vibrateShort({
    type: 'heavy'
  });
}

/**
 * 成功震动反馈（组完成）
 */
function vibrateSuccess() {
  wx.vibrateShort({
    type: 'medium'
  });
}

/**
 * 警告震动反馈
 */
function vibrateWarning() {
  wx.vibrateShort({
    type: 'light'
  });
}

/**
 * 获取音效开关状态
 */
function isSoundEnabled() {
  const audio = require('./audio.js');
  return audio.getSoundEnabled();
}

/**
 * 设置音效开关
 */
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
