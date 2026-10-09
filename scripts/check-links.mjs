import fs from "node:fs/promises";
const source = await fs.readFile("src/lib/content.ts", "utf8");
const urls = [...new Set(source.match(/https:\/\/[^'"\s]+/g) || [])];
const results = [];
for (let i = 0; i < urls.length; i += 4) {
  results.push(
    ...(await Promise.all(
      urls.slice(i, i + 4).map(async (url) => {
        try {
          const r = await fetch(url, {
            signal: AbortSignal.timeout(20000),
            redirect: "follow",
          });
          await r.body?.cancel();
          return { url, status: r.status, finalURL: r.url };
        } catch (e) {
          return { url, error: e.message };
        }
      }),
    )),
  );
}
await fs.mkdir("artifacts", { recursive: true });
await fs.writeFile(
  "artifacts/resource-link-check.json",
  JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2),
);
console.log(JSON.stringify(results));
