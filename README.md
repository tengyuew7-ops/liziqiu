# Like or Love · 栗子球美食气泡

一个粉色可爱风格的互动网页：输入 8 位口令后观看心形动画，再从 12 个美食气泡中选出今天想吃的东西。线上选择会经 CloudBase 云函数保存到 PostgreSQL，页面维护者可以在 CloudBase 控制台查看结果。

**在线体验：** [https://tengyuew7-ops.github.io/liziqiu/](https://tengyuew7-ops.github.io/liziqiu/)

**体验口令：** `20040914`

> [!IMPORTANT]
> 口令写在前端静态 JavaScript 中，任何查看网页源代码的人都能看到。它只用于开启互动流程，不是登录、身份验证或数据访问控制。

## 体验流程

1. 输入 8 位数字 `20040914`。
2. 播放心形粒子动画和 “like or love” 过渡画面。
3. 展示 12 个美食气泡：火锅、烤肉、日料、麻辣烫、烧烤、披萨、面 / 粉、炸鸡、家常菜、汉堡、甜品和奶茶。
4. 选择一种美食，并可填写不超过 20 个字符的昵称。
5. 确认后，线上页面把选择发送到 CloudBase；本地演示则只保存在当前浏览器中。

## 功能特点

- 手机和桌面端自适应的粉色界面；
- 心形粒子动画，并尊重系统的“减少动态效果”设置；
- 键盘焦点、状态播报和单选语义等基础无障碍支持；
- 12 组固定美食选项，前后端使用同一份允许列表校验；
- 可选昵称和匿名设备编号；
- CloudBase HTTP 网关、普通云函数和 PostgreSQL 服务端写入链路；
- 跨域来源限制、请求体大小限制、严格字段校验和数据库行级安全策略；
- `localhost`、`file:` 和 `?demo=1` 下自动启用本地演示模式。

## 项目结构

```text
.
├─ .github/                       # 协作模板与持续集成
├─ assets/
│  ├─ css/styles.css              # 页面样式与动画
│  └─ js/app.js                   # 口令、气泡交互与选择提交
├─ backend/cloudbase/
│  ├─ function/                   # CloudBase 普通云函数与测试
│  └─ schema.sql                  # PostgreSQL 表、约束、RLS 与权限
├─ docs/
│  ├─ architecture.md             # 系统结构和数据流
│  └─ cloudbase-setup.md          # CloudBase 部署说明
├─ config.js                      # 浏览器端公开 API 地址
├─ index.html                     # GitHub Pages 入口
├─ PRIVACY.md                     # 数据与隐私说明
├─ CONTRIBUTING.md                # 贡献指南
├─ SECURITY.md                    # 安全问题报告方式
└─ LICENSE                        # MIT License
```

## 本地运行

前端没有构建步骤。在仓库根目录启动一个静态文件服务器：

```bash
python -m http.server 4173
```

然后访问 [http://localhost:4173](http://localhost:4173)。本地地址会自动进入演示模式，提交记录保存在浏览器的 `localStorage` 中，不会写入线上数据库。

也可以在 URL 后添加 `?demo=1` 强制启用演示模式。

## 后端测试

需要 Node.js 20 或更高版本：

```bash
npm ci --prefix backend/cloudbase/function
npm test
npm run check
```

测试覆盖请求方法、CORS、请求体格式、字段校验和数据库失败响应。测试不会连接真实数据库；`check` 会检查前端与云函数 JavaScript 的语法。

## 部署

### 前端

仓库根目录是纯静态 GitHub Pages 站点。发布 `main` 分支后，`index.html`、`assets/` 和 `config.js` 即可直接提供页面。

### 后端

线上数据链路如下：

```text
GitHub Pages
  └─ HTTPS POST → CloudBase HTTP 网关
                       └─ 普通云函数
                            └─ PostgreSQL public.food_choices
```

完整步骤见 [CloudBase 部署说明](docs/cloudbase-setup.md)，组件边界见 [架构说明](docs/architecture.md)。浏览器端的 [`config.js`](config.js) 只包含公开接口地址，不应放置 API Key、数据库密码或腾讯云密钥。

## 保存的数据

每次确认选择时，应用会提交以下字段：

| 字段 | 用途 |
| --- | --- |
| `food_id` / `food` | 所选美食的固定编号和名称 |
| `nickname` | 用户自愿填写的昵称，可为空 |
| `visitor_id` | 保存在浏览器中的匿名设备编号 |
| `request_id` | 本次提交的随机编号，用于去重和排查 |
| `client_time` | 用户设备生成的提交时间 |
| `source` | 固定为 `github-pages` |
| `page_version` | 当前页面数据格式版本 `2.0` |

数据库另行生成 `id` 和服务端 `created_at`。详细说明及删除数据的处理方式见 [PRIVACY.md](PRIVACY.md)。

## 安全说明

- 前端口令是公开的互动彩蛋，不保护后台、数据库或个人信息。
- 浏览器不持有 CloudBase API Key。数据库写入由普通云函数使用服务端注入的 `service_role` 凭据完成。
- 云函数只接受规定字段和 12 组固定美食映射，数据库再通过约束与 RLS 进行校验和授权。
- 请不要在 Issue、日志、截图或提交记录中公开真实密钥或个人敏感信息。

安全问题请按 [SECURITY.md](SECURITY.md) 中的方式报告。

## 参与贡献

欢迎提交缺陷修复、界面改进和文档更新。开始前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

本项目采用 [MIT License](LICENSE)。

维护者：[tengyuew7-ops](https://github.com/tengyuew7-ops)
