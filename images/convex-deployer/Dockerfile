# syntax=docker/dockerfile:1@sha256:87999aa3d42bdc6bea60565083ee17e86d1f3339802f543c0d03998580f9cb89
ARG BASE_IMAGE=ghcr.io/get-convex/convex-backend:82d5e9f2e8298641e45e5227b9967aa4c1d10620@sha256:f0de0647e46c0ac830a6dda036ee78e4956cecc00144d951bf39b14cc570ad4d
FROM ${BASE_IMAGE}

ARG APPLICATION_SOURCE_REF
ARG CONVEX_CLI_VERSION=1.42.1

LABEL org.opencontainers.image.source="https://github.com/FL-Training/training"
LABEL org.opencontainers.image.description="Immutable Pacivis site Convex function reconciler"
LABEL org.opencontainers.image.revision="${APPLICATION_SOURCE_REF}"
LABEL com.lacneu.convex-cli.version="${CONVEX_CLI_VERSION}"
LABEL com.lacneu.reconciler.source="lacneu/platform-automation@d3fce32"

WORKDIR /opt/application

# Convex actions need npm at runtime. Replace the inherited copy with the
# reviewed release instead of modifying it in place.
RUN npm install --global --prefix /opt/lacneu/npm npm@11.18.0 \
    && test -x /opt/lacneu/npm/lib/node_modules/npm/bin/npm-cli.js \
    && rm -rf /usr/lib/node_modules/npm \
    && ln -s /opt/lacneu/npm/lib/node_modules/npm /usr/lib/node_modules/npm \
    && npm cache clean --force \
    && node -e "if (require('/usr/lib/node_modules/npm/node_modules/tar/package.json').version !== '7.5.19') process.exit(1)"

COPY --chown=10001:10001 images/convex-deployer/package.json images/convex-deployer/package-lock.json ./
RUN npm ci --ignore-scripts \
    && test "$(node_modules/.bin/convex --version)" = "${CONVEX_CLI_VERSION}"
COPY --chown=10001:10001 convex ./convex
COPY --chown=10001:10001 images/convex-deployer/entrypoint.mjs /usr/local/libexec/lacneu/convex-app-deployer.mjs

RUN printf '%s\n' "${APPLICATION_SOURCE_REF}" > .lacneu-source-ref \
    && printf '%s\n' "${CONVEX_CLI_VERSION}" > .lacneu-convex-cli-version \
    && chmod -R a+rX,go-w /opt/application \
    && chmod 0555 /usr/local/libexec/lacneu/convex-app-deployer.mjs \
      /convex/generate_admin_key.sh /convex/read_credentials.sh /convex/generate_key \
    && chown -R 10001:10001 /opt/application \
    && rm -rf /root/.npm /tmp/*

USER 10001:10001
ENTRYPOINT ["node", "/usr/local/libexec/lacneu/convex-app-deployer.mjs"]
