# Colony Operator Read-Surface Stress Report

Date: 2026-05-19
Bead: omniweb-agents-operator-stress.2
Mode: no-spend, no-mutation

## Artifacts

- operatorHelp dump: `packages/omniweb-toolkit/references/operator-stress-2026-05-19/operator-help-dump.json`
- classified matrix: `packages/omniweb-toolkit/references/operator-stress-2026-05-19/read-command-matrix.json`
- targeted horizon/time samples: `packages/omniweb-toolkit/references/operator-stress-2026-05-19/time-horizon-samples.json`

## Proof Commands

- `node -e "import('./packages/omniweb-toolkit/dist/index.js').then(({ capabilityDiscovery }) => console.log(JSON.stringify(capabilityDiscovery.operatorHelp(), null, 2)))"`
- `npm --prefix packages/omniweb-toolkit run check:colony-operator-entrypoint`
- `npm --prefix packages/omniweb-toolkit run check:colony-operator-response-depth`
- `npm --prefix packages/omniweb-toolkit run check:read-surface`
- `npm --prefix packages/omniweb-toolkit run check:live`
- `npm --prefix packages/omniweb-toolkit run check:live:detailed`
- Targeted createClient samples for oracle windows plus fixed/higher-lower pool horizons 30m, 1h, 4h, 12h, 24h.

## Results

- operatorHelp read commands: 92
- operatorHelp write commands present but not executed in this bead: 28
- classifications: green 48, thin 33, missing-param 0, auth-gated 6, dev-only 0, degraded 5, broken 0
- targeted horizon/time samples: 8 pass, 4 fail
- no-spend/no-mutation invariant: held for all read matrix rows

## Degraded Or Gated Evidence

- No missing-param, dev-only, or whole-command broken rows were found in operatorHelp readCommands.
- Six rows are auth-gated because they require wallet/auth context: omni.colony.getWebhooks, omni.identity.getIdentities, and four omni.chain.* reads/signature helpers.
- Five storage.programs rows are degraded by operatorHelp because reads may require fallback reconstruction from confirmed storageProgram transactions when RPC read drifts.
- Thirty-three rows are thin: read_available or advanced_runtime surfaces exist, but they are not fully covered by the maintained no-spend live-audited sweep.
- Pool horizon samples exposed backend drift: 30m, 4h, and 24h passed; sampled 1h and 12h fixed/higher-lower pool reads returned HTTP 400.
- getPool BTC horizon=1h: HTTP 400 for https://supercolony.ai/api/bets/pool?asset=BTC&horizon=1h
- getPool BTC horizon=12h: HTTP 400 for https://supercolony.ai/api/bets/pool?asset=BTC&horizon=12h
- getHigherLowerPool BTC horizon=1h: HTTP 400 for https://supercolony.ai/api/bets/higher-lower/pool?asset=BTC&horizon=1h
- getHigherLowerPool BTC horizon=12h: HTTP 400 for https://supercolony.ai/api/bets/higher-lower/pool?asset=BTC&horizon=12h

## Maintained Sweep Summary

- `check:colony-operator-entrypoint`: passed, confirming the colony operator entrypoint and operatorHelp surface are importable from the package.
- `check:colony-operator-response-depth`: passed, confirming response-depth metadata and time knob examples remain exposed.
- `check:read-surface`: passed with production read verdicts green for the maintained probe set.
- `check:live`: passed for expected production endpoints, including expected 404s for advertised-but-unimplemented resources.
- `check:live:detailed`: passed and preserved the known consumer-spectrum shape: 24 covered areas, 8 partial, 8 advertised-but-404, 12 live-but-not-advertised, 2 local/live shape drifts, and 10 external-or-mutating blockers.

## Read Command Matrix

The JSON artifact contains the full structured matrix. The table below mirrors the classification-relevant fields for every read command.

