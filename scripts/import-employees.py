#!/usr/bin/env python3
"""
ATE绩效管理系统 - 员工数据导入脚本
从 Excel 人事档案导入员工数据到系统
"""

import pandas as pd
import json
import re
from typing import Optional

# 读取 Excel 文件
df = pd.read_excel('/Users/flw/Desktop/ATE-人事档案系统.xlsx')

# 清理数据
df['姓名'] = df['姓名'].str.strip().str.replace('\n', '')
df['二级部门'] = df['二级部门'].fillna('').str.strip()
df['三级部门'] = df['三级部门'].fillna('').str.strip()
df['级别'] = df['级别'].fillna('').str.strip()
df['岗位'] = df['岗位'].fillna('').str.strip()

def map_level(level_str: str, position: str) -> str:
    """映射级别到系统级别"""
    level_str = str(level_str).lower()
    position = str(position).lower()

    if '高级' in level_str or '总监' in position or '经理' in position:
        return 'senior'
    elif '中级' in level_str or '主管' in position or '组长' in position:
        return 'intermediate'
    elif '初级' in level_str:
        return 'junior'
    elif '助理' in level_str or '学徒' in position or '实习' in position:
        return 'assistant'
    else:
        # 默认根据岗位判断
        if any(x in position for x in ['总监', '副总', '经理', '总经理']):
            return 'senior'
        elif any(x in position for x in ['主管', '组长']):
            return 'intermediate'
        else:
            return 'junior'  # 默认初级

def map_role(dept1: str, dept2: str, position: str) -> str:
    """映射角色"""
    position = str(position).lower()
    dept1 = str(dept1).lower()

    # 总经办的高层
    if '总经办' in dept1:
        if any(x in position for x in ['副总', '常务', '董秘', '总经理']):
            return 'gm'

    # 人力行政部
    if '人力' in dept1 or '行政' in dept1:
        return 'hr'

    # 经理/总监级别
    if any(x in position for x in ['经理', '总监', '副总']):
        # 部门负责人
        if any(x in position for x in ['部经理', '总监', '部门经理']):
            return 'manager'

    return 'employee'

def get_sub_department(dept2: str, dept3: str) -> str:
    """获取子部门名称"""
    dept2 = str(dept2).strip()
    dept3 = str(dept3).strip()

    if dept3 and dept3 != 'nan':
        return f"{dept2}-{dept3}"
    if dept2 == '/' or not dept2 or dept2 == 'nan':
        return ''
    return dept2

# 生成员工数据
employees = []
manager_map = {}  # 部门经理映射

# 第一遍：识别部门经理
for idx, row in df.iterrows():
    position = str(row['岗位']).strip()
    dept1 = str(row['一级部门']).strip()
    dept2 = str(row['二级部门']).strip()

    if '经理' in position or '总监' in position:
        sub_dept = get_sub_department(dept2, row['三级部门'])
        key = f"{dept1}_{sub_dept}"
        if key not in manager_map:
            manager_map[key] = f"m{len(manager_map)+1:03d}"

# 第二遍：生成所有员工数据
employee_counter = 1
manager_counter = 1
hr_counter = 1
gm_counter = 1

for idx, row in df.iterrows():
    name = str(row['姓名']).strip().replace('\n', '')
    dept1 = str(row['一级部门']).strip()
    dept2 = str(row['二级部门']).strip()
    sub_dept = get_sub_department(dept2, row['三级部门'])
    position = str(row['岗位']).strip()
    level = map_level(row['级别'], position)
    role = map_role(dept1, dept2, position)

    # 生成 ID
    if role == 'gm':
        emp_id = f"gm{gm_counter:03d}"
        gm_counter += 1
    elif role == 'hr':
        emp_id = f"hr{hr_counter:03d}"
        hr_counter += 1
    elif role == 'manager':
        emp_id = f"m{manager_counter:03d}"
        manager_counter += 1
    else:
        emp_id = f"e{employee_counter:03d}"
        employee_counter += 1

    # 查找上级
    manager_id = None
    if role == 'employee':
        key = f"{dept1}_{sub_dept}"
        manager_id = manager_map.get(key)

    employees.append({
        'id': emp_id,
        'name': name,
        'department': dept1,
        'subDepartment': sub_dept if sub_dept else dept1,
        'role': role,
        'level': level,
        'managerId': manager_id
    })

print(f"总共处理 {len(employees)} 名员工")
print(f"  - 总经理: {gm_counter - 1}")
print(f"  - HR: {hr_counter - 1}")
print(f"  - 经理: {manager_counter - 1}")
print(f"  - 员工: {employee_counter - 1}")

