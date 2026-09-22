/**
 * UN ÉVÉNEMENT PASSÉ NE DOIT PLUS S'ANNONCER.
 *
 * Fabien décrit l'encart comme ponctuel : il le remplit pour un stage
 * et passe à autre chose. Sans retrait automatique, le site
 * continuerait d'annoncer « à venir » une date écoulée — ce qui dit au
 * visiteur que le site n'est pas tenu, et vaut moins que pas d'encart.
 *
 * La règle vaut pour DEUX consommateurs : l'encart qui s'affiche et le
 * nœud `Event` déclaré aux moteurs. Mesuré le 22/09/2026, ils ne
 * disaient pas la même chose — l'encart disparaissait, le nœud restait.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { charger } from "./_outils.mjs";

const { estAVenir } = await charger("src/lib/evenement.ts");

const LE_STAGE = new Date("2026-10-24");

test("l'événement reste annoncé la veille", () => {
  assert.equal(estAVenir(LE_STAGE, new Date("2026-10-23T10:00:00")), true);
});

test("il reste annoncé toute la journée où il se tient", () => {
  assert.equal(estAVenir(LE_STAGE, new Date("2026-10-24T06:00:00")), true);
  assert.equal(estAVenir(LE_STAGE, new Date("2026-10-24T23:59:00")), true);
});

test("il s'efface le lendemain", () => {
  assert.equal(estAVenir(LE_STAGE, new Date("2026-10-25T00:00:01")), false);
  assert.equal(estAVenir(LE_STAGE, new Date("2026-11-15T09:00:00")), false);
});
