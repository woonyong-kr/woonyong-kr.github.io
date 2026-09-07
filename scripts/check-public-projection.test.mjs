import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { validatePublicProjection } from "./check-public-projection.mjs";

const CONFIG = `content_root: generated/public-content
input_owner: Obsidian Vault
write_policy: compiler-only
publish_policy: approved-documents-only
site_behavior: read-only-build-input
required_front_matter:
  - layout
  - title
  - nav_order
  - permalink
  - publication_state
  - projection_id
  - projection_sha256
privacy_prohibited:
  - obsidian-wikilink
  - local-file-path
  - private-source-link
  - source-session-id
`;
const SHA256 = "a".repeat(64);

async function fixture(document = "") {
  const root = await mkdtemp(resolve(tmpdir(), "wn-docs-projection-"));
  await mkdir(resolve(root, "config"));
  await mkdir(resolve(root, "generated/public-content"), { recursive: true });
  await writeFile(resolve(root, "config/public-projection.yml"), CONFIG, "utf8");
  if (document) {
    await writeFile(resolve(root, "generated/public-content/example.md"), document, "utf8");
  }
  return root;
}

async function withFixture(document, assertion) {
  const root = await fixture(document);
  try {
    await assertion(root);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

function publicDocument(body = "Public body.") {
  return `---
layout: default
title: Public example
nav_order: 1
permalink: /wiki/example/
publication_state: publish
projection_id: wiki/example
projection_sha256: ${SHA256}
---

${body}
`;
}

test("permits an empty projection while no document has been approved", async () => {
  await withFixture("", async (root) => {
    assert.deepEqual(await validatePublicProjection(root), {
      contentRoot: "generated/public-content",
      documents: 0
    });
  });
});

test("requires public projection metadata", async () => {
  await withFixture(publicDocument().replace("publication_state: publish\n", ""), async (root) => {
    await assert.rejects(
      validatePublicProjection(root),
      /missing required front matter: publication_state/u
    );
  });
});

test("permits explicit Korean search aliases for English keyword titles", async () => {
  const source = publicDocument().replace("title: Public example", "title: Heap\nsearch_terms: [힙]");
  await withFixture(source, async root => {
    assert.equal((await validatePublicProjection(root)).documents, 1);
  });
});

for (const terms of ['힙', '[null]', '[""]']) {
  test(`rejects malformed search terms ${terms}`, async () => {
    const source = publicDocument().replace("title: Public example", `title: Heap\nsearch_terms: ${terms}`);
    await withFixture(source, async root => {
      await assert.rejects(validatePublicProjection(root), /search_terms must be a list/u);
    });
  });
}

test("rejects Obsidian wikilinks", async () => {
  await withFixture(publicDocument("[[wiki/private/novel|private note]]"), async (root) => {
    await assert.rejects(validatePublicProjection(root), /prohibited Obsidian wikilink/u);
  });
});

for (const [name, change] of [
  ["quoted duplicate approval key", (text) => text.replace("publication_state: publish", 'publication_state: publish\n"publication_state": private')],
  ["private approval", (text) => text.replace("publication_state: publish", "publication_state: private")],
  ["non-string title", (text) => text.replace("title: Public example", "title: [Public, example]")],
  ["boolean navigation order", (text) => text.replace("nav_order: 1", "nav_order: true")],
  ["YAML alias", (text) => text.replace("title: Public example", "title: &name Public example\nparent: *name")],
  ["reserved permalink", (text) => text.replace("/wiki/example/", "/assets/example/")],
]) {
  test(`rejects ${name}`, async () => {
    await withFixture(change(publicDocument()), async (root) => {
      await assert.rejects(validatePublicProjection(root));
    });
  });
}

for (const filename of ["extra.html", "nested/README.md"]) {
  test(`rejects unchecked input ${filename}`, async () => {
    await withFixture(publicDocument(), async (root) => {
      await mkdir(resolve(root, "generated/public-content/nested"), { recursive: true });
      await writeFile(resolve(root, "generated/public-content", filename), "private material");
      await assert.rejects(validatePublicProjection(root));
    });
  });
}

test("rejects a symlink instead of silently skipping it", async () => {
  await withFixture(publicDocument(), async (root) => {
    await symlink("example.md", resolve(root, "generated/public-content/link.md"));
    await assert.rejects(validatePublicProjection(root));
  });
});

test("rejects two documents with the same public URL", async () => {
  await withFixture(publicDocument(), async (root) => {
    await writeFile(resolve(root, "generated/public-content/second.md"), publicDocument().replace("projection_id: wiki/example", "projection_id: wiki/second"));
    await assert.rejects(validatePublicProjection(root));
  });
});

test("rejects duplicate projection identity at different URLs", async () => {
  await withFixture(publicDocument(), async (root) => {
    await writeFile(resolve(root, "generated/public-content/second.md"), publicDocument().replace("/wiki/example/", "/wiki/second/"));
    await assert.rejects(validatePublicProjection(root));
  });
});
