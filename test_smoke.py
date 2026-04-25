#!/usr/bin/env python3
"""
绩效管理系统全面 Smoke 测试
测试所有 API 端点、权限控制、数据完整性
"""
import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://8.138.230.46/performance-management/api"
RESULTS = {"pass": 0, "fail": 0, "warn": 0}

def test_endpoint(method, path, expected_status=200, **kwargs):
    """测试单个端点"""
    url = f"{BASE_URL}{path}"
    try:
        resp = requests.request(method, url, **kwargs, timeout=10)
        status = "PASS" if resp.status_code == expected_status else "FAIL"
        if status == "FAIL":
            RESULTS["fail"] += 1
            print(f"❌ {status} {method} {path} - 期望 {expected_status}, 得到 {resp.status_code}")
            if resp.status_code != 404 and resp.text:
                print(f"   响应: {resp.text[:200]}")
        else:
            RESULTS["pass"] += 1
            print(f"✅ {status} {method} {path}")
        return resp
    except Exception as e:
        RESULTS["fail"] += 1
        print(f"❌ ERROR {method} {path}: {e}")
        return None

def test_auth():
    """测试认证相关"""
    print("\n=== 认证测试 ===")
    # 测试登录 - 使用测试数据中的凭据
    test_users = [
        {"username": "于振华", "password": "123456", "role": "manager"},
        {"username": "林作倩", "password": "123456", "role": "hr"},
        {"username": "周欢欢", "password": "123456", "role": "employee"}
    ]
    
    for user in test_users:
        resp = test_endpoint("POST", "/auth/login", expected_status=200,
                            json=user)
        if resp and resp.status_code == 200:
            token = resp.json().get("data", {}).get("token")
            headers = {"Authorization": f"Bearer {token}"}
            print(f"   ✅ {user['username']} 登录成功")
            
            # 测试需要认证的端点
            test_endpoint("GET", "/employees", headers=headers)
            test_endpoint("GET", "/departments/tree", headers=headers)
            test_endpoint("GET", "/performance/my-records", headers=headers)
            
            # 根据角色测试权限敏感的端点
            if user['role'] in ['hr', 'admin', 'manager', 'gm']:
                test_endpoint("GET", "/appeals", headers=headers, expected_status=200)
            else:
                # employee 角色不应该访问申诉列表
                test_endpoint("GET", "/appeals", headers=headers, expected_status=403)
            
            test_endpoint("GET", "/metrics", headers=headers)
            test_endpoint("GET", "/metrics/templates", headers=headers)
            
            # 通知模块已停用
            test_endpoint("GET", "/notifications", headers=headers, expected_status=410)
            
            # 系统设置需要 hr/admin 权限
            if user['role'] in ['hr', 'admin']:
                test_endpoint("GET", "/system-settings", headers=headers, expected_status=200)
            else:
                test_endpoint("GET", "/system-settings", headers=headers, expected_status=403)
        else:
            print(f"   ⚠️  {user['username']} 登录失败，跳过相关测试")

def test_public_endpoints():
    """测试公开端点"""
    print("\n=== 公开端点测试 ===")
    test_endpoint("GET", "/health", expected_status=200)
    # GET /auth/login 应该返回 404 或 405，取决于路由实现
    test_endpoint("GET", "/auth/login", expected_status=404)

def test_error_handling():
    """测试错误处理"""
    print("\n=== 错误处理测试 ===")
    test_endpoint("GET", "/nonexistent", expected_status=404)
    test_endpoint("POST", "/auth/login", expected_status=400, 
                  json={"invalid": "data"})

def main():
    print(f"🧪 绩效管理系统 Smoke 测试 - {datetime.now()}")
    print(f"目标: {BASE_URL}")
    
    test_public_endpoints()
    test_auth()
    test_error_handling()
    
    print(f"\n{'='*50}")
    print(f"📊 测试结果:")
    print(f"   ✅ 通过: {RESULTS['pass']}")
    print(f"   ❌ 失败: {RESULTS['fail']}")
    print(f"   ⚠️  警告: {RESULTS['warn']}")
    print(f"   总计: {sum(RESULTS.values())}")
    
    if RESULTS["fail"] > 0:
        print("\n❌ 发现失败项，需要修复")
        return 1
    else:
        print("\n✅ 所有测试通过")
        return 0

if __name__ == "__main__":
    sys.exit(main())
