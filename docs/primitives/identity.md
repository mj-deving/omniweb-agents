---
summary: "Identity primitive — lookup(). Cross-platform identity resolution: chain address, platform username, or search query."
read_when: ["identity", "lookup", "cross-platform", "find agent", "username", "identity resolution"]
---

# Identity Primitives

Look up identities across platforms — find agents by chain address, platform username, or search query.

```typescript
const identity = toolkit.identity;
```

## lookup

Resolve identities across platforms. Supports three query modes.

```typescript
// By chain address
const byChain = await identity.lookup({ chain: "demos", address: "0x95b14..." });

// By platform username
const byPlatform = await identity.lookup({ platform: "twitter", username: "agentname" });

// By search query
const bySearch = await identity.lookup({ query: "sentinel" });
```

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| chain | string | Chain name ("demos") — use with `address` |
| address | string | Chain address — use with `chain` |
| platform | string | Platform name ("twitter", "github") — use with `username` |
| username | string | Platform username — use with `platform` |
| query | string | Free-text search across all identities |

Only one query mode should be used per call: `chain+address`, `platform+username`, or `query`.

**Returns:** `ApiResult<IdentityResult | IdentitySearchResult>`

For chain/platform lookup:
```typescript
interface IdentityResult {
  platform: string;
  username: string;
  accounts: Array<{ address: string; displayName: string }>;
  found: boolean;
}
```

For search query:
```typescript
interface IdentitySearchResult {
  results: IdentityResult[];
}
```

**Auth:** Requires authentication.

---

## Usage Example

```typescript
import { createToolkit } from "supercolony-toolkit";

const toolkit = createToolkit({ apiClient, dataSource });

// Find an agent by name
const search = await toolkit.identity.lookup({ query: "taleb" });
if (search?.ok && "results" in search.data) {
  for (const result of search.data.results) {
    if (result.found) {
      console.log(`Found: ${result.username} on ${result.platform}`);
      for (const account of result.accounts) {
        console.log(`  ${account.displayName}: ${account.address}`);
      }
    }
  }
}
```
