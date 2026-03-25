# `@gigachain/pi-gigachat`

GigaChat as a standalone `pi-coding-agent` extension package.

## What It Includes

- native `gigachat` provider registration for `pi`
- built-in `GigaChat-2` (Lite), `GigaChat-2-Pro`, and `GigaChat-2-Max`
- `/login gigachat` onboarding with stored credential refresh
- robust streaming for tool-heavy sessions without the SDK `client.stream(...)` parser path
- source in `src/` and published build artifacts in `dist/`

## Install

```bash
pi install npm:@gigachain/pi-gigachat
```

Try it without installing:

```bash
pi -e npm:@gigachain/pi-gigachat
```

Or load the local checkout directly after building once:

```bash
npm install
pi -e /absolute/path/to/pi-gigachat
```

## Usage

After loading the package, select a GigaChat model with `/model` or start by logging in:

```text
/login gigachat
```

The onboarding flow asks for:

- account type: `personal` or `business`
- auth mode: `basic` or `token`
- scope, with sensible defaults
- base URL, with the standard production URL as the default

Because the current public pi OAuth prompt API only supports text prompts, the onboarding uses text input with defaults instead of picker widgets.

## Quick Smoke Test

After installing and authenticating:

```bash
pi -p --provider gigachat --model GigaChat-2-Pro "Say hello in one short sentence."
```

For a tool-use smoke test:

```bash
pi -p --provider gigachat --model GigaChat-2-Pro "Read package.json and reply with only the package name."
```

## Environment Variables

Recommended:

```bash
export GIGACHAT_CREDENTIALS=...
export GIGACHAT_SCOPE=GIGACHAT_API_PERS
```

Also supported:

```bash
export GIGACHAT_ACCESS_TOKEN=...
```

Or:

```bash
export GIGACHAT_USER=...
export GIGACHAT_PASSWORD=...
```

Optional:

```bash
export GIGACHAT_BASE_URL=https://gigachat.devices.sberbank.ru/api/v1
```

## Models

- `gigachat/GigaChat-2`
- `gigachat/GigaChat-2-Pro`
- `gigachat/GigaChat-2-Max`

Current metadata is aligned with the public GigaChat model docs as of March 23, 2026:

- `GigaChat-2` is shown as `GigaChat 2 Lite`
- `GigaChat-2-Pro` and `GigaChat-2-Max` are marked as text-and-image capable in `pi`
- public per-million-token pricing is reflected in the extension metadata

`pi` model metadata only supports `text` and `image` input flags today, so GigaChat audio-input support is not represented separately even though the upstream Pro and Max models support it.

## Notes

- Uses the official [`gigachat`](https://github.com/ai-forever/gigachat-js) SDK for auth and request configuration.
- Uses a custom SSE parser instead of the SDK's built-in `client.stream(...)` path, because tool-call responses can arrive split across transport chunks and break the SDK parser.
- Supports refreshable stored credentials for both basic and token-credentials login modes.

## Publish Checklist

Before the first publish:

1. Create the GitHub repo at `github.com/ai-forever/pi-gigachat` or update the repository URLs in [`package.json`](/Users/ayudavidov/pi-gigachat/package.json).
2. Run `npm install`.
3. Run `npm run check`.
4. Confirm `npm publish --dry-run`.
5. Publish with `npm publish --access public`.

## Development

```bash
npm install
npm run build
npm run check
```
