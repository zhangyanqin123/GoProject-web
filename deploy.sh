#!/usr/bin/env bash
# goproject-web 版本化发版 / 回滚
# 镜像按语义版本 tag 命名（1.2.0 风格），旧版本保留可回滚；
# 容器始终运行具体版本 tag，latest 只是「当前运行版本」的指针别名。
# 兼容 macOS 自带 bash 3.2：不用 mapfile / declare -A / 裸算术自增，去重计数交 awk。
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

REPO=goproject-web
CONTAINER=goproject-web
NETWORK=goproject_default           # 后端 GoProject 仓库 compose 创建的网络
KEEP="${KEEP:-5}"                   # prune 保留的版本数
HEALTH_BUDGET=60                    # 健康检查等待预算（秒）

info() { printf '\033[32m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*" >&2; }   # 走 stderr：避免被 $() 命令替换误捕获
err()  { printf '\033[31m%s\033[0m\n' "$*" >&2; }

# 当前容器运行的镜像引用（如 goproject-web:v20260831-153042-533082f），未运行则为空
current_image() { docker inspect -f '{{.Config.Image}}' "$CONTAINER" 2>/dev/null || true; }

# 以完整镜像引用（tag 或镜像 ID）启动容器（80 端口、后端网络、重启自愈；API_UPSTREAM 非空才注入）
# 自动回滚/恢复场景传镜像 ID：不受后续 tag 覆盖影响（裸名 goproject-web 会被重打的 latest 误导）
run_image() {
  docker run -d --name "$CONTAINER" --network "$NETWORK" -p 80:80 --restart unless-stopped \
    ${API_UPSTREAM:+-e API_UPSTREAM=$API_UPSTREAM} "$1"
}

run_tag() { run_image "$REPO:$1"; }

# 轮询健康状态：2s 一次，预算内变 healthy 返回 0；
# 出现 unhealthy / exited / 容器消失立刻失败并 dump 日志
wait_healthy() { # $1=预算秒
  local deadline=$(( SECONDS + $1 )) st
  while [ "$SECONDS" -lt "$deadline" ]; do
    st=$(docker inspect -f '{{.State.Status}}/{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$CONTAINER" 2>/dev/null || echo gone)
    case "$st" in
      running/healthy) return 0 ;;
      running/unhealthy|exited*|gone)
        err "容器状态异常: $st"
        docker logs --tail 20 "$CONTAINER" 2>/dev/null || true
        return 1 ;;
    esac
    sleep 2
  done
  return 1
}

# 发版前置检查：docker 可用 / 后端网络在 / 80 端口没被别人占
preflight() {
  docker info >/dev/null 2>&1 || { err "docker daemon 不可用"; exit 1; }
  docker network inspect "$NETWORK" >/dev/null 2>&1 \
    || { err "网络 $NETWORK 不存在，请先启动后端 compose（cd GoProject && docker compose up -d）"; exit 1; }
  local foreign
  foreign=$(docker ps --filter "publish=80" --format '{{.Names}}' | grep -vx "$CONTAINER" || true)
  if [ -n "$foreign" ]; then err "80 端口已被其它容器占用: $foreign"; exit 1; fi
  local pid
  # com.docker / ControlCenter 会被 lsof 的 9 字符 COMMAND 列截断（com.docke / ControlCe），用前缀匹配
  pid=$(lsof -nP -iTCP:80 -sTCP:LISTEN 2>/dev/null | awk 'NR>1 && $1 !~ /^(com\.docke|ControlCe)/ {print $1; exit}' || true)
  if [ -n "$pid" ]; then
    err "80 端口被非 docker 进程占用（${pid}）:"
    lsof -nP -iTCP:80 -sTCP:LISTEN || true
    exit 1
  fi
}

# 构建：版本 tag + latest 双打标；GIT_REV 记录构建时代码提交（语义 tag 不含 hash，靠它溯源）；
# 弱网换源环境变量非空才透传（防空串覆盖默认值）
build_img() { # $1=tag
  docker build \
    ${NODE_IMAGE:+--build-arg NODE_IMAGE=$NODE_IMAGE} \
    ${NGINX_IMAGE:+--build-arg NGINX_IMAGE=$NGINX_IMAGE} \
    ${NPM_REGISTRY:+--build-arg NPM_REGISTRY=$NPM_REGISTRY} \
    --build-arg IMAGE_TAG="$1" \
    --build-arg GIT_REV="$(git rev-parse --short HEAD)" \
    -t "$REPO:$1" -t "$REPO:latest" .
}

# 版本 tag 列表，版本感知降序（sort -t. 分段数字排：1.10.0 > 1.9.0，字典序会错；
# 历史 v2026xxx 等非数字 tag 按首段 0 排最后，天然沉底）。同样不能信 docker images
# 的输出顺序——BuildKit 层缓存命中时连续构建的镜像 CreatedAt 相同
version_tags() {
  docker images "$REPO" --format '{{.Tag}}' | grep -Ev '^(latest|<none>)$' \
    | sort -t. -k1,1nr -k2,2nr -k3,3nr || true
}

