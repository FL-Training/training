import { test } from "node:test";
import assert from "node:assert/strict";
import { resoudreEnvironnementSveltia } from "../../outils/config-sveltia-environnement.mjs";

test("les paramètres Sveltia ont des valeurs reproductibles par défaut", () => {
  assert.deepEqual(resoudreEnvironnementSveltia({}), {
    branche: "main",
    clientOAuth: "",
  });
});

test("la branche de production et un endpoint OAuth HTTPS sont acceptés", () => {
  assert.deepEqual(
    resoudreEnvironnementSveltia({
      SVELTIA_BRANCH: "production",
      SVELTIA_CLIENT_OAUTH: "https://oauth.app.pacivisacademy.com",
    }),
    {
      branche: "production",
      clientOAuth: "https://oauth.app.pacivisacademy.com",
    },
  );
});

for (const branche of ["", "../main", "/main", "main/", "main//test", "main.lock", "main avec espace"]) {
  test(`la branche Sveltia dangereuse est refusée : ${JSON.stringify(branche)}`, () => {
    assert.throws(
      () => resoudreEnvironnementSveltia({ SVELTIA_BRANCH: branche }),
      /SVELTIA_BRANCH/,
    );
  });
}

for (const url of [
  "http://oauth.example.com",
  "oauth.example.com",
  "https://user:secret@oauth.example.com",
  "https://oauth.example.com?token=secret",
  "https://oauth.example.com/#fragment",
]) {
  test(`l'endpoint OAuth Sveltia non sûr est refusé : ${url}`, () => {
    assert.throws(
      () => resoudreEnvironnementSveltia({ SVELTIA_CLIENT_OAUTH: url }),
      /SVELTIA_CLIENT_OAUTH/,
    );
  });
}
