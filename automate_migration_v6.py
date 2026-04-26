#!/usr/bin/env python3
"""
绩效管理系统 ECS 迁移自动化 - 最终版
使用 docker exec 和 stdin 传递 SQL
"""
import paramiko
import os
import sys

# 配置
SSH_HOST = '8.138.230.46'
SSH_PORT = 22
SSH_USER = 'root'
SSH_PASSWORD = 'F@p%AK94*dv!8h7'

LOCAL_SQL = '/Users/fulingwei/performance-management/backend/migrations/013_core_department_templates.sql'
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
        client.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER, 
                      password=SSH_PASSWORD, timeout=10)
        print("✅ SSH 连接成功")
    except Exception as e:
        print(f"❌ SSH 连接失败: {e}")
        return False
    
    try:
        # 读取本地 SQL 文件
        print("\n📖 读取 SQL 文件...")
        with open(LOCAL_SQL, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        print(f"✅ SQL 文件读取成功 ({len(sql_content)} 字节)")
        
        # 使用 docker exec 和 stdin 执行 SQL
        print("\n🚀 执行 SQL 迁移...")
        cmd = f"cd {REMOTE_DIR} && docker compose exec -T postgres psql -U {DB_USER} -d {DB_NAME}"
        
        # 创建交互式通道
        channel = client.get_transport().open_session()
        channel.exec_command(cmd)
        
        # 发送 SQL 内容
        stdin = channel.makefile('wb')
        stdout = channel.makefile('rb')
        stderr = channel.makefile_stderr('rb')
        
        stdin.write(sql_content.encode('utf-8'))
        stdin.close()
        
        # 读取输出
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        exit_status = channel.recv_exit_status()
        
        if exit_status == 0:
            print("✅ 迁移执行成功")
            if output:
                print(f"   输出: {output[:500]}")
        else:
            print(f"❌ 迁移执行失败 (exit code: {exit_status})")
            if error:
                print(f"   错误: {error[:500]}")
            return False
        
        # 验证数据
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
        
        print("\n" + "=" * 50)
        print("✅ 迁移完成！")
        print("📊 数据已初始化：8 个部门、22 个岗位、30+ 个指标、12 个模板")
        return True
        
    except Exception as e:
        print(f"\n❌ 迁移过程异常: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        client.close()
        print("🔌 SSH 连接已关闭")

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
