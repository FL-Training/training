import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { RACINE } from "./_outils.mjs";

const workflowPath = join(RACINE, ".github/workflows/container.yml");
const workflowText = readFileSync(workflowPath, "utf8");
const workflow = yaml.load(workflowText);
const publishSteps = workflow.jobs.publish.steps;

function step(name) {
  const result = publishSteps.find((candidate) => candidate.name === name);
  assert.ok(result, `missing workflow step: ${name}`);
  return result;
}

test("Sveltia exposes one explicit batched publication event", () => {
  assert.deepEqual(workflow.on.repository_dispatch.types, ["sveltia-cms-publish"]);
});

test("a content publication rebuilds only from a signed production base", () => {
  const script = step("Resolve build context").run;
  assert.match(script, /verify-tag/);
  assert.match(script, /git archive "\$\{base_revision\}"/);
  assert.match(script, /rsync -a --delete "\$\{GITHUB_WORKSPACE\}\/contenu\//);
  assert.match(script, /public\/formations public\/cartes public\/journal\/vignettes/);
});

test("the deployment app token is repository-scoped and least-privileged", () => {
  const tokenStep = step("Create desired-state token");
  assert.equal(
    tokenStep.uses,
    "actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1",
  );
  assert.equal(tokenStep.with.owner, "FL-Training");
  assert.equal(tokenStep.with.repositories, "infrastructure-config");
  assert.equal(tokenStep.with["permission-actions"], "read");
  assert.equal(tokenStep.with["permission-contents"], "write");
  assert.equal(tokenStep.with["permission-pull-requests"], "write");
  assert.equal(
    Object.keys(tokenStep.with).some((key) => key.startsWith("permission-organization")),
    false,
  );
});

test("the published digest is sent to the desired-state repository", () => {
  const notifyStep = step("Notify desired-state repository");
  assert.equal(notifyStep.env.IMAGE_DIGEST, "${{ steps.build.outputs.digest }}");
  assert.equal(notifyStep.env.BASE_REVISION, "${{ steps.context.outputs.base_revision }}");
  assert.equal(notifyStep.env.BASE_TAG, "${{ steps.context.outputs.base_tag }}");
  assert.match(notifyStep.run, /pacivis-site-artifact-published/);
  assert.match(notifyStep.run, /repos\/FL-Training\/infrastructure-config\/dispatches/);
});

test("content publishes avoid the redundant runtime build but still scan the release", () => {
  const validateSteps = workflow.jobs.validate.steps;
  const validationBuild = validateSteps.find(
    (candidate) => candidate.name === "Build runtime image",
  );
  assert.equal(validationBuild.if, "github.event_name != 'repository_dispatch'");
  assert.equal(
    step("Scan content release image").if,
    "github.event_name == 'repository_dispatch'",
  );
});
