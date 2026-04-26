#!/usr/bin/env python3
"""
自动化执行绩效管理系统 ECS 迁移
使用 paramiko 进行 SSH 连接和命令执行
"""
import paramiko
import os
import sys

# 服务器配置
SSH_HOST = '8.138.230.46'
SSH_PORT = 22
SSH_USER = 'root'

# 文件路径
LOCAL_SQL_FILE = '/Users/fulingwei/performance-management/backend/migrations/013_core_department_templates.sql'
REMOTE_SQL_FILE = '/tmp/013_core_department_templates.sql'
REMOTE_PROJECT_DIR = '/opt/performance-management'

def create_ssh_client(password=None):
    """创建 SSH 客户端"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        if password:
            client.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER, 
                          password=password, timeout=10)
        else:
            # 尝试使用 SSH 密钥
            client.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER,
                          timeout=10)
        print(f"✅ SSH 连接到 {SSH_HOST}")
        return client
    except Exception as e:
        print(f"❌ SSH 连接失败: {e}")
        return None

def upload_file(client, local_path, remote_path):
    """上传文件到远程服务器"""
    try:
        sftp = client.open_sftp()
        sftp.put(local_path, remote_path)
        sftp.close()
        print(f"✅ 文件上传成功: {local_path} -> {remote_path}")
        return True
    except Exception as e:
        print(f"❌ 文件上传失败: {e}")
        return False

def execute_command(client, command, timeout=60):
    """执行远程命令"""
    try:
        stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
        
        exit_status = stdout.channel.recv_exit_status()
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        
        if exit_status == 0:
            print(f"✅ 命令执行成功: {command[:50]}...")
            if output:
                print(f"   输出: {output[:200]}")
            return True, output
        else:
            print(f"❌ 命令执行失败: {command[:50]}...")
            if error:
                print(f"   错误: {error[:200]}")
            return False, error
    except Exception as e:
        print(f"❌ 命令执行异常: {e}")
        return False, str(e)

def main():
    print("🚀 绩效管理系统 ECS 迁移自动化")
    print("=" * 50)
    
    # 获取密码
    password = None
    if len(sys.argv) > 1:
        password = sys.argv[1]
    else:
        password = input("请输入 ECS 密码: ").strip()
    
    # 创建 SSH 连接
    client = create_ssh_client(password)
    if not client:
        print("❌ 无法建立 SSH 连接")
        return False
    
    try:
        # 1. 上传 SQL 文件
        print("\n📤 上传 SQL 文件...")
        if not upload_file(client, LOCAL_SQL_FILE, REMOTE_SQL_FILE):
            return False
        
        # 2. 进入项目目录
        print("\n📁 进入项目目录...")
        success, _ = execute_command(client, f"cd {REMOTE_PROJECT_DIR}")
        if not success:
            return False
        
        # 3. 执行 SQL 迁移
        print("\n🚀 执行 SQL 迁移...")
        success, output = execute_command(
            client, 
            f"docker compose exec -T postgres psql -U postgres -d performance_management -f {REMOTE_SQL_FILE}",
            timeout=120
        )
        if not success:
            print(f"   输出: {output}")
            return False
        
        # 4. 验证数据
        print("\n📊 验证数据...")
        verify_sql = """
        SELECT '部门数' as type, COUNT(*) FROM departments
        UNION ALL SELECT '岗位数', COUNT(*) FROM positions
        UNION ALL SELECT '指标数', COUNT(*) FROM performance_metrics
        UNION ALL SELECT '模板数', COUNT(*) FROM metric_templates;
        """
        success, output = execute_command(
            client,
            f"docker compose exec -T postgres psql -U postgres -d performance_management -c \"{verify_sql}\""
        )
        if success:
            print(f"\n✅ 数据验证结果:\n{output}")
        
        # 5. 清理临时文件
        print("\n🧹 清理临时文件...")
        execute_command(client, f"rm -f {REMOTE_SQL_FILE}")
        
        print("\n" + "=" * 50)
        print("✅ 迁移执行完成！")
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
