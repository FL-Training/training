# syntax=docker/dockerfile:1.7

# Remontée le 22/09/2026 depuis 24.18.0 : son Debian portait
# libpcre2-8-0 10.42-1, visé par trois avis d'exécution de code
# (CVE-2026-86145, -89157, -89161) que le scan de l'image refuse.
# Vérifié dans l'image : 24.18.0 livre 10.42-1, 24.21.0 livre
# 10.42-1+deb12u1, la version corrigée.
ARG NODE_IMAGE=node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6

FROM ${NODE_IMAGE} AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM dependencies AS build
ARG PUBLIC_SITE_URL=https://site.app.pacivisacademy.com
ARG PUBLIC_CONVEX_URL=
ARG PUBLIC_BUILD_ID=local
ARG PUBLIC_CONTENT_REVISION=local
ARG SVELTIA_BRANCH=main
ARG SVELTIA_CLIENT_OAUTH=
ENV DEPLOY_TARGET=dokploy \
    PUBLIC_SITE_URL=${PUBLIC_SITE_URL} \
    PUBLIC_CONVEX_URL=${PUBLIC_CONVEX_URL} \
    PUBLIC_BUILD_ID=${PUBLIC_BUILD_ID} \
    PUBLIC_CONTENT_REVISION=${PUBLIC_CONTENT_REVISION} \
    SVELTIA_BRANCH=${SVELTIA_BRANCH} \
    SVELTIA_CLIENT_OAUTH=${SVELTIA_CLIENT_OAUTH}
COPY . .
RUN npm run cms:config \
    && npm run test:cms \
    && npm run check \
    && npm run build \
    && npm prune --omit=dev --ignore-scripts

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx \
    && groupadd --gid 1001 pacivis \
    && useradd --uid 1001 --gid 1001 --no-create-home --shell /usr/sbin/nologin pacivis
WORKDIR /app
COPY --from=build --chown=1001:1001 /app/dist ./dist
COPY --from=build --chown=1001:1001 /app/node_modules ./node_modules
COPY --from=build --chown=1001:1001 /app/package.json ./package.json
COPY --chown=1001:1001 ops/healthcheck.mjs /usr/local/bin/pacivis-healthcheck
RUN chmod 0555 /usr/local/bin/pacivis-healthcheck
USER 1001:1001
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["/usr/local/bin/pacivis-healthcheck"]
CMD ["node", "./dist/server/entry.mjs"]
