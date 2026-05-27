# NOOS Mobile

React Native mobile app for NOOS, built with Expo Dev Client. This repository is separate from the backend repository.

## Requirements

- Node.js
- pnpm
- Xcode and/or Android Studio for native builds

## Development

```sh
pnpm install
pnpm expo prebuild
pnpm expo run:ios
pnpm expo run:android
```

For JavaScript-only iteration after a dev client is installed:

```sh
pnpm start
```

## Environment

`EXPO_PUBLIC_DEFAULT_BACKEND_URL` may be set to provide an initial backend URL. The default is an empty string, and FE-02 will add the Settings screen flow for editing it on device.

```sh
EXPO_PUBLIC_DEFAULT_BACKEND_URL=http://localhost:8080 pnpm start
```

Do not commit secrets or private API keys. `EXPO_PUBLIC_*` values are public by Expo design.

## Validation

```sh
pnpm typecheck
pnpm lint
pnpm test
```
