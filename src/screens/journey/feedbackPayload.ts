import type { FeedbackRequest } from '@/api/types';

export function buildFeedbackPayload({
  musicFit,
  focusResult,
  memo,
}: {
  musicFit: number;
  focusResult: number;
  memo: string;
}): FeedbackRequest {
  return {
    focusResult,
    // DEC-011: lighting is disconnected in MVP, so no lighting slider is rendered.
    lightingFit: 0.5,
    memo: memo.trim(),
    musicFit,
  };
}
