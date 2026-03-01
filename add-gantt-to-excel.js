const ExcelJS = require('./backend/node_modules/exceljs');

async function addGanttChart() {
  const workbook = new ExcelJS.Workbook();
  
  // 读取现有文件
  await workbook.xlsx.readFile('绩效系统Phase2-3项目计划.xlsx');
  
  // 添加甘特图工作表
  const ganttSheet = workbook.addWorksheet('甘特图');
  
  // 标题
  ganttSheet.mergeCells('A1:R1');
  ganttSheet.getCell('A1').value = 'Phase 2 & 3 甘特图';
  ganttSheet.getCell('A1').font = { size: 18, bold: true };
  ganttSheet.getCell('A1').alignment = { horizontal: 'center' };
  ganttSheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  
  // Phase 2 甘特图
  ganttSheet.getCell('A3').value = 'Phase 2: 高级功能（2026-03-03 ~ 2026-03-21）';
  ganttSheet.getCell('A3').font = { size: 14, bold: true };
  
  // 时间线表头
  const weeks = ['Week 1 (3.3-3.9)', 'Week 2 (3.10-3.16)', 'Week 3 (3.17-3.21)'];
  ganttSheet.getRow(4).values = ['任务', ...weeks];
  ganttSheet.getRow(4).font = { bold: true };
  ganttSheet.getRow(4).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  };
  
  // Phase 2 任务数据
  const phase2Tasks = [
    { task: '360度互评-数据库', week: 1, duration: 1 },
    { task: '360度互评-后端API', week: 1, duration: 1 },
    { task: '360度互评-前端', week: 1, duration: 2 },
    { task: '面谈记录', week: 1, duration: 2 },
    { task: 'Week1收尾', week: 1, duration: 1 },
    { task: '后端Model测试', week: 2, duration: 1 },
    { task: '后端Controller测试', week: 2, duration: 1 },
    { task: '前端组件测试', week: 2, duration: 1 },
    { task: 'CI/CD配置', week: 2, duration: 1 },
    { task: '性能优化', week: 2, duration: 1 },
    { task: '生产环境准备', week: 3, duration: 1 },
    { task: '部署验证', week: 3, duration: 1 },
    { task: '监控告警', week: 3, duration: 1 },
  ];
  
  let rowIndex = 5;
  phase2Tasks.forEach(item => {
    ganttSheet.getCell(`A${rowIndex}`).value = item.task;
    
    // 填充对应周的单元格
    const colIndex = item.week + 1; // B列是Week 1
    const cell = ganttSheet.getCell(rowIndex, colIndex);
    cell.value = '█'.repeat(item.duration * 3);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    cell.font = { color: { argb: 'FFFFFFFF' } };
    
    rowIndex++;
  });
  
  // Phase 3 甘特图
  ganttSheet.getCell(`A${rowIndex + 2}`).value = 'Phase 3: 智能化（2026-04-21 ~ 2026-06-13）';
  ganttSheet.getCell(`A${rowIndex + 2}`).font = { size: 14, bold: true };
  
  const phase3Weeks = ['W4-5', 'W6-7', 'W8-10', 'W11-15'];
  ganttSheet.getRow(rowIndex + 3).values = ['任务', ...phase3Weeks];
  ganttSheet.getRow(rowIndex + 3).font = { bold: true };
  ganttSheet.getRow(rowIndex + 3).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFF2CC' }
  };
  
  const phase3Tasks = [
    { task: 'AI评分建议', week: 1, duration: 2 },
    { task: '异常评分检测', week: 1, duration: 1.5 },
    { task: '绩效预测', week: 2, duration: 2 },
    { task: 'NLP生成', week: 2, duration: 1.5 },
    { task: '趋势可视化', week: 3, duration: 2 },
    { task: '部门对比', week: 3, duration: 2 },
    { task: '成长轨迹', week: 3, duration: 1.5 },
    { task: '健康度报告', week: 4, duration: 2 },
  ];
  
  rowIndex = rowIndex + 4;
  phase3Tasks.forEach(item => {
    ganttSheet.getCell(`A${rowIndex}`).value = item.task;
    
    const colIndex = item.week + 1;
    const cell = ganttSheet.getCell(rowIndex, colIndex);
    cell.value = '█'.repeat(Math.ceil(item.duration * 3));
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC000' }
    };
    cell.font = { color: { argb: 'FFFFFFFF' } };
    
    rowIndex++;
  });
  
  // 整体时间线
  ganttSheet.getCell(`A${rowIndex + 2}`).value = '整体时间线（Phase 1-3）';
  ganttSheet.getCell(`A${rowIndex + 2}`).font = { size: 14, bold: true };
  
  const months = ['2月底', '3月', '4月', '5月', '6月'];
  ganttSheet.getRow(rowIndex + 3).values = ['Phase', ...months];
  ganttSheet.getRow(rowIndex + 3).font = { bold: true };
  ganttSheet.getRow(rowIndex + 3).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2EFDA' }
  };
  
  rowIndex = rowIndex + 4;
  
  // Phase 1
  ganttSheet.getCell(`A${rowIndex}`).value = 'Phase 1';
  ganttSheet.getCell(`B${rowIndex}`).value = '███';
  ganttSheet.getCell(`B${rowIndex}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF90EE90' }
  };
  ganttSheet.getCell(`B${rowIndex}`).font = { color: { argb: 'FFFFFFFF' } };
  
  // Phase 2
  rowIndex++;
  ganttSheet.getCell(`A${rowIndex}`).value = 'Phase 2';
  ganttSheet.getCell(`C${rowIndex}`).value = '█████████';
  ganttSheet.getCell(`C${rowIndex}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  ganttSheet.getCell(`C${rowIndex}`).font = { color: { argb: 'FFFFFFFF' } };
  
  // Phase 3
  rowIndex++;
  ganttSheet.getCell(`A${rowIndex}`).value = 'Phase 3';
  ganttSheet.getCell(`D${rowIndex}`).value = '█████';
  ganttSheet.getCell(`D${rowIndex}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC000' }
  };
  ganttSheet.getCell(`D${rowIndex}`).font = { color: { argb: 'FFFFFFFF' } };
  
  ganttSheet.getCell(`E${rowIndex}`).value = '████████████████';
  ganttSheet.getCell(`E${rowIndex}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC000' }
  };
  ganttSheet.getCell(`E${rowIndex}`).font = { color: { argb: 'FFFFFFFF' } };
  
  ganttSheet.getCell(`F${rowIndex}`).value = '█████';
  ganttSheet.getCell(`F${rowIndex}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC000' }
  };
  ganttSheet.getCell(`F${rowIndex}`).font = { color: { argb: 'FFFFFFFF' } };
  
  // 里程碑
  rowIndex++;
  ganttSheet.getCell(`A${rowIndex}`).value = '里程碑';
  ganttSheet.getCell(`B${rowIndex}`).value = 'v1.0';
  ganttSheet.getCell(`B${rowIndex}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF6B6B' }
  };
  ganttSheet.getCell(`B${rowIndex}`).font = { color: { argb: 'FFFFFFFF' } };
  
  ganttSheet.getCell(`C${rowIndex}`).value = 'v1.1';
  ganttSheet.getCell(`C${rowIndex}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF6B6B' }
  };
  ganttSheet.getCell(`C${rowIndex}`).font = { color: { argb: 'FFFFFFFF' } };
  
  ganttSheet.getCell(`F${rowIndex}`).value = 'v2.0';
  ganttSheet.getCell(`F${rowIndex}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF6B6B' }
  };
  ganttSheet.getCell(`F${rowIndex}`).font = { color: { argb: 'FFFFFFFF' } };
  
  // 设置列宽
  ganttSheet.columns = [
    { width: 25 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 }
  ];
  
  // 添加图例说明
  rowIndex = rowIndex + 3;
  ganttSheet.getCell(`A${rowIndex}`).value = '图例说明：';
  ganttSheet.getCell(`A${rowIndex}`).font = { bold: true };
  
  rowIndex++;
  ganttSheet.getCell(`A${rowIndex}`).value = '█ = 1个工作日';
  
  rowIndex++;
  ganttSheet.getCell(`A${rowIndex}`).value = 'Phase 1（绿色）/ Phase 2（蓝色）/ Phase 3（橙色）/ 里程碑（红色）';
  
  // 保存文件
  await workbook.xlsx.writeFile('绩效系统Phase2-3项目计划.xlsx');
  console.log('✅ 甘特图已添加到Excel！');
}

addGanttChart().catch(console.error);
