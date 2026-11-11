# The browser the tests run in (R79). Playwright publishes no sums for its browser downloads, so it
# comes from Playwright's own image, pinned by tag and digest, and only the build a headless test
# starts: Chrome Headless Shell. The image's tag is the version of the playwright package in
# package-lock.json, and the revision is the one that version's browsers.json names: otherwise
# Playwright finds no browser, and ci-test fails on it. All three are raised by hand, in spec's
# repo-template, which a move to its new tag brings here, or here first, in the pull request that
# raises the package (R79): Dependabot reads FROM lines only, and this image is not in one.
ARG PLAYWRIGHT_HEADLESS_SHELL_REVISION=1254
COPY --from=mcr.microsoft.com/playwright:v1.65.0-noble@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe \
    /ms-playwright/chromium_headless_shell-${PLAYWRIGHT_HEADLESS_SHELL_REVISION} \
    /ms-playwright/chromium_headless_shell-${PLAYWRIGHT_HEADLESS_SHELL_REVISION}
# Where Playwright looks for its browsers, outside any home: in CI the checks run with HOME=/tmp.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# The system libraries the browser needs: Chromium's list for Ubuntu 24.04 in Playwright's
# nativeDeps.ts at the same version, and the fonts it reads. apt pins no versions by itself, so
# they come from the Ubuntu archive as it was at one moment: a snapshot, whose ID is raised by hand
# like a version (R40) — with the image above, or when a newer base image needs a newer archive.
# apt checks the archive's signatures as it does on any update.
ARG UBUNTU_SNAPSHOT=20261021T000000Z
RUN apt-get update --snapshot "$UBUNTU_SNAPSHOT"; \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        --snapshot "$UBUNTU_SNAPSHOT" \
        libasound2t64 libatk-bridge2.0-0t64 libatk1.0-0t64 libatspi2.0-0t64 libcairo2 \
        libcups2t64 libdbus-1-3 libdrm2 libgbm1 libglib2.0-0t64 libnspr4 libnss3 \
        libpango-1.0-0 libx11-6 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 \
        libxkbcommon0 libxrandr2 \
        libfontconfig1 libfreetype6 fonts-liberation; \
    rm -rf /var/lib/apt/lists/*
