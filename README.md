# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## 容器化（Docker）与版本化发版

多阶段构建：`node:22-alpine` 构建 → `nginx:stable-alpine` 托管。dev 时 vite proxy 转发的 `/api`、`/guyuzhoudb` 在生产由 nginx 反代到后端（handicap-service :8080），后端地址运行时通过 `API_UPSTREAM` 注入，一镜像多环境。

发版统一走 `deploy.sh`——镜像按版本 tag 命名、旧版本保留可回滚、部署失败自动回退：

```bash
./deploy.sh deploy            # 发版：构建 v日期-时分秒-git短hash 镜像 → 切换容器 → 健康门禁(60s) → 失败自动回滚上一版
./deploy.sh deploy v1.2.0     # 手动指定语义版本号（缺省自动生成）
./deploy.sh rollback prev     # 回滚上一版（rollback <tag> 回任意历史版；不带参数 = 列出版本）
./deploy.sh list              # 版本列表（标注当前运行）
./deploy.sh prune [-n]        # 清理旧版本（保留最近 KEEP 个，默认 5；-n 只看清单不删）
```

| 环境变量 | 作用 | 缺省 |
|---|---|---|
| `API_UPSTREAM` | 后端地址（注入容器 `-e`） | 镜像内 `http://handicap-server:8080` |
| `NODE_IMAGE` / `NGINX_IMAGE` / `NPM_REGISTRY` | 弱网换源（build-arg 透传，如 `docker.m.daocloud.io/library/node:22-alpine`） | Dockerfile 默认 |
| `KEEP` | prune 保留版本数 | 5 |
| `CHECK=1` | 构建前先跑 `npm run typecheck`（弱网下 docker build 前快速失败） | 关 |

约定与行为：

- 容器始终运行**具体版本 tag**，`latest` 只是当前运行版本的指针别名（deploy/rollback 成功后自动重指）
- build 失败直接退出、旧容器毫发无损；新版本健康检查不过则自动切回上一版
- 脏工作区发版会标记 `-dirty` 并警告（无法精确对应到一次提交）；正常流程是先提交再发版
- 版本号打进镜像（`IMAGE_TAG` env），tag 被 prune 清掉后 `docker inspect` 仍可溯源
- 前提：后端 GoProject 仓库的 compose 已起——本容器加入其 `goproject_default` 网络直连 `handicap-server`；nginx 静态 `proxy_pass` 启动时解析容器名，先起后端再发前端，顺序颠倒靠 `--restart unless-stopped` 自愈

回滚演练：

```bash
./deploy.sh deploy            # 新版本上线（如 v20260831-161638-11b2d67）
./deploy.sh rollback prev     # 发现问题，立即退回上一版
```
