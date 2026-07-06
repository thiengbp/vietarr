{
	admin off
}

vietarr.{{DOMAIN_SUFFIX}} {
	tls internal
	handle /api/* {
		reverse_proxy core:3000
	}
	handle /ws* {
		reverse_proxy core:3000
	}
	reverse_proxy web:3000
}

api.vietarr.{{DOMAIN_SUFFIX}} {
	tls internal
	reverse_proxy core:3000
}

radarr.{{DOMAIN_SUFFIX}} {
	reverse_proxy radarr:7878
}

sonarr.{{DOMAIN_SUFFIX}} {
	reverse_proxy sonarr:8989
}

prowlarr.{{DOMAIN_SUFFIX}} {
	reverse_proxy prowlarr:9696
}

bazarr.{{DOMAIN_SUFFIX}} {
	reverse_proxy bazarr:6767
}

qbittorrent.{{DOMAIN_SUFFIX}} {
	reverse_proxy qbittorrent:8080
}
