# The browsers the tests run in, one for each engine CI checks: Chromium, WebKit and Firefox (R79).
# Playwright publishes no sums for its browser downloads, so they come from Playwright's own image,
# pinned by tag and digest, and only the builds a headless test starts: Chrome Headless Shell,
# WebKit and Firefox. The image's tag is the version of the playwright package in
# package-lock.json, and each revision is the one that version's browsers.json names: otherwise
# Playwright finds no browser, and ci-test fails on it. The tag, the digest and the three revisions
# are raised by hand, together, in spec's repo-template, which a move to its new tag brings here, or
# here first, in the pull request that raises the package (R79): Dependabot reads FROM lines only,
# and this image is not in one. COPY takes a folder's contents, not the folder, so each browser has
# a COPY of its own, all three from the one image.
ARG PLAYWRIGHT_HEADLESS_SHELL_REVISION=1254
ARG PLAYWRIGHT_WEBKIT_REVISION=2388
ARG PLAYWRIGHT_FIREFOX_REVISION=1572
COPY --from=mcr.microsoft.com/playwright:v1.65.0-noble@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe \
    /ms-playwright/chromium_headless_shell-${PLAYWRIGHT_HEADLESS_SHELL_REVISION} \
    /ms-playwright/chromium_headless_shell-${PLAYWRIGHT_HEADLESS_SHELL_REVISION}
COPY --from=mcr.microsoft.com/playwright:v1.65.0-noble@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe \
    /ms-playwright/webkit-${PLAYWRIGHT_WEBKIT_REVISION} \
    /ms-playwright/webkit-${PLAYWRIGHT_WEBKIT_REVISION}
COPY --from=mcr.microsoft.com/playwright:v1.65.0-noble@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe \
    /ms-playwright/firefox-${PLAYWRIGHT_FIREFOX_REVISION} \
    /ms-playwright/firefox-${PLAYWRIGHT_FIREFOX_REVISION}
# Where Playwright looks for its browsers, outside any home: in CI the checks run with HOME=/tmp.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# The system libraries the browsers need: the lists chromium, webkit and firefox for Ubuntu 24.04 in
# Playwright's nativeDeps.ts at the same version, each package once — Chromium's first, then
# what WebKit and Firefox add —, and the fonts of its list tools, all but xvfb: a headless browser
# needs no X server, and without these fonts WebKit lays inline elements out zero high. apt pins no
# versions by itself, so they come from the Ubuntu archive as it was at one moment: a snapshot,
# whose ID is raised by hand like a version (R40) — with the image above, or when a newer base
# image needs a newer archive. apt checks the archive's signatures as it does on any update.
ARG UBUNTU_SNAPSHOT=20261021T000000Z
RUN apt-get update --snapshot "$UBUNTU_SNAPSHOT"; \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        --snapshot "$UBUNTU_SNAPSHOT" \
        libasound2t64 libatk-bridge2.0-0t64 libatk1.0-0t64 libatspi2.0-0t64 libcairo2 \
        libcups2t64 libdbus-1-3 libdrm2 libgbm1 libglib2.0-0t64 libnspr4 libnss3 \
        libpango-1.0-0 libx11-6 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 \
        libxkbcommon0 libxrandr2 \
        gstreamer1.0-libav gstreamer1.0-plugins-bad gstreamer1.0-plugins-base \
        gstreamer1.0-plugins-good libatomic1 libavcodec60 libavif16 libcairo-gobject2 \
        libenchant-2-2 libepoxy0 libevent-2.1-7t64 libflite1 libgdk-pixbuf-2.0-0 libgles2 \
        libgstreamer-gl1.0-0 libgstreamer-plugins-bad1.0-0 libgstreamer-plugins-base1.0-0 \
        libgstreamer1.0-0 libgtk-3-0t64 libgtk-4-1 libharfbuzz-icu0 libharfbuzz0b libhyphen0 \
        libicu74 libjpeg-turbo8 liblcms2-2 libmanette-0.2-0 libopus0 libpangocairo-1.0-0 \
        libpng16-16t64 libsecret-1-0 libvpx9 libwayland-client0 libwayland-egl1 \
        libwayland-server0 libwebp7 libwebpdemux2 libwoff1 libx11-xcb1 libx264-164 libxcb-shm0 \
        libxcursor1 libxi6 libxml2 libxrender1 libxslt1.1 \
        fonts-noto-color-emoji fonts-unifont libfontconfig1 libfreetype6 xfonts-cyrillic \
        xfonts-scalable fonts-liberation fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf \
        fonts-freefont-ttf; \
    rm -rf /var/lib/apt/lists/*
