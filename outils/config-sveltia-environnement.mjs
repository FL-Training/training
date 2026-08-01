/** Resolve and validate infrastructure-owned Sveltia build parameters. */
export function resoudreEnvironnementSveltia(environnement = process.env) {
  const branche = (environnement.SVELTIA_BRANCH ?? "main").trim();
  const clientOAuth = (environnement.SVELTIA_CLIENT_OAUTH ?? "").trim();

  if (
    branche.length === 0
    || branche.length > 255
    || !/^[A-Za-z0-9._/-]+$/.test(branche)
    || branche.startsWith("/")
    || branche.endsWith("/")
    || branche.includes("..")
    || branche.includes("//")
    || branche.endsWith(".lock")
  ) {
    throw new Error("SVELTIA_BRANCH n'est pas un nom de branche Git sûr");
  }

  if (clientOAuth) {
    let url;
    try {
      url = new URL(clientOAuth);
    } catch {
      throw new Error("SVELTIA_CLIENT_OAUTH doit être une URL HTTPS complète");
    }
    if (
      url.protocol !== "https:"
      || !url.hostname
      || url.username
      || url.password
      || url.search
      || url.hash
    ) {
      throw new Error("SVELTIA_CLIENT_OAUTH doit être une URL HTTPS sans identifiants, requête ni fragment");
    }
  }

  return { branche, clientOAuth };
}
