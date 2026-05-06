/**
 * 音频工具类
 * 提供音效播放功能，支持开关控制
 */

let beepAudio = null;
let completeAudio = null;

/**
 * 初始化音频上下文
 */
function initAudio() {
  if (!beepAudio) {
    beepAudio = wx.createInnerAudioContext();
    beepAudio.src = '/assets/sounds/beep.wav';
    beepAudio.volume = 0.8;
  }
  if (!completeAudio) {
    completeAudio = wx.createInnerAudioContext();
    completeAudio.src = '/assets/sounds/complete.wav';
    completeAudio.volume = 0.8;
  }
}

/**
 * 检查音效是否启用
 */
function isSoundEnabled() {
  const enabled = wx.getStorageSync('soundEnabled');
  return enabled !== false; // 默认启用
}

/**
 * 启用/禁用音效
 */
function setSoundEnabled(enabled) {
  wx.setStorageSync('soundEnabled', enabled);
}

/**
 * 获取音效开关状态
 */
function getSoundEnabled() {
  return isSoundEnabled();
}

/**
 * 播放倒计时提示音（短促）
 * 用于最后3秒倒计时
 */
function playCountdownBeep() {
  if (!isSoundEnabled()) return;

  try {
    initAudio();
    beepAudio.stop();
    beepAudio.play();
  } catch (e) {
    console.warn('播放倒计时音效失败:', e);
  }
}

/**
 * 播放完成提示音（较长）
 * 用于休息结束
 */
function playCompleteSound() {
  if (!isSoundEnabled()) return;

  try {
    initAudio();
    completeAudio.stop();
    completeAudio.play();
  } catch (e) {
    console.warn('播放完成音效失败:', e);
  }
}

/**
 * 播放PR提示音
 */
function playPRSound() {
  if (!isSoundEnabled()) return;

  try {
    initAudio();
    beepAudio.stop();
    beepAudio.play();
    setTimeout(() => {
      beepAudio.play();
    }, 200);
    setTimeout(() => {
      beepAudio.play();
    }, 400);
  } catch (e) {
    console.warn('播放PR音效失败:', e);
  }
}

/**
 * 销毁音频上下文（页面卸载时调用）
 */
function destroyAudio() {
  if (beepAudio) {
    beepAudio.destroy();
    beepAudio = null;
  }
  if (completeAudio) {
    completeAudio.destroy();
    completeAudio = null;
  }
}

module.exports = {
  isSoundEnabled,
  setSoundEnabled,
  getSoundEnabled,
  playCountdownBeep,
  playCompleteSound,
  playPRSound,
  destroyAudio
};
