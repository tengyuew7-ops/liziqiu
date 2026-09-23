# 美食选择后台配置（CloudBase PostgreSQL）

线上页面通过 CloudBase HTTP 网关调用普通云函数，由云函数写入 PostgreSQL：

```text
GitHub Pages
  └─ HTTPS POST → CloudBase HTTP 网关 /liziqiu-choice
                       └─ 普通云函数 liziqiu-choice-submit
                            └─ PostgreSQL public.food_choices
```

浏览器不包含 Publishable Key、API Key、数据库密码或腾讯云密钥。普通云函数使用 `@cloudbase/node-sdk` 3.18.3；`tcb.init({})` 自动选择当前函数环境，并读取平台注入的临时服务端凭据。

## 1. 创建表并收紧权限

在“SQL 型数据库 → SQL 编辑器”中执行 [`cloudbase-schema.sql`](./cloudbase-schema.sql)。脚本可以重复执行，不会删除已有记录，也不会因表、索引或策略已存在而失败。它会：

- 创建 `public.food_choices` 表和时间索引；
- 限制可提交的 12 组 `food_id` 和美食名称；
- 启用 RLS；
- 撤销 `anon` 和 `authenticated` 的表、序列权限；
- 只允许服务端 `service_role` 写入。

旧版脚本如果提示 `relation "food_choices" already exists (SQLSTATE 42P07)`，说明表已创建成功。无需删表，直接执行当前脚本即可。

## 2. 部署普通云函数

函数代码位于 [`cloudbase-function`](./cloudbase-function/)，入口为 `index.main`。

1. 在 CloudBase 进入“云函数 / 托管 → 函数管理 → 创建云函数”。
2. 选择“通过代码包创建”和“普通云函数”。
3. 函数名填写 `liziqiu-choice-submit`，运行环境选择 Node.js 20，执行方法使用 `index.main`。
4. 上传代码包，开启“自动安装依赖”。

函数仅接受来自 `https://tengyuew7-ops.github.io` 的 `POST` 与 CORS 预检，并在写入前再次校验全部 8 个字段和 12 组美食映射。

这里必须使用“普通云函数”，不要改成 Web/HTTP 云函数。普通云函数会注入服务端凭据，让 `@cloudbase/node-sdk` 以服务端角色写入；HTTP 网关只负责把公开路由转发给该普通云函数。

## 3. 创建 HTTP 网关路由

在“HTTP 网关 → 域名及路由”中为默认域名新增路由：

| 项目 | 值 |
| --- | --- |
| 访问路径 | `/liziqiu-choice` |
| 关联资源 | 云函数 `liziqiu-choice-submit` |
| 路径透传 | 关闭 |
| 身份认证 | 关闭 |
| 网关跨域校验 | 关闭 |

这里关闭的是网关内置跨域白名单。云函数自己精确校验 `Origin`、处理 `OPTIONS`，并只向 GitHub Pages 返回 CORS 响应头。

当前公开接口为：

```text
https://lzq0914-d7gfrsujmf7f25a7b-1494052100.ap-shanghai.app.tcloudbase.com/liziqiu-choice
```

GitHub Pages 的 `fetch` 是非导航请求，不会出现 CloudBase 默认域名的“风险提醒”中间页。

## 4. GitHub Pages 配置

[`config.js`](./config.js) 只保存公开 API 地址：

```js
window.LIZIQIU_CONFIG = Object.freeze({
  cloudbaseApiUrl: 'https://lzq0914-d7gfrsujmf7f25a7b-1494052100.ap-shanghai.app.tcloudbase.com/liziqiu-choice',
  demoMode: false,
});
```

页面提交 JSON 时设置 12 秒超时，只有收到 HTTP 2xx 和 `{ "ok": true }` 才显示保存成功。

## 5. 查看选择记录

在 CloudBase 控制台进入“SQL 型数据库 → 数据编辑器 → `food_choices`”，可以看到：

- `food`：选择的美食；
- `nickname`：访客填写的昵称；
- `created_at`：数据库服务器收到记录的时间；
- `client_time`：访客设备时间；
- `visitor_id`：这台设备的匿名编号；
- `request_id`：本次提交编号。

本地预览、`localhost` 和带 `?demo=1` 的页面使用演示模式，记录只保存在浏览器 `localStorage`，不调用 CloudBase。

## 6. 旧桥接页

旧的 CloudBase 静态托管 iframe 桥接方案已停用。默认静态域名的导航请求会先显示腾讯云风险提醒，因此不适合隐藏 iframe。完成云函数切换后，可从静态托管删除 `/liziqiu-bridge/`。
