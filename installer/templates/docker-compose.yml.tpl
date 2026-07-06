services:
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
