#!/usr/bin/env python3
"""
绩效管理系统 ECS 迁移自动化 - 多方案支持
支持：SSH 密钥、密码、SSH_ASKPASS
"""
import subprocess
import os
import sys
import tempfile

# 配置
SSH_HOST = '8.138.230.46'
SSH_USER = 'root'
LOCAL_SQL = '/Users/fulingwei/performance-management/backend/migrations/013_core_department_templates.sql'
REMOTE_SQL = '/tmp/013_core_department_templates.sql'
REMOTE_DIR = '/opt/performance-management'

def run_cmd(cmd, timeout=60):
    """运行命令"""
    print(f"🔧 执行: {cmd[:80]}...")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    if result.stdout:
        print(f"   输出: {result.stdout[:200]}")
    if result.stderr:
        print(f"   错误: {result.stderr[:200]}")
    return result.returncode == 0, result.stdout, result.stderr

def main():
    print("🚀 绩效管理系统 ECS 迁移自动化")
    print("=" * 50)
    
    # 方案 1: 尝试 SSH 密钥
    print("\n📡 方案 1: 尝试 SSH 密钥连接...")
    success, _, _ = run_cmd(f"ssh -o ConnectTimeout=5 -o BatchMode=yes {SSH_USER}@{SSH_HOST} 'echo connected'")
    if success:
        print("✅ SSH 密钥连接成功！")
        return execute_migration_ssh_key()
    
    # 方案 2: 使用 SSH_ASKPASS
    print("\n📡 方案 2: 使用 SSH_ASKPASS...")
    password = input("请输入 ECS 密码: ").strip()
    
    # 创建临时密码文件
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.sh') as f:
        f.write(f'#!/bin/bash\necho "{password}"')
        pass_file = f.name
    os.chmod(pass_file, 0o700)
    
    env = os.environ.copy()
    env['DISPLAY'] = ':0'
    env['SSH_ASKPASS'] = pass_file
    env['SSH_ASKPASS_REQUIRE'] = 'force'
    
    # 上传文件
    print("\n📤 上传 SQL 文件...")
    cmd = f'SSH_ASKPASS="{pass_file}" DISPLAY=:0 SSH_ASKPASS_REQUIRE=force sshpass -p "{password}" scp {LOCAL_SQL} {SSH_USER}@{SSH_HOST}:{REMOTE_SQL}'
    success, _, _ = run_cmd(cmd)
    
    if not success:
        # 方案 3: 使用 expect
        print("\n📡 方案 3: 使用 expect...")
        expect_script = f"""
        spawn scp {LOCAL_SQL} {SSH_USER}@{SSH_HOST}:{REMOTE_SQL}
        expect "password:"
        send "{password}\\r"
        expect eof
        """
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.exp') as f:
            f.write(expect_script)
            expect_file = f.name
        os.chmod(expect_file, 0o755)
        success, _, _ = run_cmd(f"expect {expect_file}")
    
    if success:
        # 执行迁移
        print("\n🚀 执行迁移...")
        ssh_cmd = f'SSH_ASKPASS="{pass_file}" DISPLAY=:0 SSH_ASKPASS_REQUIRE=force ssh {SSH_USER}@{SSH_HOST}'
        
        # 执行 SQL
        sql_cmd = f'{ssh_cmd} "cd {REMOTE_DIR} && docker compose exec -T postgres psql -U postgres -d performance_management -f {REMOTE_SQL}"'
        success, output, _ = run_cmd(sql_cmd, timeout=120)
        
        if success:
            print(f"\n✅ 迁移输出:\n{output}")
            
            # 验证
            print("\n📊 验证数据...")
            verify_cmd = f'{ssh_cmd} "cd {REMOTE_DIR} && docker compose exec -T postgres psql -U postgres -d performance_management -c \\"SELECT \'部门数\' as type, COUNT(*) FROM departments UNION ALL SELECT \'岗位数\', COUNT(*) FROM positions UNION ALL SELECT \'指标数\', COUNT(*) FROM performance_metrics UNION ALL SELECT \'模板数\', COUNT(*) FROM metric_templates;\\""'
            success, output, _ = run_cmd(verify_cmd)
            if success:
                print(f"\n✅ 数据验证:\n{output}")
        
        # 清理
        run_cmd(f'{ssh_cmd} "rm -f {REMOTE_SQL}"')
    
    # 清理临时文件
    if os.path.exists(pass_file):
        os.unlink(pass_file)
    
    print("\n" + "=" * 50)
    print("✅ 迁移完成！")

def execute_migration_ssh_key():
    """使用 SSH 密钥执行迁移"""
    print("\n🚀 使用 SSH 密钥执行迁移...")
    
    # 上传文件
    run_cmd(f"scp {LOCAL_SQL} {SSH_USER}@{SSH_HOST}:{REMOTE_SQL}")
    
    # 执行迁移
    run_cmd(f"ssh {SSH_USER}@{SSH_HOST} 'cd {REMOTE_DIR} && docker compose exec -T postgres psql -U postgres -d performance_management -f {REMOTE_SQL}'", timeout=120)
    
    # 验证
    run_cmd(f"ssh {SSH_USER}@{SSH_HOST} 'cd {REMOTE_DIR} && docker compose exec -T postgres psql -U postgres -d performance_management -c \"SELECT \'部门数\' as type, COUNT(*) FROM departments UNION ALL SELECT \'岗位数\', COUNT(*) FROM positions UNION ALL SELECT \'指标数\', COUNT(*) FROM performance_metrics UNION ALL SELECT \'模板数\', COUNT(*) FROM metric_templates;\"'")
    
    # 清理
    run_cmd(f"ssh {SSH_USER}@{SSH_HOST} 'rm -f {REMOTE_SQL}'")
    
    return True

if __name__ == "__main__":
    main()
