export function getRequiredInitialEmployeePassword(): string {
  const configured = (process.env.INITIAL_EMPLOYEE_TEMP_PASSWORD || '').trim();
  if (configured) return configured;

  // 单元测试保留固定口令，避免测试夹具大面积改动；生产/开发初始化必须显式配置。
  if (process.env.NODE_ENV === 'test') return '123456';

  throw new Error(
    '初始化员工数据前必须设置 INITIAL_EMPLOYEE_TEMP_PASSWORD；系统不再内置统一默认密码。'
  );
}
