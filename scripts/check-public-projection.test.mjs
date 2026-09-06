import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
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

test("rejects Obsidian-only and private source references", async () => {
  await withFixture(publicDocument("[[wiki/private/novel|private note]]"), async (root) => {
    await assert.rejects(validatePublicProjection(root), /prohibited Obsidian wikilink/u);
  });
});
