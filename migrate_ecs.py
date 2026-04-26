#!/usr/bin/env python3
"""
绩效管理系统 ECS 迁移 - 最终版
使用 docker exec 直接执行
"""
import paramiko
import sys

SSH_HOST = '8.138.230.46'
SSH_USER = 'root'
SSH_PASSWORD = 'F@p%AK94*dv!8h7'
LOCAL_SQL = '/Users/fulingwei/performance-management/backend/migrations/013_core_department_templates.sql'
DB_USER = 'performance_user'
DB_NAME = 'performance_db'

def main():
    print("🚀 绩效管理系统 ECS 迁移")
    print("=" * 50)
    
    # 连接 SSH
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SSH_HOST, port=22, username=SSH_USER, password=SSH_PASSWORD, timeout=10)
    print("✅ SSH 连接成功")
    
    try:
        # 读取 SQL
        with open(LOCAL_SQL, 'r', encoding='utf-8') as f:
            sql = f.read()
        print(f"📖 SQL 文件读取: {len(sql)} 字节")
        
        # 方法：使用 docker exec 和 psql stdin
        print("\n🚀 执行迁移...")
        cmd = f"docker exec -i ate_postgres psql -U {DB_USER} -d {DB_NAME}"
        
        channel = client.get_transport().open_session()
        channel.exec_command(cmd)
        
        stdin = channel.makefile('wb')
        stdout = channel.makefile('rb')
        stderr = channel.makefile_stderr('rb')
        
        stdin.write(sql.encode('utf-8'))
        stdin.close()
        
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        exit_code = channel.recv_exit_status()
        
        if exit_code == 0:
            print("✅ 迁移执行成功")
            if output:
                print(output[:1000])
        else:
            print(f"❌ 失败 (exit code: {exit_code})")
            if error:
                print(f"错误: {error[:500]}")
            return False
        
        # 验证
        print("\n📊 验证数据...")
        verify = f"docker exec -i ate_postgres psql -U {DB_USER} -d {DB_NAME} -c \"SELECT '部门数' as type, COUNT(*) FROM departments UNION ALL SELECT '岗位数', COUNT(*) FROM positions UNION ALL SELECT '指标数', COUNT(*) FROM performance_metrics UNION ALL SELECT '模板数', COUNT(*) FROM metric_templates;\""
        
        stdin, stdout, stderr = client.exec_command(verify)
        output = stdout.read().decode('utf-8')
        print(output)
        
        print("\n" + "=" * 50)
        print("✅ 迁移完成！")
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
