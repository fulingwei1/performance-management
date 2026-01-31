#!/usr/bin/env python3
"""
从Excel导入员工数据到绩效管理系统
"""

import pandas as pd
import requests
import sys
import json

# API配置
BASE_URL = "http://localhost:3001"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
IMPORT_URL = f"{BASE_URL}/api/employees/import"

# 登录凭据（使用超级管理员账号）
USERNAME = "admin"
PASSWORD = "admin123"

def login():
    """登录获取token（使用HR角色）"""
    try:
        # 尝试使用管理员账号，但需要提供role参数
        # 根据后端代码，role必须是 employee, manager, gm, hr 之一
        response = requests.post(LOGIN_URL, json={
            "username": USERNAME,
            "password": PASSWORD,
            "role": "hr"  # 使用HR角色
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("data", {}).get("token") or data.get("token")
        else:
            print(f"登录失败: {response.text}")
            # 尝试其他角色
            for role in ["gm", "manager", "employee"]:
                response = requests.post(LOGIN_URL, json={
                    "username": USERNAME,
                    "password": PASSWORD,
                    "role": role
                })
                if response.status_code == 200:
                    data = response.json()
                    return data.get("data", {}).get("token") or data.get("token")
            return None
    except Exception as e:
        print(f"登录错误: {e}")
        return None

def read_excel(file_path):
    """读取Excel文件并转换数据格式"""
    try:
        df = pd.read_excel(file_path)
        print(f"读取到 {len(df)} 条记录")
        
        employees = []
        for idx, row in df.iterrows():
            # 跳过空行
            if pd.isna(row['姓名']):
                continue
                
            # 映射字段
            employee = {
                "name": str(row['姓名']).strip(),
                "department": str(row['一级部门']).strip() if pd.notna(row['一级部门']) else "",
                "subDepartment": str(row['二级部门']).strip() if pd.notna(row['二级部门']) else "",
                "role": "employee",  # 默认角色
                "level": map_level(row['级别']),
                "workStatus": map_work_status(row['在职离职状态']),
                "gender": map_gender(row['性别']),
                "isRegular": str(row['是否转正']).strip() == '是' if pd.notna(row['是否转正']) else False,
                "idCard": str(row['身份证号']).strip() if pd.notna(row['身份证号']) else None,
                "position": str(row['岗位']).strip() if pd.notna(row['岗位']) else None,
                "managerName": str(row['直接上级']).strip() if pd.notna(row['直接上级']) else None,
                "password": "123456"  # 默认密码
            }
            employees.append(employee)
        
        return employees
    except Exception as e:
        print(f"读取Excel错误: {e}")
        return None

def map_level(level):
    """映射级别"""
    if pd.isna(level):
        return "junior"
    level_str = str(level).strip()
    level_map = {
        "初级": "junior",
        "中级": "intermediate",
        "高级": "senior",
        "助理": "assistant",
        "待定": "junior"
    }
    for key, value in level_map.items():
        if key in level_str:
            return value
    return "junior"

def map_work_status(status):
    """映射在职状态"""
    if pd.isna(status):
        return "active"
    status_str = str(status).strip()
    if "离职" in status_str:
        return "inactive"
    elif "试用" in status_str:
        return "probation"
    elif "实习" in status_str:
        return "internship"
    else:
        return "active"

def map_gender(gender):
    """映射性别"""
    if pd.isna(gender):
        return None
    gender_str = str(gender).strip()
    return "male" if gender_str == "男" else "female" if gender_str == "女" else None

def import_employees(token, employees):
    """批量导入员工"""
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # 分批导入，每批50人
        batch_size = 50
        total = len(employees)
        success_count = 0
        
        for i in range(0, total, batch_size):
            batch = employees[i:i+batch_size]
            response = requests.post(
                IMPORT_URL,
                headers=headers,
                json={"employees": batch}
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    success_count += len(batch)
                    print(f"✓ 导入第 {i+1}-{min(i+batch_size, total)} 条记录成功")
                else:
                    print(f"✗ 导入第 {i+1}-{min(i+batch_size, total)} 条记录失败: {result.get('error')}")
            else:
                print(f"✗ 导入第 {i+1}-{min(i+batch_size, total)} 条记录失败: {response.text}")
        
        print(f"\n导入完成: 成功 {success_count}/{total}")
        return success_count == total
        
    except Exception as e:
        print(f"导入错误: {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("用法: python import_employees.py <excel文件路径>")
        print("示例: python import_employees.py /Users/flw/Desktop/ATE-人事档案系统.xlsx")
        return
    
    excel_file = sys.argv[1]
    
    # 1. 登录
    print("正在登录...")
    token = login()
    if not token:
        print("登录失败，请检查服务是否运行")
        return
    print("登录成功！\n")
    
    # 2. 读取Excel
    print(f"正在读取Excel文件: {excel_file}")
    employees = read_excel(excel_file)
    if not employees:
        print("读取Excel失败")
        return
    
    print(f"\n数据预览:")
    print(f"- 总人数: {len(employees)}")
    print(f"- 一级部门数: {len(set(e['department'] for e in employees))}")
    print(f"- 二级部门数: {len(set(e['subDepartment'] for e in employees if e['subDepartment']))}")
    
    # 显示部门分布
    from collections import Counter
    dept_counts = Counter(e['department'] for e in employees)
    print("\n部门分布:")
    for dept, count in dept_counts.most_common():
        print(f"  {dept}: {count}人")
    
    # 3. 确认导入
    confirm = input("\n确认导入以上数据? (y/n): ")
    if confirm.lower() != 'y':
        print("已取消导入")
        return
    
    # 4. 导入数据
    print("\n开始导入...")
    if import_employees(token, employees):
        print("\n✓ 导入完成！请刷新页面查看数据")
    else:
        print("\n✗ 导入过程中出现错误")

if __name__ == "__main__":
    main()
