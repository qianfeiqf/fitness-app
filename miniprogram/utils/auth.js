/**
 * 实质操作按需登录拦截工具
 * 未登录用户可自由浏览与预览；触发写入/创建/开练等实质操作时弹出登录抽屉，登录成功后自动继续原操作。
 */

function requireLogin(page, desc, action) {
  const app = getApp();
  if (app && app.globalData && app.globalData.isLoggedIn) {
    if (typeof action === 'function') action();
    return true;
  }
  if (!page) return false;
  page._pendingLoginAction = typeof action === 'function' ? action : null;
  page.setData({
    loginSheet: {
      visible: true,
      desc: desc || '登录后自动云端同步，换机不丢训练记录'
    }
  });
  return false;
}

function handleLoginSuccess(page, onAfterLogin) {
  if (!page) return;
  const pending = page._pendingLoginAction;
  page._pendingLoginAction = null;
  page.setData({ 'loginSheet.visible': false });
  if (typeof onAfterLogin === 'function') {
    onAfterLogin();
  }
  if (typeof pending === 'function') {
    setTimeout(() => {
      pending();
    }, 260);
  }
}

function handleLoginClose(page) {
  if (!page) return;
  page._pendingLoginAction = null;
  page.setData({ 'loginSheet.visible': false });
}

module.exports = {
  requireLogin,
  handleLoginSuccess,
  handleLoginClose
};
