# Agent Wallet — StartOS image.
#
# Layers PostgreSQL + Redis + Tor onto the published Agent Wallet base image
# (the same image native users run) and supervises them with s6-overlay.
#
# The base image is the same image native users run, published by the app repo's
# CI as `:edge` + `:sha-<short>` (multi-arch x86_64 + aarch64) while iterating,
# and as immutable version tags (pinned by digest here) for official releases.
# Override for a local build or a release:
#   docker build --build-arg APP_IMAGE=paulscode/agent-wallet@sha256:<digest> .
#
# The BOLT 12 onion-message gateway is a separate bare-LDK daemon, published as
# its own image by the app repo (the same binary native users run as a sidecar).
# Its binary is copied in below and supervised by s6; the BOLT 12 config toggle
# gates whether it runs.
#
# Pinned by digest for the 0.1.2.0 release so an install is reproducible from a
# fixed, tested image set. Both are multi-arch (linux/amd64 + linux/arm64).
#   APP_IMAGE     paulscode/agent-wallet:0.1.2.0
#   GATEWAY_IMAGE paulscode/agent-wallet-bolt12-gateway:0.1.2.0
# (The gateway is unchanged since 0.1.1.0, so its digest is identical.)
# Override for a dev build, e.g. --build-arg APP_IMAGE=paulscode/agent-wallet:edge
ARG APP_IMAGE=paulscode/agent-wallet@sha256:96476aaf40233a3a13f0c797e59337ce0b6d89197edc4d6132f1bf7981084c5f
ARG GATEWAY_IMAGE=paulscode/agent-wallet-bolt12-gateway@sha256:66980147c568ea5e148bcf27d929cee41306bd00f318ef27ca5a78cf0353820d

FROM ${GATEWAY_IMAGE} AS gateway

FROM ${APP_IMAGE}

USER root

# Co-resident services. The base image is Debian (python:3.12-slim), so these
# come from apt. tini is not needed — s6-overlay is PID 1.
RUN apt-get update && apt-get install -y --no-install-recommends \
      postgresql postgresql-client \
      redis-server \
      tor \
      curl ca-certificates xz-utils netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# s6-overlay v3 (arch-aware). Provides PID-1 init, ordered startup, per-service
# restart, and clean SIGTERM handling for the co-resident processes.
ARG S6_OVERLAY_VERSION=3.2.0.2
ARG TARGETARCH
RUN curl -fsSL "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz" \
      -o /tmp/s6-noarch.tar.xz \
    && case "${TARGETARCH}" in \
         amd64) S6_ARCH=x86_64 ;; \
         arm64) S6_ARCH=aarch64 ;; \
         *) S6_ARCH=x86_64 ;; \
       esac \
    && curl -fsSL "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${S6_ARCH}.tar.xz" \
      -o /tmp/s6-arch.tar.xz \
    && tar -C / -Jxpf /tmp/s6-noarch.tar.xz \
    && tar -C / -Jxpf /tmp/s6-arch.tar.xz \
    && rm -f /tmp/s6-noarch.tar.xz /tmp/s6-arch.tar.xz

# The s6 service tree + entrypoint. The 0.3.5.x health checks are injected into
# the running container (`docker exec health-check.sh ...`), so the script must
# be on $PATH; /usr/local/bin is. The 0.4.x path runs its checks from main.ts and
# does not use this script.
COPY rootfs/ /
COPY docker_entrypoint_040.sh /usr/local/bin/docker_entrypoint_040.sh
COPY docker_entrypoint.sh /usr/local/bin/docker_entrypoint.sh
COPY assets/scripts/health-check.sh /usr/local/bin/health-check.sh
# BOLT 12 onion-message gateway binary (from its published image).
COPY --from=gateway /usr/local/bin/bolt12-gateway /usr/local/bin/bolt12-gateway
RUN chmod +x /usr/local/bin/docker_entrypoint_040.sh \
      /usr/local/bin/docker_entrypoint.sh \
      /usr/local/bin/health-check.sh \
      /usr/local/bin/bolt12-gateway \
      /etc/s6-overlay/scripts/* \
      /etc/s6-overlay/s6-rc.d/*/run \
      /etc/s6-overlay/s6-rc.d/*/up 2>/dev/null || true

# s6-overlay tunables: give the long first-boot (initdb + migrations) ample time
# and let it reap the supervised tree on stop.
ENV S6_KEEP_ENV=1 \
    S6_CMD_WAIT_FOR_SERVICES_MAXTIME=0 \
    S6_BEHAVIOUR_IF_STAGE2_FAILS=2

EXPOSE 8100

# docker_entrypoint_040.sh sets the static in-image env (DB/Redis URLs, Tor on
# localhost, API_HOST, security defaults) from the dynamic env StartOS passes,
# then execs s6-overlay's init.
ENTRYPOINT ["/usr/local/bin/docker_entrypoint_040.sh"]
