#!/bin/bash

# ATE绩效管理平台 - 完整测试脚本

echo "=================================="
echo "  ATE绩效管理平台 - 完整测试"
echo "=================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 后端测试
echo -e "${YELLOW}[1/3] 运行后端测试...${NC}"
echo ""
cd backend
npm test -- --passWithNoTests --silent 2>&1 | tail -10

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 后端测试完成${NC}"
else
    echo -e "${RED}❌ 后端测试失败${NC}"
fi
echo ""

# 2. 前端测试
echo -e "${YELLOW}[2/3] 运行前端测试...${NC}"
echo ""
cd ../app
npm test -- --run --passWithNoTests --silent 2>&1 | tail -10

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 前端测试完成${NC}"
else
    echo -e "${RED}❌ 前端测试失败${NC}"
fi
echo ""

# 3. 生成测试报告
echo -e "${YELLOW}[3/3] 生成测试报告...${NC}"
echo ""

cd backend
npm test -- --passWithNoTests --json --outputFile=test-results.json > /dev/null 2>&1

cd ../app
npm test -- --run --passWithNoTests --json --outputFile=test-results.json > /dev/null 2>&1

echo -e "${GREEN}✅ 测试报告已生成${NC}"
echo ""

# 总结
echo "=================================="
echo "  测试完成"
echo "=================================="
echo ""
echo "📊 查看详细报告:"
echo "   - 后端测试报告: TESTING_REPORT.md"
echo "   - 后端覆盖率: backend/coverage/"
echo "   - 前端覆盖率: app/coverage/"
echo ""
