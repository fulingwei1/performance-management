import { memoryStore } from '../../config/database';
import {
  getPerformanceRankingConfig,
  savePerformanceRankingConfig,
  type PerformanceRankingConfigV1,
} from '../../services/performanceRankingConfig.service';

const includeWithoutTemplatesConfig: PerformanceRankingConfigV1 = {
  version: 1,
  participation: {
    mode: 'include',
    enabledUnitKeys: ['工程技术中心', '制造中心'],
    includedUnitKeys: ['工程技术中心', '制造中心'],
    excludedUnitKeys: [],
    includedEmployeeIds: [],
    excludedEmployeeIds: [],
  },
  groupRank: {
    defaultStrategy: { type: 'by_high_low' },
    perUnit: {},
  },
  templateAssignments: {},
  mergeRankGroups: [],
};

describe('performance ranking config', () => {
  beforeEach(() => {
    memoryStore.systemSettings = new Map();
  });

  it('allows HR to select assessment scope without forcing broad unit template overrides', async () => {
    await expect(savePerformanceRankingConfig(includeWithoutTemplatesConfig, 'hr001')).resolves.toMatchObject({
      participation: {
        mode: 'include',
        includedUnitKeys: ['工程技术中心', '制造中心'],
      },
      templateAssignments: {},
    });

    await expect(getPerformanceRankingConfig()).resolves.toMatchObject({
      participation: {
        mode: 'include',
        includedUnitKeys: ['工程技术中心', '制造中心'],
      },
      templateAssignments: {},
    });
  });
});
