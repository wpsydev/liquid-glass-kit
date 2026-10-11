/** Local evidence review and post linting. No network, credentials or posting worker. */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function summarizeCampaign(engagement, history) {
  const replies = engagement.interactions.filter(x => x.reply?.status === 'published');
  const first = replies.filter(x => x.kind === 'new-conversation');
  const responded = new Set(engagement.observedResponses.map(x => x.author));
  const responding = new Set(first.filter(x => responded.has(x.author)).map(x => x.author));
  const observations = history.observations;
  const current = observations.at(-1);
  const baseline = observations.find(x => x.phase === 'targeted networking baseline');
  return {
    observedAtUtc: current.atUtc, followers: current.followers,
    netSinceLaunch: current.followers - observations[0].followers,
    netSinceNetworkingBaseline: current.followers - baseline.followers,
    stars: current.stars, forks: current.forks,
    replies: replies.length, developers: new Set(replies.map(x => x.author)).size,
    newConversations: first.length, followups: replies.length - first.length,
    respondingNewConversations: responding.size,
    observedResponseShare: first.length ? responding.size / first.length : null,
    analytics: history.missingAnalytics,
    caveat: 'Sparse public observations; response share is incomplete and is not follower conversion. No causal attribution.'
  };
}

export function lintPost(post, previous = []) {
  const errors = [], text = post.text?.trim() ?? '';
  if (!text || !/^[a-z]/.test(text)) errors.push('Start with a lowercase letter');
  if (/[.!]$/.test(text)) errors.push('Remove the final period or exclamation mark');
  if (text.includes('\u2014')) errors.push('Remove em dashes');
  const links = text.match(/https?:\/\/\S+/g) ?? [];
  // Conservative estimate; native X composer remains authoritative for Unicode weighting.
  if ([...text.replace(/https?:\/\/\S+/g, 'x'.repeat(23))].length > 270) errors.push('Shorten the post for the native 280-character composer');
  if (links.length > 1) errors.push('Use one destination');
  if (!post.problem || !post.change || !post.limitation || !post.nextAction) errors.push('Describe problem, change, limitation and one next action in the brief');
  if (!['recipe', 'engineering', 'reproduction', 'benchmark'].includes(post.kind)) errors.push('Choose a development content type');
  if (!post.evidence?.length || post.evidence.some(x => !x.source || !x.supports)) errors.push('Add evidence with source and the claim it supports');
  if (/guaranteed|go viral|pixel.identical|all phones|universal refraction/i.test(text)) errors.push('Remove unsupported absolute claims');
  if (/\d+\s*(?:%|fps|times faster|x faster)/i.test(text) && !post.evidence?.some(x => x.type === 'benchmark' && x.scope)) errors.push('A performance claim needs benchmark evidence and scope');
  const normalize = s => s.toLowerCase().replace(/https?:\/\/\S+/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  if (previous.some(x => normalize(x.text ?? '') === normalize(text))) errors.push('Duplicate post text');
  if (post.status === 'published' && (!post.publishedUrl || !post.verifiedAtUtc)) errors.push('Published posts need a permalink and readback time');
  return errors;
}

async function main() {
  const read = async name => JSON.parse(await readFile(new URL(`../docs/campaign/${name}.json`, import.meta.url), 'utf8'));
  const command = process.argv[2] ?? 'report';
  if (command === 'report') console.log(JSON.stringify(summarizeCampaign(await read('engagement'), await read('growth-history')), null, 2));
  else if (command === 'check') {
    const posts = await read('development-posts'), previous = await read('posts');
    let failed = false;
    for (const [index, post] of posts.entries()) {
      const errors = lintPost(post, [...previous, ...posts.slice(0, index)]);
      console.log(`${post.id}: ${errors.length ? errors.join('; ') : 'brief passed; native destination and media still need review'}`);
      failed ||= errors.length > 0;
    }
    if (failed) process.exitCode = 1;
  } else throw new Error('Use: node scripts/campaign.mjs report|check');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
