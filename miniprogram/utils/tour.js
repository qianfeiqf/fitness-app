/**
 * 页面实战镂空高亮引导调度工具（Coach Marks）
 */

function measureRect(page, selector) {
  return new Promise((resolve) => {
    if (!page || !selector) {
      resolve(null);
      return;
    }
    const query = wx.createSelectorQuery().in(page);
    query.select(selector).boundingClientRect((rect) => {
      if (rect && rect.width > 0 && rect.height > 0) {
        resolve({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      } else {
        resolve(null);
      }
    }).exec();
  });
}

/**
 * 在指定页面启动一组高亮步骤（每步渲染前实时测量坐标，避免切换动画或滚动导致错位）
 * @param {object} page - Page 实例
 * @param {Array} steps - [{ selector, title, desc, radius?, pad?, nextText? }]
 * @param {object} opts - { startOffset, totalCount, lastNextText, onFinish, onSkip }
 */
async function startPageTour(page, steps, opts = {}) {
  if (!page || !Array.isArray(steps) || steps.length === 0) {
    if (opts.onFinish) opts.onFinish();
    return;
  }

  const validSteps = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const rect = await measureRect(page, step.selector);
    if (rect) {
      validSteps.push({
        ...step,
        rect: {
          ...rect,
          radius: step.radius !== undefined ? step.radius : 14,
          pad: step.pad !== undefined ? step.pad : 6
        }
      });
    }
  }

  if (validSteps.length === 0) {
    if (opts.onFinish) opts.onFinish();
    return;
  }

  page._coachTourRunner = {
    steps: validSteps,
    index: 0,
    startOffset: opts.startOffset || 0,
    totalCount: opts.totalCount || validSteps.length,
    lastNextText: opts.lastNextText || '知道了',
    onFinish: opts.onFinish || null,
    onSkip: opts.onSkip || null
  };

  _renderCurrentStep(page);
}

async function _renderCurrentStep(page) {
  const runner = page._coachTourRunner;
  if (!runner) return;
  const step = runner.steps[runner.index];
  // 实时重测一次当前步骤目标位置，避免前一步状态变化导致坐标偏移
  const freshRect = await measureRect(page, step.selector);
  if (page._coachTourRunner !== runner) return;
  const rect = freshRect
    ? {
        ...freshRect,
        radius: step.radius !== undefined ? step.radius : 14,
        pad: step.pad !== undefined ? step.pad : 6
      }
    : step.rect;

  const isStepLast = runner.index === runner.steps.length - 1;
  const globalIdx = runner.startOffset + runner.index + 1;
  const globalTotal = Math.max(runner.totalCount, runner.startOffset + runner.steps.length);

  page.setData({
    coachTour: {
      visible: true,
      rect,
      title: step.title,
      desc: step.desc,
      stepText: `${globalIdx} / ${globalTotal}`,
      nextText: step.nextText || (isStepLast ? runner.lastNextText : '下一步'),
      isLast: isStepLast && globalIdx >= globalTotal
    }
  });
}

function advancePageTour(page) {
  const runner = page._coachTourRunner;
  if (!runner) {
    page.setData({ 'coachTour.visible': false });
    return;
  }
  if (runner.index + 1 < runner.steps.length) {
    runner.index += 1;
    _renderCurrentStep(page);
    return;
  }
  const onFinish = runner.onFinish;
  page._coachTourRunner = null;
  page.setData({ 'coachTour.visible': false });
  if (typeof onFinish === 'function') onFinish();
}

function skipPageTour(page) {
  const runner = page._coachTourRunner;
  const onSkip = runner ? runner.onSkip : null;
  page._coachTourRunner = null;
  page.setData({ 'coachTour.visible': false });
  const app = getApp();
  if (app && app.globalData) {
    app.globalData.fullTourStage = null;
  }
  if (typeof onSkip === 'function') onSkip();
}

module.exports = {
  measureRect,
  startPageTour,
  advancePageTour,
  skipPageTour
};
