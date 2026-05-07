/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SatisfactionSurveyPanel } from '../SatisfactionSurvey';
import { satisfactionSurveyApi } from '@/services/api';

vi.mock('@/services/api', () => ({
  satisfactionSurveyApi: {
    getCurrent: vi.fn(),
    submitResponse: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const openSurveyPayload = {
  survey: {
    id: 'satisfaction-2026-H1',
    year: 2026,
    half: 1,
    period: '2026-H1',
    title: '2026上半年满意度调查',
    description: '半年满意度调查',
    status: 'open',
    startDate: '2026-07-01',
    endDate: '2026-07-07',
    questions: [
      { key: 'fairness', label: '绩效考核公平性' },
      { key: 'support', label: '资源支持满意度' },
    ],
  },
  myResponse: null,
};

describe('SatisfactionSurveyPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides itself in embedded mode when no semiannual survey is open', async () => {
    vi.mocked(satisfactionSurveyApi.getCurrent).mockResolvedValue({ success: true, data: null } as any);
    const onAvailabilityChange = vi.fn();

    const { container } = render(
      <SatisfactionSurveyPanel embedded hideWhenUnavailable onAvailabilityChange={onAvailabilityChange} />,
    );

    await waitFor(() => expect(onAvailabilityChange).toHaveBeenCalledWith(false));
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the open semiannual survey inline and submits answers', async () => {
    vi.mocked(satisfactionSurveyApi.getCurrent).mockResolvedValue({ success: true, data: openSurveyPayload } as any);
    vi.mocked(satisfactionSurveyApi.submitResponse).mockResolvedValue({ success: true } as any);
    const onAvailabilityChange = vi.fn();

    render(<SatisfactionSurveyPanel embedded hideWhenUnavailable onAvailabilityChange={onAvailabilityChange} />);

    expect(await screen.findByText(/2026上半年满意度调查/)).toBeInTheDocument();
    expect(onAvailabilityChange).toHaveBeenCalledWith(true);

    const fivePointButtons = screen.getAllByRole('button', { name: '5' });
    fireEvent.click(fivePointButtons[0]);
    fireEvent.click(fivePointButtons[1]);
    fireEvent.change(screen.getByPlaceholderText(/希望绩效反馈更及时/), {
      target: { value: '希望绩效规则更透明' },
    });
    fireEvent.click(screen.getByRole('button', { name: /提交调查/ }));

    await waitFor(() => expect(satisfactionSurveyApi.submitResponse).toHaveBeenCalledWith('satisfaction-2026-H1', {
      scores: { fairness: 5, support: 5 },
      comment: '希望绩效规则更透明',
      anonymous: true,
    }));
  });
});