# 下一个语义版本：取现有最大 x.y.z 按指定段位 bump（patch/minor/major）；
# 无语义版本历史时以 1.0.0 为首版（不 bump）；撞名则 patch 递增直到未占用
next_version() { # $1=patch|minor|major
  local base ma mi pa new
  base=$(docker images "$REPO" --format '{{.Tag}}' \
    | awk -F. 'NF==3 && $1 ~ /^[0-9]+$/ && $2 ~ /^[0-9]+$/ && $3 ~ /^[0-9]+$/ {print}' \
    | sort -t. -k1,1nr -k2,2nr -k3,3nr | head -1)
  if [ -z "$base" ]; then echo "1.0.0"; return 0; fi
  IFS=. read -r ma mi pa <<< "$base"
  case "$1" in
    major) ma=$((ma + 1)); mi=0; pa=0 ;;
    minor) mi=$((mi + 1)); pa=0 ;;
    *)     pa=$((pa + 1)) ;;
  esac
  new="$ma.$mi.$pa"
  while docker image inspect "$REPO:$new" >/dev/null 2>&1; do
    pa=$((pa + 1)); new="$ma.$mi.$pa"
  done
  echo "$new"
}

cmd_list() {
  local cur
  cur=$(current_image)
  echo "== $REPO 镜像版本（新→旧）=="
  version_tags \
    | awk -v cur="$cur" -v repo="$REPO" '{ printf "  %-36s %s\n", $1, (repo":"$1==cur ? "<- 当前运行" : "") }'
  echo "  （latest 是当前运行版本的指针别名，不算独立版本）"
}

