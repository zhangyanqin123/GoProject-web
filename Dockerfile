# ==================== 构建阶段 ====================
# FROM 中引用的 ARG 必须声明在首个 FROM 之前（全局作用域）
# 弱网换源：--build-arg NODE_IMAGE=docker.m.daocloud.io/library/node:22-alpine
#           --build-arg NGINX_IMAGE=docker.m.daocloud.io/library/nginx:stable-alpine
# node 22：Vite 8 要求（与本地开发 node v22 一致）；依赖全为纯 JS，无原生编译，alpine 即可
ARG NODE_IMAGE=node:22-alpine
ARG NGINX_IMAGE=nginx:stable-alpine
FROM ${NODE_IMAGE} AS build

# 依赖源（ENV 优先级高于 .npmrc，双保险；弱网可用 build-arg 换源）
ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV npm_config_registry=${NPM_REGISTRY}

WORKDIR /app

# 1) 先拷依赖清单再安装：package.json/lock 不变时命中层缓存，跳过最贵的安装步骤
COPY package.json package-lock.json ./

# 2) 有 lock 用 npm ci（可复现）；lock 缺失回退 npm install
RUN set -eux; \
    if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund || npm install --no-audit --no-fund; \
    else \
      npm install --no-audit --no-fund; \
    fi

# 3) 拷源码（.dockerignore 保证不带 node_modules/dist/.git）
COPY . .

# 4) 构建：tsc -b 类型检查 + vite build，产物 dist/（assets/ 文件名带内容 hash）
RUN npm run build

# ==================== 运行阶段 ====================
FROM ${NGINX_IMAGE}

# conf 模板 + envsubst：官方 nginx 镜像启动脚本把 templates/*.template 按容器
# 环境变量渲染到 conf.d/（只替换已定义的 env，$uri 等 nginx 变量不受影响），
# 运行时 -e API_UPSTREAM=... 即可切换后端，一镜像多环境
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/ /usr/share/nginx/html/

# dev vite proxy（/api、/guyuzhoudb → localhost:8080）在生产由 nginx 反代承接。
# 默认直连 GoProject 仓库 compose 网络内的 handicap-server 容器（容器内端口，无宿主机映射）：
# 运行需 --network goproject_default（GoProject 目录 compose up 创建的网络）。
# nginx 静态 proxy_pass 启动时解析容器名——先起后端 compose 再起本容器，
# 顺序颠倒时靠 --restart unless-stopped 拉起重试
ENV API_UPSTREAM=http://handicap-server:8080

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
