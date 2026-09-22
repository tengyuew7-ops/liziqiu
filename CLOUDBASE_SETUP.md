# 美食选择后台配置（CloudBase PostgreSQL）

这个 CloudBase 环境使用 PostgreSQL。页面通过 Web SDK 的 `app.rdb()` 写入 `food_choices` 表；访客只能新增记录，不能从网页读取、修改或删除记录。站点主人可以在 CloudBase 控制台查看全部数据。

## 1. 创建表和权限

在“SQL 型数据库 → SQL 编辑器”中执行 [`cloudbase-schema.sql`](./cloudbase-schema.sql)。脚本可以重复执行，不会删除已有记录，也不会因表、索引或策略已经存在而失败。脚本会完成：

- 创建 `public.food_choices` 表；
- 限制可以提交的 12 种美食；
- 开启 PostgreSQL RLS；
- 仅授予浏览器 `anon` 角色新增权限；
- 不授予网页查询、修改或删除权限。

如果旧版脚本提示 `relation "food_choices" already exists (SQLSTATE 42P07)`，说明表已经在第一次执行时创建成功。无需删除表，改用当前脚本即可。

CloudBase SQL 编辑器有时会把 `anon`、`authenticated`、`service_role` 误判为 Supabase 专用角色。它们也是 CloudBase PostgreSQL 官方使用的内置角色。可以先执行以下只读查询确认当前环境中的角色：

```sql
select rolname, rolcanlogin, rolbypassrls
from pg_roles
order by rolname;
```

当前环境已确认包含这三个角色。

## 2. 配置 Web 安全域名

在环境安全配置中加入：

```text
https://tengyuew7-ops.github.io
```

## 3. 创建 Publishable Key

在环境的 API Key 配置中创建 **Publishable Key（客户端密钥）**。Publishable Key 可以用于网页端公开初始化 SDK。

严禁把腾讯云 `SecretId`、`SecretKey`、管理员 API Key 或数据库密码放进 GitHub 仓库。

Publishable Key 对应 PostgreSQL 的 `anon` 客户端角色。RLS 只允许这个角色向指定表新增格式正确的选择记录，不能读取、修改或删除记录。

## 4. 填写网页配置

环境 ID 已写入 `config.js`，还需填写 Publishable Key：

```js
window.LIZIQIU_CONFIG = Object.freeze({
  cloudbaseEnvId: 'lzq0914-d7gfrsujmf7f25a7b',
  cloudbaseRegion: 'ap-shanghai',
  cloudbaseAccessKey: '你的 Publishable Key',
  cloudbaseTable: 'food_choices',
  demoMode: false,
});
```

## 5. 查看选择记录

在 CloudBase 控制台进入“SQL 型数据库 → 数据编辑器 → `food_choices`”，可以看到：

- `food`：选择的美食；
- `nickname`：访客填写的昵称；
- `created_at`：数据库服务器收到记录的时间；
- `client_time`：访客设备时间；
- `visitor_id`：这台设备的匿名编号；
- `request_id`：本次提交编号。

本地预览时，页面自动使用演示模式并把记录保存在浏览器 `localStorage`，不会写入 CloudBase。