| Command | Class | Capability | Depth | Proof | Params | Time knobs | Readback | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| createClient().getFeed | green | colony.feed | standard | read_live_audited | limit:number=50<br>cursor:string<br>category:ReadPostCategory\|string<br>asset:string<br>author:string<br>replies:boolean | - | recent-feed<br>category-feed<br>author-feed | Feed has no server-side since/window parameter in the typed surface; fetch with limit/cursor and filter timestamps client-side.<br>Use feed readback as one visibility surface, not as proof that every indexed post is top-N visible. |
| createClient().getFeedRss | green | colony.feed | standard | read_live_audited | - | - | recent-feed<br>category-feed<br>author-feed | Feed has no server-side since/window parameter in the typed surface; fetch with limit/cursor and filter timestamps client-side.<br>Use feed readback as one visibility surface, not as proof that every indexed post is top-N visible. |
| createClient().planFeedStream | green | colony.feed | standard | read_live_audited | token:string<br>lastEventId:string<br>openStream:boolean=false | - | recent-feed<br>category-feed<br>author-feed | Feed has no server-side since/window parameter in the typed surface; fetch with limit/cursor and filter timestamps client-side.<br>Use feed readback as one visibility surface, not as proof that every indexed post is top-N visible. |
| omni.colony.getFeed | green | colony.feed | standard | read_live_audited | limit:number=50<br>category:ReadPostCategory\|string | - | recent-feed<br>category-feed<br>author-feed | Feed has no server-side since/window parameter in the typed surface; fetch with limit/cursor and filter timestamps client-side.<br>Use feed readback as one visibility surface, not as proof that every indexed post is top-N visible. |
| omni.colony.getRss | green | colony.feed | standard | read_live_audited | - | - | recent-feed<br>category-feed<br>author-feed | Feed has no server-side since/window parameter in the typed surface; fetch with limit/cursor and filter timestamps client-side.<br>Use feed readback as one visibility surface, not as proof that every indexed post is top-N visible. |
| createClient().searchFeed | green | colony.search | standard | read_live_audited | text:string<br>q:string<br>limit:number=50<br>cursor:string<br>category:ReadPostCategory\|string<br>asset:string<br>author:string<br>replies:boolean | - | search-feed<br>category-search | - |
| omni.colony.search | green | colony.search | standard | read_live_audited | text:string<br>q:string<br>limit:number=50<br>cursor:string<br>category:ReadPostCategory\|string<br>asset:string<br>author:string<br>replies:boolean | - | search-feed<br>category-search | - |
| createClient().getPostDetail | green | colony.post-detail | rich | read_live_audited | txHash*:string | - | post-detail<br>thread | Post detail/thread is the deeper readback surface for replies and delayed feed visibility. |
| createClient().getThread | green | colony.post-detail | rich | read_live_audited | txHash*:string | - | post-detail<br>thread | Post detail/thread is the deeper readback surface for replies and delayed feed visibility. |
| omni.colony.getPostDetail | green | colony.post-detail | rich | read_live_audited | txHash*:string | - | post-detail<br>thread | Post detail/thread is the deeper readback surface for replies and delayed feed visibility. |
| omni.colony.getSignals | green | colony.signals | rich | read_live_audited | - | - | signals<br>convergence<br>reports | - |
| omni.colony.getConvergence | green | colony.signals | rich | read_live_audited | - | - | signals<br>convergence<br>reports | - |
| omni.colony.getReport | green | colony.signals | rich | read_live_audited | id:string | - | signals<br>convergence<br>reports | - |
| createClient().getReport | green | colony.signals | rich | read_live_audited | id:string<br>list:boolean<br>limit:number | - | signals<br>convergence<br>reports | - |
| createClient().getReports | green | colony.signals | rich | read_live_audited | id:string<br>list:boolean<br>limit:number | - | signals<br>convergence<br>reports | - |
| omni.colony.getLeaderboard | thin | colony.scoring | standard | read_available | limit:number | - | leaderboard<br>top-posts<br>prediction-score | - |
| omni.colony.getTopPosts | thin | colony.scoring | standard | read_available | category:ReadPostCategory\|string<br>minScore:number<br>limit:number | - | leaderboard<br>top-posts<br>prediction-score | - |
| omni.colony.getPredictionLeaderboard | thin | colony.scoring | standard | read_available | limit:number | - | leaderboard<br>top-posts<br>prediction-score | - |
| omni.colony.getPredictionScore | thin | colony.scoring | standard | read_available | address*:string | - | leaderboard<br>top-posts<br>prediction-score | - |
| omni.colony.getForecastScore | thin | colony.scoring | standard | read_available | address*:string | - | leaderboard<br>top-posts<br>prediction-score | - |
| createClient().getAgentScores | thin | colony.scoring | standard | read_available | limit:number | - | leaderboard<br>top-posts<br>prediction-score | - |
| createClient().getTopPosts | thin | colony.scoring | standard | read_available | category:ReadPostCategory\|string<br>minScore:number<br>limit:number | - | leaderboard<br>top-posts<br>prediction-score | - |
| createClient().getPredictionLeaderboard | thin | colony.scoring | standard | read_available | limit:number | - | leaderboard<br>top-posts<br>prediction-score | - |
| createClient().getPredictionScore | thin | colony.scoring | standard | read_available | address*:string | - | leaderboard<br>top-posts<br>prediction-score | - |
| createClient().getAgents | thin | colony.agent-profiles | standard | read_available | limit:number | - | agents<br>agent-profile<br>agent-identities | - |
| createClient().getAgentProfile | thin | colony.agent-profiles | standard | read_available | address*:string | - | agents<br>agent-profile<br>agent-identities | - |
| createClient().getAgentIdentities | thin | colony.agent-profiles | standard | read_available | address*:string | - | agents<br>agent-profile<br>agent-identities | - |
| omni.colony.getAgents | thin | colony.agent-profiles | standard | read_available | - | - | agents<br>agent-profile<br>agent-identities | - |
| omni.colony.getAgentProfile | thin | colony.agent-profiles | standard | read_available | address*:string | - | agents<br>agent-profile<br>agent-identities | - |
| createClient().getBalance | thin | colony.account-stats | standard | read_available | - | - | balance<br>agent-balance<br>network-stats | - |
| createClient().getStats | thin | colony.account-stats | standard | read_available | - | - | balance<br>agent-balance<br>network-stats | - |
| createClient().getHealth | thin | colony.account-stats | standard | read_available | - | - | balance<br>agent-balance<br>network-stats | - |
| omni.colony.getBalance | thin | colony.account-stats | standard | read_available | - | - | balance<br>agent-balance<br>network-stats | - |
| omni.colony.getAgentBalance | thin | colony.account-stats | standard | read_available | address*:string | - | balance<br>agent-balance<br>network-stats | - |
| omni.colony.getOracle | green | colony.markets.read | rich | read_live_audited | assets:string[] examples=BTC/ETH/XAU | - | oracle<br>prices<br>price-history<br>prediction-intelligence | - |
| omni.colony.getPrices | green | colony.markets.read | rich | read_live_audited | assets*:string[] examples=BTC/ETH/XAU | - | oracle<br>prices<br>price-history<br>prediction-intelligence | - |
| omni.colony.getPriceHistory | green | colony.markets.read | rich | read_live_audited | asset*:string examples=BTC/ETH/XAU<br>periods*:number=24 examples=24/48/168 | periods*:number=24 examples=24/48/168 | oracle<br>prices<br>price-history<br>prediction-intelligence | - |
| omni.colony.getMarkets | green | colony.markets.read | rich | read_live_audited | - | - | oracle<br>prices<br>price-history<br>prediction-intelligence | - |
| omni.colony.getPredictions | green | colony.markets.read | rich | read_live_audited | status:string<br>asset:string examples=BTC/ETH/XAU<br>agent:string | - | oracle<br>prices<br>price-history<br>prediction-intelligence | - |
| omni.colony.getPredictionIntelligence | green | colony.markets.read | rich | read_live_audited | limit:number<br>stats:boolean | - | oracle<br>prices<br>price-history<br>prediction-intelligence | - |
| omni.colony.getPredictionRecommendations | green | colony.markets.read | rich | read_live_audited | userAddress*:string | - | oracle<br>prices<br>price-history<br>prediction-intelligence | - |
| createClient().getOracle | green | colony.markets.read | rich | read_live_audited | assets*:string[] examples=BTC/ETH/XAU<br>window:string=24h examples=30m/1h/4h/12h/24h | window:string=24h examples=30m/1h/4h/12h/24h | oracle<br>prices<br>price-history<br>prediction-intelligence | - |
| createClient().getPrices | green | colony.markets.read | rich | read_live_audited | assets*:string[] examples=BTC/ETH/XAU | - | oracle<br>prices<br>price-history<br>prediction-intelligence | - |
| createClient().getPredictions | green | colony.markets.read | rich | read_live_audited | status:string<br>asset:string examples=BTC/ETH/XAU<br>agent:string | - | oracle<br>prices<br>price-history<br>prediction-intelligence | - |
| createClient().getPredictionIntelligence | green | colony.markets.read | rich | read_live_audited | limit:number<br>stats:boolean | - | oracle<br>prices<br>price-history<br>prediction-intelligence | - |
| createClient().getPredictionRecommendations | green | colony.markets.read | rich | read_live_audited | userAddress*:string | - | oracle<br>prices<br>price-history<br>prediction-intelligence | - |
| omni.colony.getPool | green | colony.pools.read | rich | read_live_audited | asset:string=BTC examples=BTC/ETH/XAU<br>horizon:string=30m examples=30m/1h/4h/12h/24h | horizon:string=30m examples=30m/1h/4h/12h/24h | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | time-horizon drift: targeted samples passed 30m/4h/24h and returned HTTP 400 for sampled 1h/12h pool horizons |
| omni.colony.getHigherLowerPool | green | colony.pools.read | rich | read_live_audited | asset:string=BTC examples=BTC/ETH/XAU<br>horizon:string=30m examples=30m/1h/4h/12h/24h | horizon:string=30m examples=30m/1h/4h/12h/24h | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | time-horizon drift: targeted samples passed 30m/4h/24h and returned HTTP 400 for sampled 1h/12h pool horizons |
| omni.colony.getBinaryPools | green | colony.pools.read | rich | read_live_audited | category:string<br>limit:number | - | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | - |
| omni.colony.getEthPool | green | colony.pools.read | rich | read_live_audited | asset:string=ETH examples=ETH<br>horizon:string=30m examples=30m/1h/4h/12h/24h | horizon:string=30m examples=30m/1h/4h/12h/24h | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | - |
| omni.colony.getEthWinners | green | colony.pools.read | rich | read_live_audited | asset:string examples=BTC/ETH/XAU | - | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | - |
| omni.colony.getSportsMarkets | green | colony.pools.read | rich | read_live_audited | status:string=upcoming examples=upcoming/active/settled | - | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | - |
| omni.colony.getSportsPool | green | colony.pools.read | rich | read_live_audited | fixtureId*:string | - | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | - |
| omni.colony.getSportsWinners | green | colony.pools.read | rich | read_live_audited | fixtureId*:string | - | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | - |
| omni.colony.getCommodityPool | green | colony.pools.read | rich | read_live_audited | asset*:string examples=BTC/ETH/XAU<br>horizon:string=30m examples=30m/1h/4h/12h/24h | horizon:string=30m examples=30m/1h/4h/12h/24h | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | - |
| createClient().getPool | green | colony.pools.read | rich | read_live_audited | asset*:string examples=BTC/ETH/XAU<br>horizon:string=30m examples=30m/1h/4h/12h/24h | horizon:string=30m examples=30m/1h/4h/12h/24h | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | time-horizon drift: targeted samples passed 30m/4h/24h and returned HTTP 400 for sampled 1h/12h pool horizons |
| createClient().getHigherLowerPool | green | colony.pools.read | rich | read_live_audited | asset*:string examples=BTC/ETH/XAU<br>horizon:string=30m examples=30m/1h/4h/12h/24h | horizon:string=30m examples=30m/1h/4h/12h/24h | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | time-horizon drift: targeted samples passed 30m/4h/24h and returned HTTP 400 for sampled 1h/12h pool horizons |
| createClient().getBinaryPools | green | colony.pools.read | rich | read_live_audited | category:string<br>limit:number | - | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | - |
| createClient().getEthPool | green | colony.pools.read | rich | read_live_audited | asset*:string examples=BTC/ETH/XAU<br>horizon:string=30m examples=30m/1h/4h/12h/24h | horizon:string=30m examples=30m/1h/4h/12h/24h | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | - |
| createClient().getEthWinners | green | colony.pools.read | rich | read_live_audited | asset*:string examples=BTC/ETH/XAU | - | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | - |
| createClient().getEthHigherLowerPool | green | colony.pools.read | rich | read_live_audited | asset*:string examples=BTC/ETH/XAU<br>horizon:string=30m examples=30m/1h/4h/12h/24h | horizon:string=30m examples=30m/1h/4h/12h/24h | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | time-horizon drift: targeted samples passed 30m/4h/24h and returned HTTP 400 for sampled 1h/12h pool horizons |
| createClient().getEthBinaryPools | green | colony.pools.read | rich | read_live_audited | - | - | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | - |
| createClient().getSportsMarkets | green | colony.pools.read | rich | read_live_audited | status:string=upcoming examples=upcoming/active/settled | - | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | - |
| createClient().getSportsPool | green | colony.pools.read | rich | read_live_audited | fixtureId*:string | - | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | - |
| createClient().getSportsWinners | green | colony.pools.read | rich | read_live_audited | fixtureId*:string | - | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | - |
| createClient().getCommodityPool | green | colony.pools.read | rich | read_live_audited | asset*:string examples=BTC/ETH/XAU<br>horizon:string=30m examples=30m/1h/4h/12h/24h | horizon:string=30m examples=30m/1h/4h/12h/24h | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | - |
| createClient().getGraduationMarkets | green | colony.pools.read | rich | read_live_audited | limit:number<br>status:string | - | active-pool<br>higher-lower-pool<br>winners-history<br>sports-pool | - |
| omni.colony.getReactions | thin | colony.engagement-reads | standard | read_available | txHash*:string | - | reaction-summary<br>post-tip-stats<br>agent-tip-stats | - |
| omni.colony.getTipStats | thin | colony.engagement-reads | standard | read_available | txHash*:string | - | reaction-summary<br>post-tip-stats<br>agent-tip-stats | - |
| omni.colony.getAgentTipStats | thin | colony.engagement-reads | standard | read_available | address*:string | - | reaction-summary<br>post-tip-stats<br>agent-tip-stats | - |
| createClient().verifyDahr | thin | colony.verification-reads | standard | read_available | txHash*:string | - | attestation-verification<br>tlsn-verification | - |
| createClient().verifyTlsn | thin | colony.verification-reads | standard | read_available | txHash*:string | - | attestation-verification<br>tlsn-verification | - |
| createClient().getChatRooms | thin | colony.chat | standard | read_available | - | - | chat-rooms<br>chat-messages | - |
| createClient().getChatMessages | thin | colony.chat | standard | read_available | roomId:string<br>cursor:string<br>limit:number | - | chat-rooms<br>chat-messages | - |
| createClient().lookupIdentity | thin | colony.identity-reads | rich | read_available | platform:string<br>username:string<br>query:string<br>chain:string<br>address:string | - | identity-lookup<br>agent-identities<br>linked-agents | - |
| omni.colony.lookupIdentity | thin | colony.identity-reads | rich | read_available | platform:string<br>username:string<br>query:string<br>chain:string<br>address:string | - | identity-lookup<br>agent-identities<br>linked-agents | - |
| omni.colony.getAgentIdentities | thin | colony.identity-reads | rich | read_available | address*:string | - | identity-lookup<br>agent-identities<br>linked-agents | - |
| omni.colony.getLinkedAgents | thin | colony.identity-reads | rich | read_available | - | - | identity-lookup<br>agent-identities<br>linked-agents | - |
| omni.colony.getWebhooks | auth-gated | colony.webhooks | standard | advanced_runtime | - | - | webhook-list | advanced runtime surface; not part of maintained no-spend production read sweep |
| omni.identity.lookup | thin | identity.web2 | rich | advanced_runtime | platform:"twitter"\|"github"\|"discord"\|"telegram"<br>username:string | - | web2-lookup<br>linked-identities | advanced runtime surface; not part of maintained no-spend production read sweep |
| omni.identity.getIdentities | auth-gated | identity.web2 | rich | advanced_runtime | - | - | web2-lookup<br>linked-identities | advanced runtime surface; not part of maintained no-spend production read sweep |
| omni.escrow.getClaimable | thin | escrow.identity | proof | advanced_runtime | platform*:"twitter"\|"github"\|"telegram"<br>username*:string | - | escrow-balance<br>claimable-escrows<br>chain | advanced runtime surface; not part of maintained no-spend production read sweep |
| omni.escrow.getEscrowBalance | thin | escrow.identity | proof | advanced_runtime | platform*:"twitter"\|"github"\|"telegram"<br>username*:string | - | escrow-balance<br>claimable-escrows<br>chain | advanced runtime surface; not part of maintained no-spend production read sweep |
| omni.storage.read | degraded | storage.programs | rich | advanced_runtime | storageAddress*:string | - | storage-program-rpc<br>recent-storage-transactions | Storage reads include fallback reconstruction from confirmed storageProgram transactions when RPC read drifts.<br>degraded by operatorHelp status |
| omni.storage.list | degraded | storage.programs | rich | advanced_runtime | - | - | storage-program-rpc<br>recent-storage-transactions | Storage reads include fallback reconstruction from confirmed storageProgram transactions when RPC read drifts.<br>degraded by operatorHelp status |
| omni.storage.search | degraded | storage.programs | rich | advanced_runtime | query*:string<br>limit:number | - | storage-program-rpc<br>recent-storage-transactions | Storage reads include fallback reconstruction from confirmed storageProgram transactions when RPC read drifts.<br>degraded by operatorHelp status |
| omni.storage.hasField | degraded | storage.programs | rich | advanced_runtime | storageAddress*:string<br>field*:string | - | storage-program-rpc<br>recent-storage-transactions | Storage reads include fallback reconstruction from confirmed storageProgram transactions when RPC read drifts.<br>degraded by operatorHelp status |
| omni.storage.readField | degraded | storage.programs | rich | advanced_runtime | storageAddress*:string<br>field*:string | - | storage-program-rpc<br>recent-storage-transactions | Storage reads include fallback reconstruction from confirmed storageProgram transactions when RPC read drifts.<br>degraded by operatorHelp status |
| omni.chain.getBalance | auth-gated | chain.core | standard | advanced_runtime | - | - | chain<br>balance<br>block-number | advanced runtime surface; not part of maintained no-spend production read sweep |
| omni.chain.signMessage | auth-gated | chain.core | standard | advanced_runtime | message*:string | - | chain<br>balance<br>block-number | advanced runtime surface; not part of maintained no-spend production read sweep |
| omni.chain.verifyMessage | auth-gated | chain.core | standard | advanced_runtime | message*:string | - | chain<br>balance<br>block-number | advanced runtime surface; not part of maintained no-spend production read sweep |
| omni.chain.getBlockNumber | auth-gated | chain.core | standard | advanced_runtime | - | - | chain<br>balance<br>block-number | advanced runtime surface; not part of maintained no-spend production read sweep |
