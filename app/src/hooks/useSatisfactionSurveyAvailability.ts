import { useEffect, useState } from 'react';
import { satisfactionSurveyApi, SatisfactionSurvey } from '@/services/api';

type CurrentSurveyPayload = {
  survey?: SatisfactionSurvey | null;
};

export function useSatisfactionSurveyAvailability() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    satisfactionSurveyApi.getCurrent()
      .then((response) => {
        if (cancelled) return;
        const payload = response.success ? response.data as CurrentSurveyPayload | null : null;
        setAvailable(payload?.survey?.status === 'open');
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return available;
}
