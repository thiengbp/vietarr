# Prowlarr custom definitions

VietArr copies managed Cardigann definitions from this directory into:

```text
/opt/vietarr/appdata/prowlarr/Definitions/Custom
```

A managed `.yml` or `.yaml` file must begin with exactly:

```yaml
# Managed by VietArr
```

Running the installer again updates only files carrying this marker. An existing file without the marker is treated as user-managed and is never overwritten.

For a local definition directory, run the installer with `VIETARR_CUSTOM_DEFINITIONS_DIR=/path/to/definitions`. VietArr does not ship or enable a website definition until its production capability check passes without CAPTCHA.

## Managed definitions

- `btdig-vietarr.yml`: BTDig through Prowlarr/Cardigann. BTDig exposes magnet links and sizes but no trustworthy live swarm counts, so the definition uses Cardigann's neutral availability sentinel. It is enabled only after a production capability test.
- BT4G is intentionally not included while the production network fails its TLS/challenge check. VietArr does not bypass CAPTCHA or anti-bot controls.
