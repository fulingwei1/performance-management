import { EmployeeModel } from '../models/employee.model';
import { query, USE_MEMORY_DB, memoryDB } from './database';
import { syncDepartmentsFromEmployees } from './local-schema';
import bcrypt from 'bcryptjs';
import logger from './logger';
import { getRequiredInitialEmployeePassword } from '../utils/password';

let isInitialized = false;
const INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER = '__INITIAL_EMPLOYEE_TEMP_PASSWORD__';

function buildInitialEmployees() {
  const initialPassword = getRequiredInitialEmployeePassword();
  const mustChangePassword = process.env.NODE_ENV !== 'test';
  return initialEmployees.map((employee) => ({
    ...employee,
    password: initialPassword,
    mustChangePassword,
  }));
}

// 初始化员工数据 - 从 ATE-人事档案系统.xlsx 导入
const initialEmployees = [
  { id: 'e001', name: '姚洪', department: '营销中心', subDepartment: '销售部', role: 'employee' as const, level: 'junior' as const, managerId: 'm006', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e002', name: '叶桂锋', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e003', name: '管运志', department: '教育装备事业部', subDepartment: '', role: 'employee' as const, level: 'junior' as const, managerId: 'm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e004', name: '黄富', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e005', name: '姬中华', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e006', name: '黄鸿', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e007', name: '黄亦卓', department: '制造中心', subDepartment: '客服部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e008', name: '李亮', department: '制造中心', subDepartment: '品质部', role: 'employee' as const, level: 'junior' as const, managerId: 'm010', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e009', name: '卢灿杰', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e010', name: '唐辰雨', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'm001', name: '程修强', department: '教育装备事业部', subDepartment: '', role: 'manager' as const, level: 'senior' as const, managerId: 'm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e011', name: '王伟超', department: '工程技术中心', subDepartment: '技术开发部', role: 'employee' as const, level: 'junior' as const, managerId: 'm004', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e012', name: '刘佩锋', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e013', name: '劳忠桂', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e014', name: '冯万银', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e015', name: '刘志洪', department: '工程技术中心', subDepartment: '技术开发部', role: 'employee' as const, level: 'junior' as const, managerId: 'm004', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e016', name: '蒋开鹏', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e017', name: '谭志伟', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e018', name: '黄超', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e019', name: '陈云博', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e020', name: '黄亿豪', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e021', name: '钱颖萱', department: '营销中心', subDepartment: '商务部', role: 'employee' as const, level: 'junior' as const, managerId: 'm006', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e022', name: '黄佳根', department: '工程技术中心', subDepartment: '技术开发部', role: 'employee' as const, level: 'junior' as const, managerId: 'm004', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e023', name: '杨唐贤', department: '制造中心', subDepartment: '客服部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e024', name: '梁彪', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e025', name: '罗凯', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e026', name: '潘正井', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e027', name: '庄松滨', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e028', name: '谭丽俊', department: '营销中心', subDepartment: '销售部', role: 'employee' as const, level: 'junior' as const, managerId: 'm006', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e029', name: '佘秋炎', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e030', name: '张建卿', department: '工程技术中心', subDepartment: '技术开发部', role: 'employee' as const, level: 'junior' as const, managerId: 'm004', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e031', name: '肖英明', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e032', name: '罗畅', department: '工程技术中心', subDepartment: '售前技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm002', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e033', name: '田求发', department: '工程技术中心', subDepartment: '技术开发部', role: 'employee' as const, level: 'junior' as const, managerId: 'm004', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e034', name: '周欢欢', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e035', name: '方小虎', department: '教育装备事业部', subDepartment: '销售部', role: 'employee' as const, level: 'junior' as const, managerId: 'm006', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e036', name: '周璐', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e037', name: '周向敬', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e038', name: '林宇寰', department: '工程技术中心', subDepartment: '技术开发部', role: 'employee' as const, level: 'junior' as const, managerId: 'm004', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e039', name: '陈社海', department: '工程技术中心', subDepartment: '技术开发部', role: 'employee' as const, level: 'junior' as const, managerId: 'm004', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e040', name: '胡博勤', department: '制造中心', subDepartment: '客服部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e041', name: '袁强', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e042', name: '甘辉', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e043', name: '曾伟立', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e044', name: '陈泽顺', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e045', name: '房思琦', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e046', name: '李增欢', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e047', name: '梁建伟', department: '营销中心', subDepartment: '市场部', role: 'employee' as const, level: 'junior' as const, managerId: 'm006', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e048', name: '罗群旺', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e049', name: '欧阳钰洁', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e050', name: '丁盼', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e051', name: '廖伟梅', department: '营销中心', subDepartment: '商务部', role: 'employee' as const, level: 'junior' as const, managerId: 'm006', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e052', name: '席程', department: '工程技术中心', subDepartment: '技术开发部', role: 'employee' as const, level: 'junior' as const, managerId: 'm004', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e053', name: '高彦芳', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e054', name: '高军', department: '采购部', subDepartment: '采购组', role: 'employee' as const, level: 'junior' as const, managerId: undefined, password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e055', name: '覃安杰', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e056', name: '雷胜利', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e057', name: '黄光磊', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e058', name: '梁栋', department: '制造中心', subDepartment: '客服部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e059', name: '胡远来', department: '制造中心', subDepartment: '客服部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e060', name: '龙光传', department: '营销中心', subDepartment: '销售部', role: 'employee' as const, level: 'junior' as const, managerId: 'm006', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e061', name: '谢俊', department: '制造中心', subDepartment: '客服部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e062', name: '张桥', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e063', name: '刘伟', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e064', name: '杨明博', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e065', name: '蔡柯炳', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e066', name: '张浩', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'hr001', name: '林作倩', department: '人力行政部', subDepartment: '人事组', role: 'hr' as const, level: 'junior' as const, managerId: 'hr002', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e067', name: '潘自栖', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e068', name: '刘万成', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e069', name: '曾杰', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e070', name: '何永志', department: '工程技术中心', subDepartment: '技术开发部', role: 'employee' as const, level: 'junior' as const, managerId: 'm004', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e071', name: '洪国安', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e072', name: '张海波', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e073', name: '蒋美琳', department: '财务部', subDepartment: '会计组', role: 'employee' as const, level: 'junior' as const, managerId: undefined, password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'm002', name: '周定炫', department: '工程技术中心', subDepartment: '售前技术部', role: 'manager' as const, level: 'senior' as const, managerId: 'm002', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e074', name: '卢成桢', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e075', name: '罗伟军', department: '营销中心', subDepartment: '销售部', role: 'employee' as const, level: 'junior' as const, managerId: 'm006', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e076', name: '温日波', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'm003', name: '张丙波', department: '工程技术中心', subDepartment: '新能源技术部', role: 'manager' as const, level: 'senior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e077', name: '邱林涛', department: '营销中心', subDepartment: '销售部', role: 'employee' as const, level: 'junior' as const, managerId: 'm006', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e078', name: '崔长玉', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e079', name: '梁范聪', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e080', name: '李维', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e081', name: '刘亚强', department: '制造中心', subDepartment: '客服部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e082', name: '陈世江', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e083', name: '周星', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e084', name: '徐超', department: '制造中心', subDepartment: '客服部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e085', name: '蔡世河', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e086', name: '丘文华', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e087', name: '陈东洲', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e088', name: '符慰', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e089', name: '马伟伟', department: '工程技术中心', subDepartment: '售前技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm002', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e090', name: '李志文', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e091', name: '阳容', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e092', name: '朱文杰', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e093', name: '欧阳天华', department: '制造中心', subDepartment: '客服部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e094', name: '计建军', department: '项目管理部', subDepartment: 'PMC组', role: 'employee' as const, level: 'junior' as const, managerId: 'm007', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e095', name: '梁丕斌', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e096', name: '袁盛武', department: '制造中心', subDepartment: '客服部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e097', name: '廖云壮', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e098', name: '梁丽萍', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e099', name: '唐建安', department: '项目管理部', subDepartment: 'PMC组', role: 'employee' as const, level: 'junior' as const, managerId: 'm007', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e100', name: '张昌望', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e101', name: '刘钊玲', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e102', name: '唐乐兵', department: '制造中心', subDepartment: '客服部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e103', name: '王伟才', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e104', name: '尹杨飞', department: '营销中心', subDepartment: '销售部', role: 'employee' as const, level: 'junior' as const, managerId: 'm006', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e105', name: '李学伟', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e106', name: '林潇伟', department: '制造中心', subDepartment: '客服部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e107', name: '王玉梅', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e108', name: '向兰兰', department: '财务部', subDepartment: '出纳组', role: 'employee' as const, level: 'junior' as const, managerId: undefined, password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e109', name: '王子豪', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e110', name: '杜鹏', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e111', name: '马伟', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e112', name: '梁柱', department: '工程技术中心', subDepartment: '技术开发部', role: 'employee' as const, level: 'junior' as const, managerId: 'm004', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e113', name: '黄文华', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e114', name: '李方', department: '制造中心', subDepartment: '仓储部', role: 'employee' as const, level: 'junior' as const, managerId: 'm010', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e115', name: '廖美霞', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'm004', name: '黎佩锋', department: '工程技术中心', subDepartment: '技术开发部', role: 'manager' as const, level: 'senior' as const, managerId: 'm004', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e116', name: '张学松', department: '制造中心', subDepartment: '客服部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e117', name: '李琴', department: '财务部', subDepartment: '会计组', role: 'employee' as const, level: 'junior' as const, managerId: undefined, password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e118', name: '谢欢', department: '财务部', subDepartment: '会计组', role: 'employee' as const, level: 'junior' as const, managerId: undefined, password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e119', name: '代亚平', department: '采购部', subDepartment: '采购组', role: 'employee' as const, level: 'junior' as const, managerId: undefined, password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e120', name: '刘启勇', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'hr002', name: '符凌维', department: '人力行政部', subDepartment: '', role: 'admin' as const, level: 'junior' as const, managerId: undefined, password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e121', name: '卢俊宏', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e122', name: '陈思', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e123', name: '周志锐', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e124', name: '杨帮', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'm005', name: '王志红', department: '制造中心', subDepartment: '客服部', role: 'manager' as const, level: 'senior' as const, managerId: 'm010', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e125', name: '常雄', department: '项目管理部', subDepartment: 'PMC组', role: 'employee' as const, level: 'junior' as const, managerId: 'm007', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e126', name: '侬然科', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e127', name: '史昱东', department: '营销中心', subDepartment: '销售部', role: 'employee' as const, level: 'junior' as const, managerId: 'm006', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e128', name: '李磊', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e129', name: '林少育', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e130', name: '黄平', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e131', name: '唐孝日', department: '工程技术中心', subDepartment: '技术开发部', role: 'employee' as const, level: 'junior' as const, managerId: 'm004', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e132', name: '邱彬', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e133', name: '周念', department: '制造中心', subDepartment: '仓储部', role: 'employee' as const, level: 'junior' as const, managerId: 'm010', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'm006', name: '宋魁', department: '营销中心', subDepartment: '销售部', role: 'manager' as const, level: 'senior' as const, managerId: 'm006', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e134', name: '黄雷', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'm007', name: '陈亮', department: '项目管理部', subDepartment: '项目管理组', role: 'manager' as const, level: 'senior' as const, managerId: 'm007', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e135', name: '刘真', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e136', name: '陈昌冠', department: '工程技术中心', subDepartment: 'PLC 部', role: 'employee' as const, level: 'junior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e137', name: '张小川', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e138', name: '左天亮', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e139', name: '蔡小龙', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e140', name: '郑琴', department: '营销中心', subDepartment: '销售部', role: 'employee' as const, level: 'junior' as const, managerId: 'm006', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e141', name: '黄云华', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e142', name: '伍金明', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e143', name: '邓志斌', department: '营销中心', subDepartment: '销售部', role: 'employee' as const, level: 'junior' as const, managerId: 'm006', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e144', name: '王永锋', department: '工程技术中心', subDepartment: '新能源技术部', role: 'employee' as const, level: 'junior' as const, managerId: 'm003', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e145', name: '王琼瑶', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e146', name: '王静', department: '采购部', subDepartment: '采购组', role: 'employee' as const, level: 'junior' as const, managerId: undefined, password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'm008', name: '王俊', department: '工程技术中心', subDepartment: 'PLC 部', role: 'manager' as const, level: 'senior' as const, managerId: 'm008', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e147', name: '林海', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e148', name: '方康敬', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e149', name: '颜耀松', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e150', name: '邱钧海', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e151', name: '刘达红', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'm009', name: '高勇', department: '制造中心', subDepartment: '生产部', role: 'manager' as const, level: 'senior' as const, managerId: 'm010', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e152', name: '梁昭', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e153', name: '卢北凤', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'gm001', name: '郑汝才', department: '总经办', subDepartment: '', role: 'gm' as const, level: 'senior' as const, managerId: undefined, password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'm010', name: '骆奕兴', department: '总经办', subDepartment: '', role: 'manager' as const, level: 'senior' as const, managerId: undefined, password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'm011', name: '于振华', department: '工程技术中心', subDepartment: '测试部', role: 'manager' as const, level: 'senior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e154', name: '张志锋', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e155', name: '刘孙伟', department: '工程技术中心', subDepartment: '测试部', role: 'employee' as const, level: 'junior' as const, managerId: 'm011', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e156', name: '谭章斌', department: '项目管理部', subDepartment: '项目管理组', role: 'employee' as const, level: 'junior' as const, managerId: 'm007', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e157', name: '谢朝良', department: '制造中心', subDepartment: '生产部', role: 'employee' as const, level: 'junior' as const, managerId: 'gm001', password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
  { id: 'e158', name: '张小保', department: '人力行政部', subDepartment: '行政组', role: 'employee' as const, level: 'junior' as const, managerId: undefined, password: INITIAL_EMPLOYEE_PASSWORD_PLACEHOLDER },
];

// 初始化数据
export const initializeData = async (): Promise<void> => {
  if (isInitialized) {
    logger.info('✅ 数据已初始化，跳过');
    return;
  }

  try {
    logger.info('📝 开始初始化员工数据...');

    if (USE_MEMORY_DB) {
      const employeesToInitialize = buildInitialEmployees();
      // 内存数据库模式：也使用 bcrypt hash 存储密码
      const salt = bcrypt.genSaltSync(10);
      const hashedEmployees = employeesToInitialize.map(emp => ({
        ...emp,
        password: bcrypt.hashSync(emp.password, salt)
      }));

      for (const emp of hashedEmployees) {
        memoryDB.employees.create(emp as any);
      }

      // 验证数据
      const allEmployees = memoryDB.employees.findAll();
      logger.info(`  📊 内存数据库中共有 ${allEmployees.length} 名员工`);
    } else {
      const existing = await query('SELECT COUNT(*)::int AS count FROM employees');
      const existingCount = Number((existing as any[])[0]?.count || 0);
      if (existingCount > 0) {
        await syncDepartmentsFromEmployees();
        isInitialized = true;
        logger.info(`✅ 已存在 ${existingCount} 名员工，跳过演示员工初始化`);
        return;
      }

      const employeesToInitialize = buildInitialEmployees();
      // PostgreSQL 模式：使用 batchInsert 做幂等同步
      await EmployeeModel.batchInsert(employeesToInitialize);
      await syncDepartmentsFromEmployees();
    }

    isInitialized = true;
    logger.info(`✅ 成功初始化 ${initialEmployees.length} 名员工`);
  } catch (error) {
    logger.error(`❌ 初始化数据失败: ${error}`);
    throw error;
  }
};

// 总计: 171 名员工, 经理 11 人
