# CloudBase 迁移指南

本项目当前使用**微信云托管**（Cloud Hosting）作为后端服务。如果未来需要迁移到 **CloudBase**（云开发），请按以下步骤操作。

## 当前架构 vs CloudBase

| 组件 | 当前（云托管） | CloudBase 方案 |
|------|---------------|----------------|
| 后端 | 微信云托管容器 | 云函数 |
| 数据库 | MySQL | 文档数据库 |
| 认证 | 自定义 token | 自动 openid |
| API | REST API | wx.cloud.* |

## 迁移步骤

### 1. 创建 CloudBase 环境

1. 登录 [腾讯云 CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 创建新环境
3. 获取环境 ID（例如：`cloudbase-1a2b3c`）

### 2. 配置集合权限

在 CloudBase 控制台，创建以下集合并设置权限：

```
plans（训练计划）
- 权限：所有用户可读，创建者可写
- 规则：read: true, write: doc._openid == auth.openid

sessions（训练记录）
- 权限：所有用户可读，创建者可写

exercises（动作库，预置数据）
- 权限：所有用户可读，不可写（系统预置）
```

### 3. 修改 app.js

```javascript
// app.js
onLaunch() {
  // 初始化 CloudBase
  wx.cloud.init({
    env: 'your-env-id',  // 替换为你的环境 ID
    traceUser: true
  });

  // 初始化本地数据库
  this.initLocalDatabase();
}
```

### 4. 替换数据库操作

将 `localdb/db.js` 中的操作替换为 `services/cloudbase.js`：

```javascript
// 旧代码
const { findOne, update } = require('../localdb/db.js');
const record = findOne('plans', { id: planId });

// 新代码
const cloudDB = require('../services/cloudbase.js');
const record = await cloudDB.findOne('plans', { id: planId });
```

### 5. 创建云函数获取 openid

在 CloudBase 控制台创建云函数 `getOpenid`：

```javascript
// 云函数入口
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  return { openid: OPENID };
};
```

### 6. 迁移现有数据

使用数据迁移工具将 MySQL 数据导出为 JSON，然后导入到 CloudBase 文档数据库。

## 关键优势

使用 CloudBase 后的优势：

1. **自动身份认证**：openid 自动注入，无需手动管理
2. **实时数据库**：支持实时数据订阅
3. **更简单的架构**：无需自建 REST API
4. **更好的离线支持**：SDK 内置离线缓存

## 相关资源

- [CloudBase 文档](https://docs.cloudbase.net/)
- [微信小程序 SDK](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [Mini Program CloudBase 集成指南](../.claude/skills/cloudbase/references/miniprogram-development/SKILL.md)
