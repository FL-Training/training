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

COPY --chown=10001:10001 images/convex-deployer/package.json images/convex-deployer/package-lock.json ./
RUN npm ci --ignore-scripts \
    && test "$(node_modules/.bin/convex --version)" = "${CONVEX_CLI_VERSION}"
COPY --chown=10001:10001 convex ./convex
COPY --chown=10001:10001 images/convex-deployer/entrypoint.mjs /usr/local/libexec/lacneu/convex-app-deployer.mjs

# The reconciler invokes the pinned local Convex CLI directly. The site has
# no Node actions, so a package manager is unnecessary at runtime.
RUN printf '%s\n' "${APPLICATION_SOURCE_REF}" > .lacneu-source-ref \
    && printf '%s\n' "${CONVEX_CLI_VERSION}" > .lacneu-convex-cli-version \
    && install -d -o 10001 -g 10001 -m 0755 /opt/application/convex/_generated \
    && chmod -R a+rX,go-w /opt/application \
    && chmod 0555 /usr/local/libexec/lacneu/convex-app-deployer.mjs \
      /convex/generate_admin_key.sh /convex/read_credentials.sh /convex/generate_key \
    && chown -R 10001:10001 /opt/application \
    && rm -rf /root/.npm /usr/lib/node_modules/npm /usr/bin/npm /usr/bin/npx /tmp/* \
    && ! find / -type f -path '*/node_modules/npm/package.json' -print -quit 2>/dev/null | grep -q .

USER 10001:10001
ENTRYPOINT ["node", "/usr/local/libexec/lacneu/convex-app-deployer.mjs"]
