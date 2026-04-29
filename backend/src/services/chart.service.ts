/**
 * SVG 图表生成服务
 * 用于月度绩效报告生成各类 SVG 图表
 * 纯 SVG 生成，无需 canvas/puppeteer
 */

import path from 'path';
import fs from 'fs';
import { getMonthlyStats } from './assessmentStats.service';
import { ProgressMonitorService } from './progressMonitor.service';
import { MonthlyAssessmentModel } from '../models/monthlyAssessment.model';
import logger from '../config/logger';

// 图表输出目录
const CHARTS_DIR = path.join(__dirname, '../../uploads/charts');

// 确保目录存在
if (!fs.existsSync(CHARTS_DIR)) {
  fs.mkdirSync(CHARTS_DIR, { recursive: true });
}

// =====================
// 主题配色 (金凯博自动化暗色主题)
// =====================
const THEME = {
  bg: '#1a1f2e',
  bgSecondary: '#242b3d',
  gridLine: '#2d3548',
  textPrimary: '#e8eaed',
  textSecondary: '#9aa0b0',
  textMuted: '#6b7280',
  accent: '#4f9cf7',       // 主色-蓝
  accentLight: '#6bb3ff',
  accentDark: '#3a7bd5',
  success: '#34d399',      // 绿
  warning: '#fbbf24',      // 黄
  danger: '#f87171',       // 红
  purple: '#a78bfa',       // 紫
  cyan: '#22d3ee',         // 青
  orange: '#fb923c',       // 橙
  pink: '#f472b6',         // 粉
  barColors: ['#4f9cf7', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee', '#fb923c', '#f472b6'],
  pieColors: ['#4f9cf7', '#34d399', '#fbbf24', '#a78bfa', '#f87171'],
};

// 辅助函数：escape XML 特殊字符
function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// =====================
// 柱状图 - 部门完成率
// =====================
export interface BarChartData {
  labels: string[];
  values: number[];
  title: string;
}

export interface ChartResult {
  svg: string;
  path: string;
}

export function generateBarChart(data: BarChartData): ChartResult {
  const { labels, values, title } = data;
  const count = labels.length;
  if (count === 0 || count !== values.length) {
    throw new Error('Bar chart: labels and values must have the same non-zero length');
  }

  const width = 700;
  const height = 420;
  const margin = { top: 60, right: 30, bottom: 80, left: 55 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;

  const maxVal = Math.max(...values, 1);
  const barW = Math.min(60, (chartW / count) * 0.6);
  const gap = chartW / count;

  // Y轴网格线
  const gridLines: string[] = [];
  const yLabels: string[] = [];
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const val = (maxVal / steps) * i;
    const y = margin.top + chartH - (val / maxVal) * chartH;
    gridLines.push(`<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="${THEME.gridLine}" stroke-width="1"/>`);
    yLabels.push(`<text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" fill="${THEME.textMuted}" font-size="11">${val.toFixed(0)}%</text>`);
  }

  // 柱状条
  const bars: string[] = [];
  const barLabels: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = margin.left + gap * i + (gap - barW) / 2;
    const barH = (values[i] / maxVal) * chartH;
    const y = margin.top + chartH - barH;
    const color = THEME.barColors[i % THEME.barColors.length];
    const radius = 4;

    bars.push(`
      <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="${radius}" ry="${radius}" fill="${color}" opacity="0.9">
        <title>${escapeXml(labels[i])}: ${values[i].toFixed(1)}%</title>
      </rect>
      <text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" fill="${THEME.textSecondary}" font-size="11">${values[i].toFixed(1)}%</text>`);

    // X轴标签（可能需要旋转）
    const label = labels[i].length > 6 ? `${labels[i].slice(0, 6)}..` : labels[i];
    barLabels.push(`<text x="${x + barW / 2}" y="${margin.top + chartH + 20}" text-anchor="middle" fill="${THEME.textSecondary}" font-size="10" transform="rotate(0, ${x + barW / 2}, ${margin.top + chartH + 20})">${escapeXml(label)}</text>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:${THEME.bg};font-family:'Segoe UI',system-ui,-apple-system,sans-serif">
  <rect width="${width}" height="${height}" rx="8" fill="${THEME.bg}"/>
  <!-- 标题 -->
  <text x="${width / 2}" y="32" text-anchor="middle" fill="${THEME.textPrimary}" font-size="16" font-weight="600">${escapeXml(title)}</text>
  <!-- 网格 -->
  ${gridLines.join('\n  ')}
  ${yLabels.join('\n  ')}
  <!-- 柱状图 -->
  ${bars.join('\n  ')}
  <!-- X轴标签 -->
  ${barLabels.join('\n  ')}
  <!-- 基线 -->
  <line x1="${margin.left}" y1="${margin.top + chartH}" x2="${width - margin.right}" y2="${margin.top + chartH}" stroke="${THEME.gridLine}" stroke-width="1"/>
  <!-- 底部装饰线 -->
  <rect x="0" y="${height - 3}" width="${width}" height="3" rx="0" fill="${THEME.accent}" opacity="0.6"/>
</svg>`;

  const filename = `bar-chart-${Date.now()}.svg`;
  const filePath = path.join(CHARTS_DIR, filename);
  fs.writeFileSync(filePath, svg, 'utf-8');

  return { svg, path: filePath };
}

// =====================
// 饼图/环形图 - 绩效等级分布
// =====================
export interface PieChartData {
  labels: string[];
  values: number[];
  title: string;
}

export function generatePieChart(data: PieChartData): ChartResult {
  const { labels, values, title } = data;
  if (labels.length === 0 || labels.length !== values.length) {
    throw new Error('Pie chart: labels and values must have the same non-zero length');
  }

  const width = 700;
  const height = 420;
  const cx = 260;
  const cy = height / 2;
  const outerR = 150;
  const innerR = 90; // 环形
  const total = values.reduce((s, v) => s + v, 0);

  // 扇形路径计算
  function describeArc(cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number): string {
    const startOuter = polarToCartesian(cx, cy, outerR, endAngle);
    const endOuter = polarToCartesian(cx, cy, outerR, startAngle);
    const startInner = polarToCartesian(cx, cy, innerR, endAngle);
    const endInner = polarToCartesian(cx, cy, innerR, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
      `L ${endInner.x} ${endInner.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 1 ${startInner.x} ${startInner.y}`,
      'Z'
    ].join(' ');
  }

  function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const slices: string[] = [];
  let currentAngle = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] === 0) continue;
    const sliceAngle = (values[i] / total) * 360;
    const d = describeArc(cx, cy, outerR, innerR, currentAngle, currentAngle + sliceAngle);
    const color = THEME.pieColors[i % THEME.pieColors.length];
    slices.push(`<path d="${d}" fill="${color}" opacity="0.9" stroke="${THEME.bg}" stroke-width="2">
      <title>${escapeXml(labels[i])}: ${values[i]}</title>
    </path>`);
    currentAngle += sliceAngle;
  }

  // 中心文字
  const centerText = `<text x="${cx}" y="${cy - 8}" text-anchor="middle" fill="${THEME.textMuted}" font-size="12">总计</text>
    <text x="${cx}" y="${cy + 18}" text-anchor="middle" fill="${THEME.textPrimary}" font-size="24" font-weight="700">${total}</text>`;

  // 图例 (右侧)
  const legendX = 460;
  const legendStartY = 120;
  const legendItemH = 36;
  const legendItems: string[] = [];
  for (let i = 0; i < labels.length; i++) {
    const y = legendStartY + i * legendItemH;
    const color = THEME.pieColors[i % THEME.pieColors.length];
    const pct = total > 0 ? ((values[i] / total) * 100).toFixed(1) : '0.0';
    legendItems.push(`
      <rect x="${legendX}" y="${y}" width="14" height="14" rx="3" fill="${color}"/>
      <text x="${legendX + 22}" y="${y + 12}" fill="${THEME.textPrimary}" font-size="13">${escapeXml(labels[i])}</text>
      <text x="${legendX + 180}" y="${y + 12}" text-anchor="end" fill="${THEME.textMuted}" font-size="12">${values[i]} (${pct}%)</text>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:${THEME.bg};font-family:'Segoe UI',system-ui,-apple-system,sans-serif">
  <rect width="${width}" height="${height}" rx="8" fill="${THEME.bg}"/>
  <!-- 标题 -->
  <text x="${width / 2}" y="32" text-anchor="middle" fill="${THEME.textPrimary}" font-size="16" font-weight="600">${escapeXml(title)}</text>
  <!-- 环形图 -->
  ${slices.join('\n  ')}
  ${centerText}
  <!-- 图例 -->
  ${legendItems.join('\n  ')}
  <rect x="0" y="${height - 3}" width="${width}" height="3" rx="0" fill="${THEME.accent}" opacity="0.6"/>
</svg>`;

  const filename = `pie-chart-${Date.now()}.svg`;
  const filePath = path.join(CHARTS_DIR, filename);
  fs.writeFileSync(filePath, svg, 'utf-8');

  return { svg, path: filePath };
}

// =====================
// 折线图 - 月度得分趋势
// =====================
export interface LineChartSeries {
  name: string;
  values: number[];
}

export interface LineChartData {
  labels: string[];
  series: LineChartSeries[];
  title: string;
}

export function generateLineChart(data: LineChartData): ChartResult {
  const { labels, series, title } = data;
  if (labels.length === 0) {
    throw new Error('Line chart: labels must not be empty');
  }
  if (series.length === 0) {
    throw new Error('Line chart: at least one series is required');
  }

  const width = 700;
  const height = 420;
  const margin = { top: 60, right: 30, bottom: 60, left: 55 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;

  // 计算全局值域
  const allValues = series.flatMap(s => s.values.filter(v => Number.isFinite(v)));
  const minVal = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 1;
  const range = maxVal - minVal || 1;
  const yMin = Math.max(0, minVal - range * 0.1);
  const yMax = maxVal + range * 0.1;

  const xStep = chartW / Math.max(labels.length - 1, 1);

  // Y轴网格
  const gridLines: string[] = [];
  const yLabels: string[] = [];
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const val = yMin + ((yMax - yMin) / steps) * i;
    const y = margin.top + chartH - ((val - yMin) / (yMax - yMin)) * chartH;
    gridLines.push(`<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="${THEME.gridLine}" stroke-width="1"/>`);
    yLabels.push(`<text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" fill="${THEME.textMuted}" font-size="11">${val.toFixed(2)}</text>`);
  }

  // X轴标签
  const xLabels: string[] = [];
  for (let i = 0; i < labels.length; i++) {
    const x = margin.left + xStep * i;
    const label = labels[i].length > 7 ? labels[i].slice(0, 7) : labels[i];
    xLabels.push(`<text x="${x}" y="${margin.top + chartH + 25}" text-anchor="middle" fill="${THEME.textSecondary}" font-size="11">${escapeXml(label)}</text>`);
  }

  // 线条和点
  const lineColors = [THEME.accent, THEME.success, THEME.warning, THEME.purple, THEME.cyan, THEME.orange];
  const lines: string[] = [];

  for (let s = 0; s < series.length; s++) {
    const color = lineColors[s % lineColors.length];
    const points: string[] = [];
    const dots: string[] = [];

    for (let i = 0; i < series[s].values.length; i++) {
      const x = margin.left + xStep * i;
      const val = series[s].values[i];
      const y = Number.isFinite(val)
        ? margin.top + chartH - ((val - yMin) / (yMax - yMin)) * chartH
        : 0;
      points.push(`${x},${y}`);
      if (Number.isFinite(val)) {
        dots.push(`<circle cx="${x}" cy="${y}" r="4" fill="${THEME.bg}" stroke="${color}" stroke-width="2">
          <title>${escapeXml(series[s].name)} ${escapeXml(labels[i])}: ${val}</title>
        </circle>`);
      }
    }

    if (points.length > 1) {
      lines.push(`<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`);
    }
    lines.push(...dots);
  }

  // 图例
  const legendItems: string[] = [];
  const legendY = margin.top + 5;
  let legendX = margin.left;
  for (let s = 0; s < series.length; s++) {
    const color = lineColors[s % lineColors.length];
    legendItems.push(`
      <rect x="${legendX}" y="${legendY}" width="20" height="4" rx="2" fill="${color}"/>
      <text x="${legendX + 26}" y="${legendY + 5}" fill="${THEME.textSecondary}" font-size="11">${escapeXml(series[s].name)}</text>`);
    legendX += series[s].name.length * 8 + 50;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:${THEME.bg};font-family:'Segoe UI',system-ui,-apple-system,sans-serif">
  <rect width="${width}" height="${height}" rx="8" fill="${THEME.bg}"/>
  <!-- 标题 -->
  <text x="${width / 2}" y="32" text-anchor="middle" fill="${THEME.textPrimary}" font-size="16" font-weight="600">${escapeXml(title)}</text>
  <!-- 图例 -->
  ${legendItems.join('\n  ')}
  <!-- 网格 -->
  ${gridLines.join('\n  ')}
  ${yLabels.join('\n  ')}
  <!-- 线条 -->
  ${lines.join('\n  ')}
  <!-- X轴标签 -->
  ${xLabels.join('\n  ')}
  <!-- 基线 -->
  <line x1="${margin.left}" y1="${margin.top + chartH}" x2="${width - margin.right}" y2="${margin.top + chartH}" stroke="${THEME.gridLine}" stroke-width="1"/>
  <rect x="0" y="${height - 3}" width="${width}" height="3" rx="0" fill="${THEME.accent}" opacity="0.6"/>
</svg>`;

  const filename = `line-chart-${Date.now()}.svg`;
  const filePath = path.join(CHARTS_DIR, filename);
  fs.writeFileSync(filePath, svg, 'utf-8');

  return { svg, path: filePath };
}

// =====================
// 水平条形图 - 最佳/最差表现
// =====================
export function generateHorizontalBarChart(data: BarChartData): ChartResult {
  const { labels, values, title } = data;
  const count = labels.length;
  if (count === 0 || count !== values.length) {
    throw new Error('Horizontal bar chart: labels and values must have the same non-zero length');
  }

  const width = 700;
  const height = Math.max(300, 40 + count * 36 + 60);
  const margin = { top: 55, right: 60, bottom: 30, left: 130 };
  const chartW = width - margin.left - margin.right;
  const barH = Math.min(22, (height - margin.top - margin.bottom) / count * 0.65);
  const rowH = (height - margin.top - margin.bottom) / count;

  const maxVal = Math.max(...values.map(v => Math.abs(v)), 1);

  const bars: string[] = [];
  for (let i = 0; i < count; i++) {
    const y = margin.top + rowH * i + (rowH - barH) / 2;
    const barWidth = (values[i] / maxVal) * chartW;
    const isPositive = values[i] >= 0;
    const color = isPositive ? THEME.barColors[i % THEME.barColors.length] : THEME.danger;
    const x = isPositive ? margin.left : margin.left - barWidth;

    bars.push(`
      <text x="${margin.left - 10}" y="${y + barH / 2 + 4}" text-anchor="end" fill="${THEME.textSecondary}" font-size="11">${escapeXml(labels[i])}</text>
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="3" ry="3" fill="${color}" opacity="0.85">
        <title>${escapeXml(labels[i])}: ${values[i].toFixed(2)}</title>
      </rect>
      <text x="${x + barWidth + 6}" y="${y + barH / 2 + 4}" fill="${THEME.textMuted}" font-size="10">${values[i].toFixed(2)}</text>`);
  }

  // 中心线
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:${THEME.bg};font-family:'Segoe UI',system-ui,-apple-system,sans-serif">
  <rect width="${width}" height="${height}" rx="8" fill="${THEME.bg}"/>
  <!-- 标题 -->
  <text x="${width / 2}" y="30" text-anchor="middle" fill="${THEME.textPrimary}" font-size="16" font-weight="600">${escapeXml(title)}</text>
  <!-- 水平条 -->
  ${bars.join('\n  ')}
  <!-- 基线 -->
  <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="${THEME.gridLine}" stroke-width="1"/>
  <rect x="0" y="${height - 3}" width="${width}" height="3" rx="0" fill="${THEME.accent}" opacity="0.6"/>
</svg>`;

  const filename = `hbar-chart-${Date.now()}.svg`;
  const filePath = path.join(CHARTS_DIR, filename);
  fs.writeFileSync(filePath, svg, 'utf-8');

  return { svg, path: filePath };
}

// =====================
// 月度报告图表生成
// =====================
export async function generateMonthlyReportCharts(month: string): Promise<{ paths: string[]; summary: string }> {
  try {
    logger.info(`Generating monthly report charts for ${month}`);

    // 1. 获取月度统计
    const monthlyStats = await getMonthlyStats(month);
    // 2. 获取部门进度
    const progress = await ProgressMonitorService.getMonthProgress(month);

    const paths: string[] = [];

    // === 图表 1: 部门完成率 (Bar Chart) ===
    const deptLabels = progress.departmentProgress.map(d => d.department);
    const deptValues = progress.departmentProgress.map(d => d.rate);
    if (deptLabels.length > 0) {
      const result = generateBarChart({
        labels: deptLabels,
        values: deptValues,
        title: `部门完成率 - ${month} | 金凯博自动化`
      });
      paths.push(result.path);
    }

    // === 图表 2: 绩效等级分布 (Pie/Donut Chart) ===
    const levelLabels = ['L5 (优秀)', 'L4 (良好)', 'L3 (合格)', 'L2 (需改进)', 'L1 (不合格)'];
    const levelValues = [monthlyStats.l5Count, monthlyStats.l4Count, monthlyStats.l3Count, monthlyStats.l2Count, monthlyStats.l1Count];
    if (levelValues.some(v => v > 0)) {
      const result = generatePieChart({
        labels: levelLabels,
        values: levelValues,
        title: `绩效等级分布 - ${month} | 金凯博自动化`
      });
      paths.push(result.path);
    }

    // === 图表 3: 6个月得分趋势 (Line Chart) ===
    const trendResult = await generateTrendChart(month);
    if (trendResult) {
      paths.push(trendResult.path);
    }

    // === 图表 4: 最佳/最差表现者 (Horizontal Bar Chart) ===
    const hbarResult = await generateTopBottomChart(month);
    if (hbarResult) {
      paths.push(hbarResult.path);
    }

    // 生成摘要
    const total = monthlyStats.totalAssessments;
    const avg = monthlyStats.avgScore.toFixed(2);
    const l5Pct = total > 0 ? ((monthlyStats.l5Count / total) * 100).toFixed(1) : '0.0';
    const summary = `📊 ${month} 月度绩效报告摘要：\n` +
      `• 考核总数: ${total} 人\n` +
      `• 平均分: ${avg}\n` +
      `• 最高分: ${monthlyStats.maxScore.toFixed(2)}\n` +
      `• L5(优秀)占比: ${l5Pct}%\n` +
      `• 部门平均完成率: ${progress.participationRate}%\n` +
      `• 生成图表: ${paths.length} 张`;

    return { paths, summary };
  } catch (error) {
    logger.error('Failed to generate monthly report charts: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
}

/**
 * 生成6个月趋势折线图
 */
async function generateTrendChart(currentMonth: string): Promise<ChartResult | null> {
  try {
    // 解析当前月份，往前推6个月
    const [yearStr, monthStr] = currentMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const labels: string[] = [];
    const avgScores: number[] = [];
    const maxScores: number[] = [];

    for (let i = 5; i >= 0; i--) {
      let m = month - i;
      let y = year;
      if (m <= 0) { m += 12; y -= 1; }
      const label = `${y}-${String(m).padStart(2, '0')}`;
      labels.push(label);

      try {
        const stats = await getMonthlyStats(label);
        avgScores.push(stats.avgScore || 0);
        maxScores.push(stats.maxScore || 0);
      } catch {
        avgScores.push(0);
        maxScores.push(0);
      }
    }

    // 检查是否有数据
    if (avgScores.every(v => v === 0)) return null;

    return generateLineChart({
      labels,
      series: [
        { name: '平均分', values: avgScores },
        { name: '最高分', values: maxScores }
      ],
      title: `绩效得分趋势 (近6个月) | 金凯博自动化`
    });
  } catch (error) {
    logger.error('Failed to generate trend chart: ' + (error instanceof Error ? error.message : String(error)));
    return null;
  }
}

/**
 * 生成最佳/最差表现者水平条形图
 */
async function generateTopBottomChart(month: string): Promise<ChartResult | null> {
  try {
    const assessments = await MonthlyAssessmentModel.findByMonth(month);
    if (assessments.length === 0) return null;

    // 按分数排序
    const sorted = [...assessments].sort((a, b) => b.totalScore - a.totalScore);

    // 取 top 5 和 bottom 5
    const top = sorted.slice(0, Math.min(5, sorted.length));
    const bottom = sorted.slice(Math.max(0, sorted.length - 5)).reverse();

    const labels: string[] = [];
    const values: number[] = [];

    // Top performers
    for (const a of top) {
      labels.push(`🏆 ${a.employeeName || 'Unknown'}`);
      values.push(a.totalScore);
    }

    // Bottom performers
    for (const a of bottom) {
      labels.push(`📉 ${a.employeeName || 'Unknown'}`);
      values.push(a.totalScore);
    }

    if (labels.length === 0) return null;

    return generateHorizontalBarChart({
      labels,
      values,
      title: `最佳/最差表现者 - ${month} | 金凯博自动化`
    });
  } catch (error) {
    logger.error('Failed to generate top/bottom chart: ' + (error instanceof Error ? error.message : String(error)));
    return null;
  }
}
