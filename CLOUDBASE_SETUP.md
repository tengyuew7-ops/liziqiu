# 美食选择后台配置（CloudBase PostgreSQL）

线上页面通过 CloudBase 静态托管桥接页写入 PostgreSQL：

```text
GitHub Pages
  └─ postMessage → CloudBase 静态托管 /liziqiu-bridge/
                       └─ CloudBase Web SDK → food_choices
```

这样，调用 CloudBase 数据接口的是 CloudBase 自己的静态托管页面，不需要把 GitHub Pages 域名加入付费 CORS 白名单。桥接页仍会严格检查消息来源，只接受 `https://tengyuew7-ops.github.io`。

## 1. 创建表和权限

在“SQL 型数据库 → SQL 编辑器”中执行 [`cloudbase-schema.sql`](./cloudbase-schema.sql)。脚本可以重复执行，不会删除已有记录，也不会因表、索引或策略已经存在而失败。脚本会完成：

- 创建 `public.food_choices` 表；
- 限制可以提交的 12 组 `food_id` 和美食名称；
- 开启 PostgreSQL RLS；
- 仅授予浏览器 `anon` 角色新增权限；
- 不授予网页查询、修改或删除权限。

如果旧版脚本提示 `relation "food_choices" already exists (SQLSTATE 42P07)`，说明表已经在第一次执行时创建成功。无需删除表，改用当前脚本即可。

CloudBase SQL 编辑器有时会把 `anon`、`authenticated`、`service_role` 误判为 Supabase 专用角色。它们也是 CloudBase PostgreSQL 使用的内置角色。可以先执行以下只读查询确认当前环境中的角色：

```sql
select rolname, rolcanlogin, rolbypassrls
from pg_roles
order by rolname;
```

当前环境已确认包含这三个角色。

## 2. Publishable Key

桥接页 [`cloudbase-bridge/index.html`](./cloudbase-bridge/index.html) 中的 `CLOUD_CONFIG.accessKey` 使用 **Publishable Key（客户端密钥）**。它对应 PostgreSQL 的 `anon` 客户端角色；RLS 只允许该角色新增格式正确的选择记录。

Publishable Key 本来就是供浏览器使用的公开客户端标识。腾讯云 `SecretId`、`SecretKey`、管理员 API Key 和数据库密码绝不能放入桥接页或 GitHub 仓库。

以后轮换 Publishable Key 时，只更新桥接页中的 `CLOUD_CONFIG.accessKey`，不要放回主站 `config.js`。

## 3. 部署桥接页到 CloudBase 静态托管

在 CloudBase 控制台进入“静态网站托管”，创建远端目录 `liziqiu-bridge`，把本仓库的 `cloudbase-bridge/index.html` 上传到该目录。部署后确认下面的地址可以打开：

```text
https://lzq0914-d7gfrsujmf7f25a7b-1494052100.tcloudbaseapp.com/liziqiu-bridge/
```

桥接页必须部署在这个 CloudBase 静态托管域名下。无需把 `https://tengyuew7-ops.github.io` 加入 CloudBase 的付费 CORS 白名单。

建议先部署桥接页，再发布 GitHub Pages 主站，避免主站先指向尚不存在的地址。

## 4. GitHub Pages 配置

主站 [`config.js`](./config.js) 已配置桥接地址，并且不再包含 Publishable Key：

```js
window.LIZIQIU_CONFIG = Object.freeze({
  cloudbaseBridgeUrl: 'https://lzq0914-d7gfrsujmf7f25a7b-1494052100.tcloudbaseapp.com/liziqiu-bridge/',
  cloudbaseEnvId: 'lzq0914-d7gfrsujmf7f25a7b',
  cloudbaseRegion: 'ap-shanghai',
  cloudbaseTable: 'food_choices',
  demoMode: false,
});
```

有桥接地址时，主站创建隐藏 iframe。桥接页只有在 CloudBase SDK 初始化完成后才发送就绪消息；主站会同时核对桥接域名和 iframe 窗口，8 秒内没有收到有效就绪消息就移除失效 iframe。随后主站通过 `postMessage` 提交记录，并在保存请求 10 秒无响应时显示重试提示。保存响应同样必须来自对应域名、iframe 和请求编号。

为兼容旧部署，只有在没有配置 `cloudbaseBridgeUrl` 时，主站才会尝试原有的 CloudBase SDK 直连方式；直连还需要调用方自行提供 `cloudbaseAccessKey`。当前线上配置始终使用桥接页。

## 5. 桥接页校验

桥接页在写入前检查：

- 消息来源必须精确等于 `https://tengyuew7-ops.github.io`，并且发送窗口必须是直接父页面；
- 消息类型、请求编号和记录字段必须完整且不能包含额外字段；
- `food_id` 与美食名称必须是页面内置的 12 组配对之一；
- 昵称、匿名访客编号、请求编号、客户端时间、来源和页面版本都必须符合长度与格式要求；
- 响应只发回允许的 GitHub Pages 来源。

数据库的约束与 RLS 是第二层校验。即使有人直接打开桥接地址，也无法读取、修改或删除记录。

## 6. 查看选择记录

在 CloudBase 控制台进入“SQL 型数据库 → 数据编辑器 → `food_choices`”，可以看到：

- `food`：选择的美食；
- `nickname`：访客填写的昵称；
- `created_at`：数据库服务器收到记录的时间；
- `client_time`：访客设备时间；
- `visitor_id`：这台设备的匿名编号；
- `request_id`：本次提交编号。

本地预览、`localhost` 和带 `?demo=1` 的页面继续使用演示模式，记录只保存在浏览器 `localStorage`，不会加载桥接页或写入 CloudBase。
