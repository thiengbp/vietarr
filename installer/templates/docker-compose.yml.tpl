services:
  core:
    image: ${VIETARR_CORE_IMAGE:-ghcr.io/thiengbp/vietarr-core:main}
    container_name: vietarr-core
    restart: unless-stopped
    env_file:
      - ./.env
    environment:
      - VIETARR_HOME=/opt/vietarr
      - PORT=3000
      - CORE_CACHE_PATH=/app/data/core-cache.sqlite
      - CORE_DB_PATH=/app/data/core.sqlite
      - RADARR_URL=${RADARR_URL:-http://radarr:7878}
      - RADARR_API_KEY=${RADARR_API_KEY:-}
      - SONARR_URL=${SONARR_URL:-http://sonarr:8989}
      - SONARR_API_KEY=${SONARR_API_KEY:-}
      - BAZARR_URL=${BAZARR_URL:-http://bazarr:6767}
      - BAZARR_API_KEY=${BAZARR_API_KEY:-}
      - QBIT_URL=${QBIT_URL:-http://qbittorrent:8080}
      - QBIT_USER=${QBIT_USER:-}
      - QBIT_PASS=${QBIT_PASS:-}
      - JWT_SECRET=${JWT_SECRET:-}
      - WEBHOOK_SECRET=${WEBHOOK_SECRET:-}
      - CORE_PUBLIC_URL=https://api.vietarr.{{DOMAIN_SUFFIX}}
      - CORE_WEBHOOK_URL=https://api.vietarr.{{DOMAIN_SUFFIX}}/api/v1/webhook/arr
      - SMB_BASE_URL=smb://vietarr.{{DOMAIN_SUFFIX}}/media
    volumes:
      - ./appdata/core:/opt/vietarr
      - ${VIETARR_HOME:-/opt/vietarr}/data/core:/app/data
      - ./.env:/opt/vietarr/.env:ro
      - {{MEDIA_ROOT}}:/data:ro
    expose:
      - "3000"
    depends_on:
      radarr:
        condition: service_healthy
      sonarr:
        condition: service_healthy
      bazarr:
        condition: service_healthy
    networks:
      - vietarr
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 10s
      timeout: 5s
      retries: 18

  web:
    image: ${VIETARR_WEB_IMAGE:-ghcr.io/thiengbp/vietarr-web:main}
    container_name: vietarr-web
    restart: unless-stopped
    environment:
      - CORE_API_URL=http://core:3000/api/v1
      - NEXT_PUBLIC_CORE_API_URL=/api/v1
    expose:
      - "3000"
    depends_on:
      core:
        condition: service_healthy
    networks:
      - vietarr
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 10s
      timeout: 5s
      retries: 18

  caddy:
    image: caddy:2-alpine
    container_name: vietarr-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - vietarr
    healthcheck:
      test: ["CMD", "caddy", "validate", "--config", "/etc/caddy/Caddyfile"]
      interval: 10s
      timeout: 5s
      retries: 18

  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    container_name: vietarr-qbittorrent
    restart: unless-stopped
    environment:
      - PUID=1000
      - PGID=1000
      - TZ={{TZ}}
      - WEBUI_PORT=8080
    volumes:
      - ./appdata/qbittorrent:/config
      - {{MEDIA_ROOT}}:/data
    networks:
      - vietarr
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:8080 >/dev/null || wget -q --spider http://127.0.0.1:8080"]
      interval: 10s
      timeout: 5s
      retries: 18

  prowlarr:
    image: lscr.io/linuxserver/prowlarr:latest
    container_name: vietarr-prowlarr
    restart: unless-stopped
    environment:
      - PUID=1000
      - PGID=1000
      - TZ={{TZ}}
    volumes:
      - ./appdata/prowlarr:/config
    networks:
      - vietarr
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:9696/ping >/dev/null || wget -q --spider http://127.0.0.1:9696/ping"]
      interval: 10s
      timeout: 5s
      retries: 18

  radarr:
    image: lscr.io/linuxserver/radarr:latest
    container_name: vietarr-radarr
    restart: unless-stopped
    environment:
      - PUID=1000
      - PGID=1000
      - TZ={{TZ}}
    volumes:
      - ./appdata/radarr:/config
      - {{MEDIA_ROOT}}:/data
    networks:
      - vietarr
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:7878/ping >/dev/null || wget -q --spider http://127.0.0.1:7878/ping"]
      interval: 10s
      timeout: 5s
      retries: 18

  sonarr:
    image: lscr.io/linuxserver/sonarr:latest
    container_name: vietarr-sonarr
    restart: unless-stopped
    environment:
      - PUID=1000
      - PGID=1000
      - TZ={{TZ}}
    volumes:
      - ./appdata/sonarr:/config
      - {{MEDIA_ROOT}}:/data
    networks:
      - vietarr
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:8989/ping >/dev/null || wget -q --spider http://127.0.0.1:8989/ping"]
      interval: 10s
      timeout: 5s
      retries: 18

  bazarr:
    image: lscr.io/linuxserver/bazarr:latest
    container_name: vietarr-bazarr
    restart: unless-stopped
    environment:
      - PUID=1000
      - PGID=1000
      - TZ={{TZ}}
    volumes:
      - ./appdata/bazarr:/config
      - {{MEDIA_ROOT}}:/data
    networks:
      - vietarr
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:6767 >/dev/null || wget -q --spider http://127.0.0.1:6767"]
      interval: 10s
      timeout: 5s
      retries: 18

  flaresolverr:
    image: ghcr.io/flaresolverr/flaresolverr:latest
    container_name: vietarr-flaresolverr
    restart: unless-stopped
    environment:
      - TZ={{TZ}}
      - LOG_LEVEL=info
    networks:
      - vietarr
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:8191 >/dev/null || wget -q --spider http://127.0.0.1:8191"]
      interval: 10s
      timeout: 5s
      retries: 18

  recyclarr:
    image: ghcr.io/recyclarr/recyclarr:latest
    container_name: vietarr-recyclarr
    restart: unless-stopped
    user: "1000:1000"
    env_file:
      - ./.env
    volumes:
      - ./appdata/recyclarr:/config
    entrypoint: ["/bin/sh", "-c"]
    command: ["sleep infinity"]
    networks:
      - vietarr
    healthcheck:
      test: ["CMD-SHELL", "test -f /config/recyclarr.yml"]
      interval: 10s
      timeout: 5s
      retries: 18

networks:
  vietarr:
    name: vietarr

volumes:
  caddy_data:
  caddy_config:
