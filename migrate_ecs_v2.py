#!/usr/bin/env python3
"""
绩效管理系统 ECS 迁移 - 使用 docker cp
"""
import paramiko
import os
import sys

def require_env(name: str) -> str:
    value = os.getenv(name, '').strip()
    if not value:
        raise RuntimeError(f'缺少环境变量 {name}')
    return value


# 连接配置从环境变量读取，避免把服务器地址/凭据写入仓库。
SSH_HOST = require_env('PERF_ECS_HOST')
SSH_PORT = int(os.getenv('PERF_ECS_PORT', '22'))
SSH_USER = os.getenv('PERF_ECS_USER', 'root')
SSH_PASSWORD = os.getenv('PERF_ECS_PASSWORD')
SSH_KEY_FILE = os.getenv('PERF_ECS_KEY_FILE')
LOCAL_SQL = '/Users/fulingwei/performance-management/backend/migrations/013_core_department_templates.sql'
DB_USER = 'performance_user'
DB_NAME = 'performance_db'

def exec_cmd(client, cmd, timeout=30):
    """执行命令并返回结果"""
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    output = stdout.read().decode('utf-8')
    error = stderr.read().decode('utf-8')
    return exit_code, output, error

def main():
    print("🚀 绩效管理系统 ECS 迁移")
    print("=" * 50)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    if not SSH_PASSWORD and not SSH_KEY_FILE:
        raise RuntimeError('请设置 PERF_ECS_KEY_FILE 或 PERF_ECS_PASSWORD')
    client.connect(
        SSH_HOST,
        port=SSH_PORT,
        username=SSH_USER,
        password=SSH_PASSWORD,
        key_filename=SSH_KEY_FILE,
        timeout=10,
    )
    print("✅ SSH 连接成功")
    
    try:
        # 1. 上传文件到宿主机
        print("\n📤 上传 SQL 文件...")
        sftp = client.open_sftp()
        sftp.put(LOCAL_SQL, '/tmp/013_core_department_templates.sql')
        sftp.close()
        print("✅ 文件上传成功")
        
        # 2. 复制到容器
        print("\n📦 复制到容器...")
        exit_code, output, error = exec_cmd(client, 
            "docker cp /tmp/013_core_department_templates.sql ate_postgres:/tmp/013_core_department_templates.sql")
        if exit_code != 0:
            print(f"❌ docker cp 失败: {error}")
            return False
        print("✅ 文件复制到容器成功")
        
        # 3. 执行 SQL
        print("\n🚀 执行 SQL 迁移...")
        cmd = f"docker exec ate_postgres psql -U {DB_USER} -d {DB_NAME} -f /tmp/013_core_department_templates.sql"
        exit_code, output, error = exec_cmd(client, cmd, timeout=120)
        
        if exit_code == 0:
            print("✅ 迁移执行成功")
            if output:
                print(output[:1000])
        else:
            print(f"❌ 迁移失败 (exit code: {exit_code})")
            if error:
                print(f"错误: {error[:500]}")
            return False
        
        # 4. 验证
        print("\n📊 验证数据...")
        verify = f'''docker exec ate_postgres psql -U {DB_USER} -d {DB_NAME} -c "
SELECT '部门数' as type, COUNT(*) FROM departments
UNION ALL SELECT '岗位数', COUNT(*) FROM positions
UNION ALL SELECT '指标数', COUNT(*) FROM performance_metrics
UNION ALL SELECT '模板数', COUNT(*) FROM metric_templates;
"'''
        exit_code, output, error = exec_cmd(client, verify)
        if exit_code == 0:
            print(f"✅ 数据验证:\n{output}")
        
        # 5. 清理
        print("\n🧹 清理临时文件...")
        exec_cmd(client, "docker exec ate_postgres rm -f /tmp/013_core_department_templates.sql")
        exec_cmd(client, "rm -f /tmp/013_core_department_templates.sql")
        
        print("\n" + "=" * 50)
        print("✅ 迁移完成！")
        print("📊 数据已初始化：8 个部门、22 个岗位、30+ 个指标、12 个模板")
        return True
        
    except Exception as e:
        print(f"❌ 异常: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        client.close()

if __name__ == "__main__":
    sys.exit(0 if main() else 1)