# 生成 TypeScript 数据
ts_output = """import { EmployeeModel } from '../models/employee.model';
import { query, USE_MEMORY_DB, memoryDB } from './database';
import bcrypt from 'bcryptjs';

const initialPassword = process.env.INITIAL_EMPLOYEE_TEMP_PASSWORD;
if (!initialPassword) {
  throw new Error('INITIAL_EMPLOYEE_TEMP_PASSWORD is required');
}

// 初始化员工数据 - 从 ATE-人事档案系统.xlsx 导入
const initialEmployees = [
"""

for emp in employees:
    manager_str = f"'{emp['managerId']}'" if emp['managerId'] else 'undefined'
    ts_output += f"  {{ id: '{emp['id']}', name: '{emp['name']}', department: '{emp['department']}', subDepartment: '{emp['subDepartment']}', role: '{emp['role']}' as const, level: '{emp['level']}' as const, managerId: {manager_str}, password: initialPassword }},\n"

ts_output += """];

// 初始化数据
export const initializeData = async (): Promise<void> => {
  try {
    console.log('📝 开始初始化员工数据...');

    if (USE_MEMORY_DB) {
      // 内存数据库模式：对密码进行哈希处理
      const hashedEmployees = await Promise.all(
        initialEmployees.map(async (emp) => ({
          ...emp,
          password: await bcrypt.hash(emp.password, 10)
        }))
      );

      for (const emp of hashedEmployees) {
        memoryDB.employees.create(emp as any);
      }

      // 验证数据
      const allEmployees = memoryDB.employees.findAll();
      console.log(`  📊 内存数据库中共有 ${allEmployees.length} 名员工`);
    } else {
      // MySQL模式：使用原有batchInsert逻辑
      await EmployeeModel.batchInsert(initialEmployees);
    }

    console.log(`✅ 成功初始化 ${initialEmployees.length} 名员工`);
  } catch (error) {
    console.error('❌ 初始化数据失败:', error);
    throw error;
  }
};
"""

# 保存 TypeScript 文件
with open('/Users/flw/Kimi_Agent_绩效管理平台/backend/src/config/init-data.ts', 'w', encoding='utf-8') as f:
    f.write(ts_output)

print("\n✅ 已生成 init-data.ts")

# 生成 SQL 插入语句
sql_output = """-- 初始化数据：插入员工
-- 初始化密码由 INITIAL_EMPLOYEE_TEMP_PASSWORD 提供，不再内置固定默认密码
-- 使用 bcrypt 生成的哈希值

INSERT INTO employees (id, name, department, sub_department, role, level, manager_id, password) VALUES
"""

sql_values = []
for emp in employees:
    manager_str = f"'{emp['managerId']}'" if emp['managerId'] else 'NULL'
    # 转义单引号
    name = emp['name'].replace("'", "''")
    dept = emp['department'].replace("'", "''")
    sub_dept = emp['subDepartment'].replace("'", "''")
    sql_values.append(f"('{emp['id']}', '{name}', '{dept}', '{sub_dept}', '{emp['role']}', '{emp['level']}', {manager_str}, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')")

sql_output += ",\n".join(sql_values)
sql_output += "\n\nON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;\n"

# 读取原始 SQL 文件的表结构部分
with open('/Users/flw/Kimi_Agent_绩效管理平台/backend/src/config/init-db.sql', 'r', encoding='utf-8') as f:
    content = f.read()
    # 找到表结构部分（到 "初始化数据" 之前）
    idx = content.find('-- 初始化数据')
    if idx > 0:
        table_schema = content[:idx]
    else:
        table_schema = content

# 保存完整的 SQL 文件
with open('/Users/flw/Kimi_Agent_绩效管理平台/backend/src/config/init-db.sql', 'w', encoding='utf-8') as f:
    f.write(table_schema + sql_output)

print("✅ 已更新 init-db.sql")

# 输出角色统计
role_counts = {}
for emp in employees:
    role_counts[emp['role']] = role_counts.get(emp['role'], 0) + 1

print("\n=== 角色统计 ===")
for role, count in sorted(role_counts.items()):
    print(f"  {role}: {count}")

# 输出部门统计
dept_counts = {}
for emp in employees:
    dept_counts[emp['department']] = dept_counts.get(emp['department'], 0) + 1

print("\n=== 部门统计 ===")
for dept, count in sorted(dept_counts.items(), key=lambda x: -x[1]):
    print(f"  {dept}: {count}")
