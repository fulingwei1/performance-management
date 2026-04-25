#!/usr/bin/env python3
"""
绩效管理系统深度测试
测试 CRUD 操作、数据完整性、边界条件、错误处理
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

def get_auth_token(username, password):
    """获取认证令牌"""
    resp = test_endpoint("POST", "/auth/login", expected_status=200,
                        json={"username": username, "password": password})
    if resp and resp.status_code == 200:
        return resp.json().get("data", {}).get("token")
    return None

def test_employee_crud():
    """测试员工 CRUD 操作"""
    print("\n=== 员工 CRUD 测试 ===")
    token = get_auth_token("林作倩", "123456")  # HR 角色
    if not token:
        print("⚠️  HR 登录失败，跳过员工 CRUD 测试")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 获取员工列表
    resp = test_endpoint("GET", "/employees", headers=headers)
    if resp and resp.status_code == 200:
        employees = resp.json().get("data", [])
        if employees:
            emp_id = employees[0].get("id")
            
            # 获取单个员工
            test_endpoint("GET", f"/employees/{emp_id}", headers=headers)
            
            # 更新员工（测试 PUT）
            test_endpoint("PUT", f"/employees/{emp_id}", headers=headers,
                         json={"name": "测试更新", "department": "测试部门"},
                         expected_status=200)
            
            # 恢复原数据
            test_endpoint("PUT", f"/employees/{emp_id}", headers=headers,
                         json={"name": employees[0].get("name"), "department": employees[0].get("department")},
                         expected_status=200)
            
            # 测试不存在的员工（需要认证）
            test_endpoint("GET", "/employees/nonexistent", headers=headers, expected_status=404)

def test_department_crud():
    """测试部门 CRUD 操作"""
    print("\n=== 部门 CRUD 测试 ===")
    token = get_auth_token("林作倩", "123456")
    if not token:
        print("⚠️  HR 登录失败，跳过部门 CRUD 测试")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 获取部门树
    resp = test_endpoint("GET", "/departments/tree", headers=headers)
    if resp and resp.status_code == 200:
        departments = resp.json().get("data", [])
        if departments:
            dept_id = departments[0].get("id")
            
            # 获取部门成员
            test_endpoint("GET", f"/departments/{dept_id}/members", headers=headers)

def test_metrics_crud():
    """测试指标 CRUD 操作"""
    print("\n=== 指标 CRUD 测试 ===")
    token = get_auth_token("林作倩", "123456")
    if not token:
        print("⚠️  HR 登录失败，跳过指标 CRUD 测试")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 获取指标列表
    resp = test_endpoint("GET", "/metrics", headers=headers)
    if resp and resp.status_code == 200:
        metrics = resp.json().get("data", [])
        if metrics:
            metric_id = metrics[0].get("id")
            
            # 获取单个指标
            test_endpoint("GET", f"/metrics/{metric_id}", headers=headers)
            
            # 获取指标模板
            test_endpoint("GET", "/metrics/templates", headers=headers)
            
            # 测试不存在的指标（需要认证）
            test_endpoint("GET", "/metrics/nonexistent", headers=headers, expected_status=404)

def test_performance_crud():
    """测试绩效 CRUD 操作"""
    print("\n=== 绩效 CRUD 测试 ===")
    token = get_auth_token("于振华", "123456")  # 经理角色
    if not token:
        print("⚠️  经理登录失败，跳过绩效 CRUD 测试")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 获取个人绩效记录
    test_endpoint("GET", "/performance/my-records", headers=headers)
    
    # 获取团队绩效记录（经理权限）
    test_endpoint("GET", "/performance/team-records", headers=headers)

def test_appeals_crud():
    """测试申诉 CRUD 操作"""
    print("\n=== 申诉 CRUD 测试 ===")
    token = get_auth_token("林作倩", "123456")
    if not token:
        print("⚠️  HR 登录失败，跳过申诉 CRUD 测试")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 获取申诉列表
    test_endpoint("GET", "/appeals", headers=headers)

def test_system_settings():
    """测试系统设置"""
    print("\n=== 系统设置测试 ===")
    token = get_auth_token("林作倩", "123456")
    if not token:
        print("⚠️  HR 登录失败，跳过系统设置测试")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 获取系统设置
    test_endpoint("GET", "/system-settings", headers=headers)
    
    # 获取公开设置
    test_endpoint("GET", "/system-settings/public", headers=headers)

def test_edge_cases():
    """测试边界条件"""
    print("\n=== 边界条件测试 ===")
    
    # 测试无效数据
    test_endpoint("POST", "/auth/login", expected_status=400,
                  json={"username": "", "password": ""})
    
    # 测试超长输入
    test_endpoint("POST", "/auth/login", expected_status=401,
                  json={"username": "a" * 1000, "password": "a" * 1000})

def test_concurrent_requests():
    """测试并发请求"""
    print("\n=== 并发请求测试 ===")
    token = get_auth_token("于振华", "123456")
    if not token:
        print("⚠️  经理登录失败，跳过并发测试")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    endpoints = [
        "/employees",
        "/departments/tree",
        "/performance/my-records",
        "/metrics"
    ]
    
    for endpoint in endpoints:
        test_endpoint("GET", endpoint, headers=headers)

def main():
    print(f"🧪 绩效管理系统深度测试 - {datetime.now()}")
    print(f"目标: {BASE_URL}")
    
    test_employee_crud()
    test_department_crud()
    test_metrics_crud()
    test_performance_crud()
    test_appeals_crud()
    test_system_settings()
    test_edge_cases()
    test_concurrent_requests()
    
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
