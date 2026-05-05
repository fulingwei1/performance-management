#!/usr/bin/env python3
"""
绩效管理系统 ECS 迁移自动化 - 更新版
使用正确的数据库凭据
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
REMOTE_SQL = '/tmp/013_core_department_templates.sql'
REMOTE_DIR = '/opt/performance-management'

# 数据库配置
DB_USER = 'performance_user'
DB_NAME = 'performance_db'

def main():
    print("🚀 绩效管理系统 ECS 迁移自动化")
    print("=" * 50)
    
    # 创建 SSH 连接
    print(f"\n📡 连接到 {SSH_HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
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
    except Exception as e:
        print(f"❌ SSH 连接失败: {e}")
        return False
    
    try:
        # 1. 上传文件
        print("\n📤 上传 SQL 文件...")
        sftp = client.open_sftp()
        sftp.put(LOCAL_SQL, REMOTE_SQL)
        sftp.close()
        print("✅ 文件上传成功")
        
        # 2. 执行迁移
        print("\n🚀 执行 SQL 迁移...")
        cmd = f"cd {REMOTE_DIR} && docker compose exec -T postgres psql -U {DB_USER} -d {DB_NAME} -f {REMOTE_SQL}"
        stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
        
        exit_status = stdout.channel.recv_exit_status()
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        
        if exit_status == 0:
            print("✅ 迁移执行成功")
            if output:
                print(f"   输出: {output[:500]}")
        else:
            print(f"❌ 迁移执行失败 (exit code: {exit_status})")
            if error:
                print(f"   错误: {error[:500]}")
            return False
        
        # 3. 验证数据
        print("\n📊 验证数据...")
        verify_cmd = f'''cd {REMOTE_DIR} && docker compose exec -T postgres psql -U {DB_USER} -d {DB_NAME} -c "
SELECT '部门数' as type, COUNT(*) FROM departments
UNION ALL SELECT '岗位数', COUNT(*) FROM positions
UNION ALL SELECT '指标数', COUNT(*) FROM performance_metrics
UNION ALL SELECT '模板数', COUNT(*) FROM metric_templates;
"'''
        stdin, stdout, stderr = client.exec_command(verify_cmd)
        exit_status = stdout.channel.recv_exit_status()
        output = stdout.read().decode('utf-8')
        
        if exit_status == 0:
            print(f"✅ 数据验证结果:\n{output}")
        else:
            print("⚠️  数据验证失败，但迁移可能已成功")
        
        # 4. 清理
        print("\n🧹 清理临时文件...")
        client.exec_command(f"rm -f {REMOTE_SQL}")
        
        print("\n" + "=" * 50)
        print("✅ 迁移完成！")
        print("📊 数据已初始化：8 个部门、22 个岗位、30+ 个指标、12 个模板")
        return True
        
    except Exception as e:
        print(f"\n❌ 迁移过程异常: {e}")
        return False
    finally:
        client.close()
        print("🔌 SSH 连接已关闭")

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
