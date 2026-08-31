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

## 容器化（Docker）

多阶段构建：`node:22-alpine` 构建 → `nginx:stable-alpine` 托管。dev 时 vite proxy 转发的 `/api`、`/guyuzhoudb` 在生产由 nginx 反代到后端（handicap-service :8080），后端地址运行时通过 `API_UPSTREAM` 注入，一镜像多环境：

```bash
# 构建（弱网换源：--build-arg NODE_IMAGE=docker.m.daocloud.io/library/node:22-alpine
#       NGINX_IMAGE=docker.m.daocloud.io/library/nginx:stable-alpine）
docker build -t goproject-web .

# 后端为 GoProject 仓库的 docker compose 全栈（docker compose up -d，server 容器名
# handicap-server，不映射宿主机端口）——本容器加入其网络直连：
docker run -d -p 80:80 --name goproject-web --network goproject_default \
  --restart unless-stopped goproject-web

# 后端在其它地址：-e API_UPSTREAM=http://<backend-host>:8080
# （API_UPSTREAM 是静态地址，nginx 启动时解析——先起后端再起本容器；
#   顺序颠倒时 --restart 会反复拉起重试直到解析成功）
```
