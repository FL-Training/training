import { test } from "node:test";
import assert from "node:assert/strict";
import { charger } from "./_outils.mjs";

test("version endpoint exposes both runtime and content revisions", async () => {
  const endpoint = await charger("src/pages/version.json.ts", {
    "import.meta.env.PUBLIC_BUILD_ID": '"runtime-revision"',
    "import.meta.env.PUBLIC_CONTENT_REVISION": '"content-revision"',
  });

  const response = endpoint.GET();
  assert.deepEqual(await response.json(), {
    build: "runtime-revision",
    content: "content-revision",
  });
  assert.equal(response.headers.get("cache-control"), "no-store, must-revalidate");
});
