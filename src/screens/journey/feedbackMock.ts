import type { FeedbackRequest, FeedbackResponse } from '@/api/types';

export async function feedbackMock(
  sessionId: string,
  body: FeedbackRequest,
): Promise<FeedbackResponse> {
  // TODO FE-XX: replace feedbackMock with noosApi.sessions.feedback(id, body) (POST /api/mobile/sessions/{id}/feedback).
  void sessionId;
  void body;

  return {
    ok: true,
    savedAt: new Date().toISOString(),
  };
}
