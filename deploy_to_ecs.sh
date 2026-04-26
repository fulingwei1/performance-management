#!/bin/bash
# 绩效管理系统 ECS 迁移 - 一键执行脚本
# 用法：./deploy_to_ecs.sh [密码]

set -e

PASSWORD=${1:-}
SSH_HOST="8.138.230.46"
SSH_USER="root"
LOCAL_SQL="backend/migrations/013_core_department_templates.sql"
REMOTE_SQL="/tmp/013_core_department_templates.sql"
REMOTE_DIR="/opt/performance-management"

echo "🚀 绩效管理系统 ECS 迁移"
echo "================================================"

# 检查密码
if [ -z "$PASSWORD" ]; then
    read -sp "请输入 ECS 密码: " PASSWORD
    echo
fi

# 创建临时密码文件
PASS_FILE=$(mktemp)
echo "$PASSWORD" > "$PASS_FILE"
chmod 700 "$PASS_FILE"

# 设置 SSH_ASKPASS 环境变量
export DISPLAY=:0
export SSH_ASKPASS="$PASS_FILE"
export SSH_ASKPASS_REQUIRE=force

# 函数：执行命令
run_cmd() {
    echo "🔧 $1"
    eval "$1"
    return $?
}

# 1. 上传 SQL 文件
echo -e "\n📤 上传 SQL 文件..."
sshpass -p "$PASSWORD" scp "$LOCAL_SQL" "$SSH_USER@$SSH_HOST:$REMOTE_SQL"
echo "✅ 文件上传成功"

# 2. 执行迁移
echo -e "\n🚀 执行 SQL 迁移..."
sshpass -p "$PASSWORD" ssh "$SSH_USER@$SSH_HOST" << EOF
cd $REMOTE_DIR
docker compose exec -T postgres psql -U postgres -d performance_management -f $REMOTE_SQL
EOF
echo "✅ 迁移执行成功"

# 3. 验证数据
echo -e "\n📊 验证数据..."
sshpass -p "$PASSWORD" ssh "$SSH_USER@$SSH_HOST" << EOF
cd $REMOTE_DIR
docker compose exec -T postgres psql -U postgres -d performance_management -c "
SELECT '部门数' as type, COUNT(*) FROM departments
UNION ALL SELECT '岗位数', COUNT(*) FROM positions
UNION ALL SELECT '指标数', COUNT(*) FROM performance_metrics
UNION ALL SELECT '模板数', COUNT(*) FROM metric_templates;
"
EOF

# 4. 清理临时文件
echo -e "\n🧹 清理临时文件..."
sshpass -p "$PASSWORD" ssh "$SSH_USER@$SSH_HOST" "rm -f $REMOTE_SQL"

# 清理本地临时文件
rm -f "$PASS_FILE"

echo -e "\n================================================"
echo "✅ 迁移完成！"
echo "📊 数据已初始化：8 个部门、22 个岗位、30+ 个指标、12 个模板"
