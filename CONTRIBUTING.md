# 参与贡献

感谢你愿意改进 Like or Love。提交改动前，请先在 Issue 中描述问题或建议，方便确认范围。

## 本地运行

1. 克隆仓库并进入项目目录。
2. 执行 `python -m http.server 4173`。
3. 打开 `http://localhost:4173/`。本地预览会使用浏览器 `localStorage` 保存选择，不会写入线上数据库。

## 检查改动

```bash
npm install --prefix backend/cloudbase/function
npm test
npm run check
```

涉及页面的改动还应在桌面和手机尺寸下检查：8 位入口码、爱心动画、美食气泡、昵称输入、提交结果和键盘操作。

## 提交 Pull Request

- 一个 Pull Request 解决一个明确问题。
- 写清改动原因、测试方法和界面变化。
- 不要提交 API Key、数据库密码、腾讯云密钥或真实访客数据。
- 保持公开接口与数据字段向后兼容；需要变更时同步更新文档和测试。

提交代码即表示你同意按本项目的 MIT License 发布你的贡献。