cmd_deploy() { # $1=可省: patch(缺省)|minor|major|显式 x.y.z
  preflight
  if [ "${CHECK:-}" = "1" ]; then
    info "==> CHECK=1: 构建前先跑 typecheck"
    npm run typecheck
  fi
  local tag arg="${1:-}"
  if [ -z "$arg" ] || [ "$arg" = "patch" ] || [ "$arg" = "minor" ] || [ "$arg" = "major" ]; then
    tag=$(next_version "${arg:-patch}")
  elif [[ "$arg" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    tag="$arg"
  else
    err "无效版本: ${arg}（应为 patch | minor | major 或 x.y.z 形如 1.2.0）"
    exit 1
  fi
  docker image inspect "$REPO:$tag" >/dev/null 2>&1 \
    && { err "镜像 $REPO:$tag 已存在，换一个版本号或用 bump 关键字"; exit 1; }
  if git status --porcelain | grep -q .; then
    warn "工作区不干净，建议先提交再发版（本镜像 GIT_REV 记录的是当前 HEAD）"
  fi
  local prev prev_id
  prev=$(current_image)   # 人类可读引用；可能为空 = 首次部署
  prev_id=$(docker inspect -f '{{.Image}}' "$CONTAINER" 2>/dev/null || true)

  info "==> 构建 $REPO:$tag"
  build_img "$tag"   # 失败 set -e 直接退出，旧容器毫发无损

  info "==> 切换容器 → $tag"
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  run_tag "$tag" >/dev/null

  info "==> 等待健康检查（预算 ${HEALTH_BUDGET}s）"
  if wait_healthy "$HEALTH_BUDGET"; then
    docker tag "$REPO:$tag" "$REPO:latest" >/dev/null
    info "✔ 上线成功: ${tag}（latest 已重指）"
    if [ -n "$prev" ] && [ "$prev" != "$REPO:$tag" ]; then
      echo "  如需回退: ./deploy.sh rollback prev    # 即 $prev"
    fi
    cmd_list
    return 0
  fi

  err "✘ 新版本 $tag 未通过健康检查"
  if [ -z "$prev" ]; then
    err "无上一版本可回滚（首次部署）"
    exit 1
  fi
  info "==> 自动回滚 → $prev"
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  if run_image "$prev_id" >/dev/null && wait_healthy "$HEALTH_BUDGET"; then
    docker tag "$prev" "$REPO:latest" >/dev/null
    warn "✔ 已回滚到 ${prev}（latest 已重指）。失败镜像 $REPO:$tag 保留未删，确认无用可 docker rmi 清理"
    exit 1
  fi
  err "FATAL: 回滚也失败！手工恢复（镜像 ID ${prev_id}）："
  echo "  docker rm -f $CONTAINER; docker run -d --name $CONTAINER --network $NETWORK -p 80:80 --restart unless-stopped $prev_id"
  exit 1
}

cmd_rollback() { # $1=tag | prev | 空(列表)
  local cur cur_id target
  cur=$(current_image)
  cur_id=$(docker inspect -f '{{.Image}}' "$CONTAINER" 2>/dev/null || true)
  [ -n "$cur" ] || { err "容器 $CONTAINER 未在运行"; exit 1; }

  if [ -z "${1:-}" ]; then
    cmd_list
    echo
    echo "用法: ./deploy.sh rollback prev    # 回滚到上一版本"
    echo "      ./deploy.sh rollback <tag>   # 回滚到指定历史版本"
    return 0
  fi

  target="$1"
  if [ "$target" = "prev" ]; then
    # 版本 tag 字典序降序去掉当前运行项，取最新的一个
    target=$(version_tags | awk -v cur="${cur#$REPO:}" '$1!=cur {print; exit}')
    [ -n "$target" ] || { err "找不到可回滚的历史版本"; exit 1; }
  fi
  docker image inspect "$REPO:$target" >/dev/null 2>&1 \
    || { err "镜像 $REPO:$target 不存在，./deploy.sh list 查看可用版本"; exit 1; }

  preflight
  info "==> 回滚 $cur → $target"
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  run_tag "$target" >/dev/null

  if wait_healthy "$HEALTH_BUDGET"; then
    docker tag "$REPO:$target" "$REPO:latest" >/dev/null
    info "✔ 回滚成功: ${target}（latest 已重指）"
    cmd_list
    return 0
  fi

  err "✘ 回滚后健康检查失败，尝试恢复原版本 $cur"
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  if run_image "$cur_id" >/dev/null && wait_healthy "$HEALTH_BUDGET"; then
    warn "已恢复原版本 $cur"
  else
    err "FATAL: 恢复失败！手工恢复（镜像 ID ${cur_id}）："
    echo "  docker run -d --name $CONTAINER --network $NETWORK -p 80:80 --restart unless-stopped $cur_id"
  fi
  exit 1
}

cmd_prune() { # $1=-n 干跑
  local dry=n victims cur_id
  if [ "${1:-}" = "-n" ]; then dry=y; fi
  cur_id=$(docker inspect -f '{{.Image}}' "$CONTAINER" 2>/dev/null || true)
  # 版本 tag 字典序降序（即新→旧），按镜像 ID 去重、保留最近 KEEP 个，其余列出；
  # 当前运行版本计入保留名额（它就是「最近 KEEP 个」之一）但无论何时都不删
  victims=$(docker images "$REPO" --no-trunc --format '{{.Tag}}\t{{.ID}}' \
    | awk -F'\t' '$1!="latest" && $1!="<none>"' | sort -t. -k1,1nr -k2,2nr -k3,3nr \
    | awk -F'\t' -v cur="$cur_id" -v keep="$KEEP" '!seen[$2]++ { n++; if (n>keep && $2!=cur) print $1 }')
  if [ -z "$victims" ]; then info "无需清理（保留最近 $KEEP 个版本）"; return 0; fi
  echo "将删除以下旧版本（保留最近 $KEEP 个）:"
  echo "$victims" | sed 's/^/  /'
  if [ "$dry" = "y" ]; then echo "（干跑模式，未实际删除）"; return 0; fi
  local ans
  read -r -p "确认删除? [y/N] " ans || true
  case "$ans" in
    y|Y) echo "$victims" | while read -r t; do docker rmi "$REPO:$t" >/dev/null && info "已删除 $t"; done ;;
    *)   info "已取消" ;;
  esac
}

usage() {
  cat <<'EOF'
goproject-web 版本化发版 / 回滚

用法: ./deploy.sh <命令>

  deploy [bump]  发版：构建语义版本镜像 → 切换容器 → 健康门禁（60s）→ 失败自动回滚上一版
                 bump 缺省 patch（1.2.3→1.2.4）；minor（→1.3.0）/ major（→2.0.0）升对应段位；
                 或显式版本号 ./deploy.sh deploy 1.2.0；无历史版本时首版 1.0.0
  rollback       列出可回滚版本（标注当前运行）
  rollback prev  回滚到上一版本
  rollback <tag> 回滚到指定历史版本
  list           列出全部镜像版本
  prune [-n]     清理旧版本（保留最近 KEEP 个，默认 5）；-n 只看清单不删

环境变量（均缺省不传，非空才生效）:
  NODE_IMAGE / NGINX_IMAGE / NPM_REGISTRY   弱网换源，如 NPM_REGISTRY=https://registry.npmmirror.com
  API_UPSTREAM   后端地址（缺省镜像内 http://handicap-server:8080）
  KEEP           prune 保留版本数（默认 5）
  CHECK=1        构建前先跑 npm run typecheck（弱网下 docker build 前快速失败）
EOF
}

case "${1:-}" in
  deploy)   shift; cmd_deploy "$@" ;;
  rollback) shift; cmd_rollback "$@" ;;
  list)     cmd_list ;;
  prune)    shift; cmd_prune "$@" ;;
  *)        usage ;;
esac
