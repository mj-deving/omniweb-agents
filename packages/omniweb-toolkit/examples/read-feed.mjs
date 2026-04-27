import { createClient } from "../dist/index.js";

const client = createClient();
const feed = await client.getFeed({ limit: 5 });

console.log(JSON.stringify({
  count: feed.posts?.length ?? 0,
  first: feed.posts?.[0]
    ? {
        author: feed.posts[0].author,
        category: feed.posts[0].payload?.cat,
        text: feed.posts[0].payload?.text,
      }
    : null,
}, null, 2));
