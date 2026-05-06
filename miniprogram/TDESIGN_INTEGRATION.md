# TDesign 组件库集成指南

本项目已配置 TDesign 微信小程序组件库。以下是集成说明。

## 安装步骤

1. 在微信开发者工具中打开 `fitness-app/miniprogram` 目录
2. 打开终端，执行：
   ```bash
   npm install tdesign-miniprogram --save
   ```
3. 在微信开发者工具中：`工具 -> 构建 npm`
4. 确保勾选「ES6 转 ES5」和「样式补全」

## 已完成的配置

- [x] `app.json` - 已移除 `style: "v2"` 避免样式冲突，已启用 `darkmode: true`
- [x] `project.config.json` - 已添加 `packNpmManually` 配置
- [x] `package.json` - 已创建并添加 tdesign-miniprogram 依赖

## 推荐的健身App组件

| 组件 | 用途 | 导入路径 |
|------|------|----------|
| Button | 主按钮、训练开始按钮 | `tdesign-miniprogram/button/button` |
| Dialog | 确认对话框、删除确认 | `tdesign-miniprogram/dialog/dialog` |
| Toast | 操作反馈、成功/失败提示 | `tdesign-miniprogram/toast/toast` |
| Loading | 加载状态 | `tdesign-miniprogram/loading/loading` |
| Steps | 训练步骤指示器 | `tdesign-miniprogram/steps/steps` |
| TabBar | 底部导航（已有个性化设计，可选） | `tdesign-miniprogram/tab-bar/tab-bar` |
| Input | 重量/次数输入 | `tdesign-miniprogram/input/input` |
| Stepper | 组数/次数选择 | `tdesign-miniprogram/stepper/stepper` |
| Slider | 重量选择滑块 | `tdesign-miniprogram/slider/slider` |
| Progress | 训练进度条 | `tdesign-miniprogram/progress/progress` |
| CountDown | 休息倒计时 | `tdesign-miniprogram/count-down/count-down` |
| Badge | PR徽章、新计划徽章 | `tdesign-miniprogram/badge/badge` |
| Tag | 难度标签、状态标签 | `tdesign-miniprogram/tag/tag` |
| Empty | 无数据空状态 | `tdesign-miniprogram/empty/empty` |
| PullDownRefresh | 下拉刷新训练记录 | `tdesign-miniprogram/pull-down-refresh/pull-down-refresh` |
| SwipeCell | 左滑删除训练记录 | `tdesign-miniprogram/swipe-cell/swipe-cell` |

## 使用示例

### 按钮组件

在页面的 `.json` 文件中注册：
```json
{
  "usingComponents": {
    "t-button": "tdesign-miniprogram/button/button"
  }
}
```

在 `.wxml` 中使用：
```html
<!-- 开始训练按钮 -->
<t-button theme="primary" size="large" block bind:tap="onStartTraining">
  开始训练
</t-button>

<!-- 辅助按钮 -->
<t-button theme="light" size="large" block>查看详情</t-button>

<!-- 危险操作 -->
<t-button theme="danger" size="large" block>删除计划</t-button>
```

### Toast 提示

```javascript
import Toast from 'tdesign-miniprogram/toast/index';

// 成功提示
Toast({
  context: this,
  message: '训练记录已保存',
  icon: 'check-circle',
});

// 失败提示
Toast({
  context: this,
  message: '同步失败，请重试',
  icon: 'error',
});

// 加载中
Toast({
  context: this,
  message: '加载中...',
  loading: true,
});
```

### Dialog 对话框

```json
{
  "usingComponents": {
    "t-dialog": "tdesign-miniprogram/dialog/dialog"
  }
}
```

```html
<t-dialog
  visible="{{showDeleteConfirm}}"
  title="确认删除"
  content="删除后无法恢复，确定要删除这个计划吗？"
  confirm-btn="删除"
  cancel-btn="取消"
  bind:confirm="onConfirmDelete"
  bind:cancel="onCancelDelete"
/>
```

### 倒计时组件

```json
{
  "usingComponents": {
    "t-count-down": "tdesign-miniprogram/count-down/count-down"
  }
}
```

```html
<t-count-down
  time="{{restTime}}"
  format="mm:ss"
  bind:finish="onCountDownFinish"
  auto-size
/>
```

### 进度条组件

```html
<t-progress
  percentage="{{progress}}"
  color="#e63946"
  stroke-width="12rpx"
  show-label
/>
```

### 步进器（组数/重量选择）

```json
{
  "usingComponents": {
    "t-stepper": "tdesign-miniprogram/stepper/stepper"
  }
}
```

```html
<t-stepper
  value="{{weight}}"
  min="0"
  max="300"
  step="2.5"
  bind:change="onWeightChange"
/>
```

## 主题定制

TDesign 支持 CSS 变量定制主题，可覆盖默认样式：

在 `app.wxss` 中添加：
```css
page {
  /* 主色调 - 健身主题红色 */
  --td-button-primary-bg-color: #e63946;
  --td-button-primary-border-radius: 44rpx;

  /* 成功色 */
  --td-success-color: #4caf50;

  /* 警告色 */
  --td-warning-color: #ff9800;

  /* 错误/危险色 */
  --td-error-color: #f44336;
}
```

## 暗色模式

TDesign 已启用暗色模式适配：
- 使用 `darkmode: true` 在 `app.json` 中
- 组件会自动适配系统暗色模式
- 可使用 CSS 变量定制暗色主题

## 健身App专属配色建议

```css
page {
  /* 主题色 - 硬核健身红 */
  --td-primary-color: #e63946;

  /* 深色背景（训练页面） */
  --td-bg-color: #1a1a2e;
  --td-bg-color-page: #1a1a2e;
  --td-bg-color-card: #16213e;

  /* 文字颜色 */
  --td-text-color-primary: #ffffff;
  --td-text-color-secondary: #a0a0a0;
}
```

## 注意事项

1. TDesign 需要微信小程序基础库 `2.12.0+`
2. 使用前必须执行「构建 npm」
3. 组件名称以 `t-` 开头（如 `t-button`）
4. 事件绑定使用 `bind:` 而非 `on:`

## 相关资源

- [TDesign 官方文档](https://tdesign.tencent.com/miniprogram/overview)
- [组件示例](https://developers.weixin.qq.com/s/NSVqRNmh8l5a)
