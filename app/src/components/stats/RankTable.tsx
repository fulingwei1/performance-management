import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Trophy, Medal, Award, Users, BarChart3 } from 'lucide-react';
import type { PerformanceRecord } from '@/types';
import { ScoreDisplay } from '@/components/score/ScoreDisplay';
import { getLevelLabel, getLevelColor } from '@/lib/config';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface RankTableProps {
  records: PerformanceRecord[];
  title?: string;
  showDetails?: boolean;
  showGroupInfo?: boolean;
  isCrossDept?: boolean;
}

export function RankTable({ 
  records, 
  title, 
  showDetails = true, 
  showGroupInfo = false,
  isCrossDept = false
}: RankTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // 按总分排序
  const sortedRecords = [...records].sort((a, b) => b.totalScore - a.totalScore);
  
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-gray-500">{rank}</span>;
    }
  };
  
  const getGroupBadge = (groupType: 'high' | 'low') => {
    return groupType === 'high' 
      ? <Badge className="bg-purple-100 text-purple-700 text-xs">高分组</Badge>
      : <Badge className="bg-green-100 text-green-700 text-xs">低分组</Badge>;
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {title && (
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <Badge variant="outline" className="ml-2">
              {records.length}人
            </Badge>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="w-16 text-center">排名</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>部门</TableHead>
              {showGroupInfo && <TableHead>分组</TableHead>}
              <TableHead>级别</TableHead>
              <TableHead>考核月份</TableHead>
              <TableHead className="text-right">综合得分</TableHead>
              {isCrossDept && <TableHead className="text-center">跨部门排名</TableHead>}
              {showDetails && <TableHead className="w-16"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRecords.flatMap((record, index) => {
              const rank = index + 1;
              const isExpanded = expandedRow === record.id;
              const mainRow = (
                <TableRow
                  key={record.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      isExpanded && "bg-blue-50",
                      rank <= 3 && "bg-yellow-50/30"
                    )}
                    onClick={() => showDetails && setExpandedRow(isExpanded ? null : record.id)}
                  >
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        {getRankIcon(rank)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {record.employeeName}
                        {rank === 1 && (
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs">冠军</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{record.subDepartment}</TableCell>
                    {showGroupInfo && (
                      <TableCell>
                        {getGroupBadge(record.groupType)}
                      </TableCell>
                    )}
                    <TableCell>
                      <span 
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{ 
                          backgroundColor: `${getLevelColor(record.employeeLevel)}20`,
                          color: getLevelColor(record.employeeLevel)
                        }}
                      >
                        {getLevelLabel(record.employeeLevel)}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">{record.month}</TableCell>
                    <TableCell className="text-right">
                      <ScoreDisplay score={record.totalScore} showLabel={false} size="sm" />
                    </TableCell>
                    {isCrossDept && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{record.crossDeptRank}</span>
                        </div>
                      </TableCell>
                    )}
                    {showDetails && (
                      <TableCell>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </motion.div>
                      </TableCell>
                    )}
                  </TableRow>
              );
              const detailRow =
                isExpanded && showDetails ? (
                  <TableRow key={`${record.id}-detail`} className="bg-blue-50/50">
                    <TableCell colSpan={showGroupInfo ? 9 : 8} className="p-0">
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-3">各维度得分详情</h4>
                            <div className="space-y-3">
                              <ScoreBar
                                label="任务完成情况"
                                score={record.taskCompletion}
                                weight={40}
                                color="bg-blue-500"
                              />
                              <ScoreBar
                                label="主动性态度"
                                score={record.initiative}
                                weight={30}
                                color="bg-green-500"
                              />
                              <ScoreBar
                                label="项目反馈"
                                score={record.projectFeedback}
                                weight={20}
                                color="bg-purple-500"
                              />
                              <ScoreBar
                                label="质量改进"
                                score={record.qualityImprovement}
                                weight={10}
                                color="bg-orange-500"
                              />
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-2">经理评价</h4>
                              <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border">
                                {record.managerComment}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-2">下月安排</h4>
                              <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border">
                                {record.nextMonthWorkArrangement}
                              </p>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-white rounded-lg p-3 border text-center">
                                <p className="text-xs text-gray-500">部门排名</p>
                                <p className="text-lg font-bold text-blue-600">{record.departmentRank}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border text-center">
                                <p className="text-xs text-gray-500">组内排名</p>
                                <p className="text-lg font-bold text-purple-600">{record.groupRank}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border text-center">
                                <p className="text-xs text-gray-500">跨部门排名</p>
                                <p className="text-lg font-bold text-green-600">{record.crossDeptRank || '-'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </TableCell>
                  </TableRow>
                ) : null;
              return [mainRow, detailRow].filter(Boolean) as React.ReactNode[];
            })}
          </TableBody>
        </Table>
      </div>
      
      {sortedRecords.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">暂无排名数据</p>
        </div>
      )}
    </div>
  );
}

interface ScoreBarProps {
  label: string;
  score: number;
  weight: number;
  color: string;
}

function ScoreBar({ label, score, weight, color }: ScoreBarProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{weight}%</span>
          <span className="text-sm font-medium">{score.toFixed(2)}</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${(score / 1.5) * 100}%` }}
        />
      </div>
    </div>
  );
}
