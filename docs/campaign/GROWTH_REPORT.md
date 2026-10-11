# Follower report and development campaign

Evidence cutoff: 2026-10-11 18:23 UTC. Account: [@wpsygames](https://x.com/wpsygames). Repository: [Liquid Glass Kit](https://github.com/wpsydev/liquid-glass-kit).

The account has **1 follower**. That is a net +1 from the original launch observation of 0, but **0 gained since the targeted-networking baseline of 1**. GitHub has **1 star and 0 forks**. Neither the follower nor star is attributed to a particular action.

| Observation | Followers | Following | Stars | Forks |
| --- | ---: | ---: | ---: | ---: |
| Initial launch, Oct 10 ~15:11 UTC | 0 | Unavailable | 0 | 0 |
| Targeted networking baseline, Oct 11 10:46 UTC | 1 | 42 | Unavailable | Unavailable |
| Fresh observation, Oct 11 18:23 UTC | 1 | 44 | 1 | 0 |

These are sparse observations, not a continuous daily series. Do not calculate percentage growth from zero. The cumulative interaction ledger since launch contains **31 published replies to 29 developers: 28 new conversations and 3 follow-ups**. It records **35 verified outgoing likes**. Five distinct builders in the new-conversation cohort have an observed response, **5/28 = 17.9%**. This is incomplete response observation, not X's engagement rate, follower conversion or verified adoption. The earlier renderer discussion is excluded from this new-conversation response cohort.

The latest [Foxlight response](https://x.com/FoxlightAI/status/2109313895936446729) describes approval rechecking instance identity and reviewed intent at both restart phases. That is a useful engineering conversation; their cluster behavior was not independently tested. Other observed exchanges covered permission prompts, approval adapters, screenshot removal and privacy wording. Suggestions accepted into someone's backlog are not verified fixes. A builder examining the repo is not an install.

## What needs to change

The work has produced conversations but has not established follower growth. A causal explanation cannot be identified from this small dataset. The following diagnosis comes from a content and onboarding audit:

- The account needs a clearer recurring benefit: practical web-material engineering, not a sequence of version announcements.
- Broad AI networking subjects are often distant from the library's adoption decisions. Favor rendering, native controls, mobile interaction, motion, SSR, accessibility and integration problems.
- A beautiful demo leaves work between viewing and trying a first surface. A runnable download and copyable recipe shorten that path.
- Frequent preview releases make the account hard to follow as a coherent development story. Publish a meaningful change or lesson, with a release only when shipping warrants one.
- Public view counts are too small and observed at unequal ages to rank posts. They include author/repeat views, so they are not unique reach. [X view-count documentation](https://help.x.com/en/using-x/view-counts).

## Implemented changes

`/start/` adds floating navigation, an AI composer and a native dialog. Developers can select HTML, React or Vue, toggle opaque mode, copy the recipe, download a self-contained HTML file and copy an agent integration brief. Downloads contain the actual portable material CSS and MIT notice. The dialog and sample form use small host scripts; there is no assistant backend. Application state and real submissions remain host-owned. The page is linked from the homepage and README. No library runtime or root import was added.

`node scripts/campaign.mjs report` computes growth separately from activity and matches observed responses to original conversation IDs. Missing analytics remain null. `node scripts/campaign.mjs check` validates development briefs, lowercase openings, no final period/em dash, one destination, conservative length, duplicates and evidence metadata. It flags unsupported absolute claims and unscoped numerical speed claims. It is a structural checker, not an independent fact checker or automatic publisher; native readback and human-quality judgment still matter.

`development-posts.json` contains three concrete briefs: first surface, stable dock targets, and contrast/opaque mode. Each includes problem, change, limitation, next action, evidence and publication gate. The first is now [published and verified](https://x.com/wpsygames/status/2109352937592172905); the other two remain drafts. The first has 24/72-hour review timestamps, with outcome measurements still null. `growth-history.json` retains both baselines. The scheduled CSS recipe has been reconciled to its [actual published permalink](https://x.com/wpsygames/status/2109318105507983471). Other previously queued posts remain scheduled; they have not been silently rewritten or canceled.

## Editorial approach to test

Start with three useful original posts per week: one small recipe, one engineering decision and one verified change, bug or boundary. This is a starting experiment, not an algorithm rule or newly scheduled automation. Give each post a concrete trigger, actual implementation, working example and a clear limit. Use one next step: try the recipe, reproduce the bug or examine the code. Avoid repeated star/follow requests and engagement quotas.

For a 12-second video: 0–2 seconds show the problem and name the library; 2–8 seconds show the actual interaction and one code decision; 8–12 seconds show the result and one next step. Use legible phone-scale text and sound-off captions. Original upbeat music may support the film, but never carry essential information. X recommends short videos, early motion and captions in its **advertising** creative guidance; applying this to organic developer content is our hypothesis, not a promised reach increase. [X creative guidance](https://business.x.com/en/advertising/creative-best-practices).

Follow incoming conversations before starting new ones. Read the whole thread and try an app where possible. Provide a specific reproducible observation, question or reference. Share our library only when it solves the problem under discussion. Do not repeat feedback already given in the thread. No random timer disguising automation, follower exchange or mass following.

## Measurement and next decision

Record outcomes at comparable **24-hour and 72-hour post ages**. Keep follower observations, useful inbound replies, public views, profile visits, link clicks and verified integration examples separate. A follow is attributed to a post only if the actual analytics supports it. Native analytics availability has not been established; profile visits, link clicks, unique reach, installs and post-attributed follows remain unavailable rather than zero. No visitor tracking was introduced.

At the seven-day review, compare similarly aged posts and identify questions that become documentation fixes or verified integrations. Repeat useful patterns and discontinue repetitive announcements. Tiny samples do not justify claiming a winning format. If recipe posts produce questions but no adoption, investigate installation friction and compatibility before making more promotional films.

Follower growth is an outcome to measure, not something these changes can guarantee. The purpose of this update is to make following the account more useful and trying the library easier.

## Reproduce the report

Sources: `follower-growth.json`, `growth-history.json`, `engagement.json`, `posts.json`, and the reviewed `growth-report-snapshot.json`. All counts are public observations or verified publication receipts. The interactive report uses the same reviewed snapshot and keeps source inspection available.

```sh
node scripts/campaign.mjs report
node scripts/campaign.mjs check
npm run check
```

The published starter's browser checks and X receipt are recorded separately in `growth-update.json`. Unit tests do not establish physical iPhone compatibility or social outcomes.
