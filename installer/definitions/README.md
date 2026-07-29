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
