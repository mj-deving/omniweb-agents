import { createClient } from "../dist/index.js";

const client = createClient();
const result = await client.searchFeed({ asset: "BTC", category: "ANALYSIS", limit: 5 });

console.log(JSON.stringify({
  count: result.posts?.length ?? 0,
  first: result.posts?.[0]
    ? {
        author: result.posts[0].author,
        category: result.posts[0].payload?.cat,
        text: result.posts[0].payload?.text,
      }
    : null,
}, null, 2));
