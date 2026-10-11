// @vitest-environment node
import { describe, expect, it } from 'vitest';
// @ts-expect-error The local campaign tool is intentionally plain Node ESM.
import { lintPost, summarizeCampaign } from '../scripts/campaign.mjs';

const brief = { text: 'glass without a runtime\nhttps://example.com/start/', kind: 'recipe', problem: 'Trial friction', change: 'Runnable HTML', limitation: 'CSS only', nextAction: 'Download', evidence: [{ source: 'site/start/main.ts', supports: 'HTML download' }] };
describe('campaign evidence', () => {
  it('keeps activity, response observation and growth separate', () => {
    const result = summarizeCampaign({ interactions: [
      { id: 'first-thread', kind: 'new-conversation', author: '@a', reply: { status: 'published' } },
      { kind: 'followup', author: '@a', reply: { status: 'published' } },
      { kind: 'new-conversation', author: '@b', reply: { status: 'draft' } }
    ], observedResponses: [{ author: '@a', conversationId: 'first-thread' }, { author: '@a', conversationId: 'first-thread' }, { author: '@b', conversationId: 'unpublished-thread' }] }, { observations: [
      { followers: 0 }, { phase: 'targeted networking baseline', followers: 1 }, { followers: 1, stars: 1, forks: 0 }
    ], missingAnalytics: { linkClicks: null } });
    expect(result).toMatchObject({ netSinceLaunch: 1, netSinceNetworkingBaseline: 0, replies: 2, newConversations: 1, followups: 1, respondingNewConversations: 1, analytics: { linkClicks: null } });
  });
  it('rejects duplicate copy and unsupported growth or performance claims', () => {
    expect(lintPost(brief)).toEqual([]);
    expect(lintPost(brief, [brief])).toContain('Duplicate post text');
    expect(lintPost({ ...brief, text: 'guaranteed to go viral at 120 fps' })).toHaveLength(2);
    expect(lintPost({ ...brief, text: 'Glass\u2014fast.' })).toHaveLength(3);
  });
  it('requires evidence and readback before a published receipt', () => {
    expect(lintPost({ ...brief, evidence: [], status: 'published' })).toHaveLength(2);
  });
});
