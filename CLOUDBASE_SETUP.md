# 美食选择后台配置

页面使用腾讯云 CloudBase 保存美食选择。完成配置后，访客只能新增一条选择记录，不能从网页读取、修改或删除记录；站点主人可以在 CloudBase 控制台查看全部记录。

## 1. 创建环境

1. 打开 [腾讯云 CloudBase 控制台](https://tcb.cloud.tencent.com/dev)。
2. 创建一个云开发环境，地域建议选择上海。
3. 记下完整的环境 ID 和环境地域。

## 2. 创建数据库集合

在“文档型数据库 → 集合管理”中新建集合：

```text
food_choices
```

进入该集合的“权限管理”，切换为自定义安全规则并填写：

```json
{
  "read": false,
  "create": "auth != null",
  "update": false,
  "delete": false
}
```

## 3. 开启浏览器匿名登录

1. 进入“身份认证 → 登录方式”。
2. 开启“匿名登录”。
3. 在 Web 安全域名中加入：`https://tengyuew7-ops.github.io`。

## 4. 创建 Publishable Key

在环境的 API Key 配置中创建 **Publishable Key（客户端密钥）**。Publishable Key 设计用于网页端公开使用，不要创建或复制管理员 API Key。

## 5. 填写网页配置

编辑 `config.js`：

```js
window.LIZIQIU_CONFIG = Object.freeze({
  cloudbaseEnvId: '你的完整环境 ID',
  cloudbaseRegion: 'ap-shanghai',
  cloudbaseAccessKey: '你的 Publishable Key',
  cloudbaseCollection: 'food_choices',
  demoMode: false,
});
```

严禁把腾讯云 `SecretId`、`SecretKey`、管理员 API Key 或其他服务端密钥放进 GitHub 仓库。

## 6. 查看选择记录

发布页面后，在 CloudBase 控制台进入“文档型数据库 → `food_choices`”即可看到：

- `food`：选择的美食
- `nickname`：访客填写的昵称
- `createdAt`：CloudBase 服务器记录的时间
- `clientTime`：访客设备时间
- `visitorId`：这台设备的匿名编号
- `requestId`：本次提交编号

本地预览时，页面会自动使用演示模式并把记录保存在浏览器的 `localStorage`，不会写入 CloudBase。
