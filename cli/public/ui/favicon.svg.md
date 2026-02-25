# favicon.svg

## Source

This file is synchronized from: `https://fileuni.com/favicon.svg`

## Sync Logic (Reference: `fileuni/script/workflow_core.py`)

The logo synchronization is handled by `sync_frontend_logos_for_dev()` function:

1. **Source URL**: Defined in `ICON_URL` constant
2. **Target Paths**: Configured in `FRONTEND_LOGO_TARGETS` dict:
   - CLI: `public/ui/favicon.svg` (under `frontends/cli/`)
   - GUI: `public/ui/favicon.svg` (under `frontends/gui/`)

## Download Process

1. Download to a temp file with `.tmp` suffix
2. Move temp file to target path on success
3. If download fails:
   - Keep existing file if present (with warning)
   - Raise error if no existing file available

## Tool Requirements

Either `curl` or `wget` must be available on the system.
Priority: `curl` (with timeout: 20s connect, 120s max) > `wget`

## Usage

This logo is used during frontend build process for development mode.
Run `./scripts/all_in_one.sh gui:dev` or `cli:dev` to trigger synchronization.
