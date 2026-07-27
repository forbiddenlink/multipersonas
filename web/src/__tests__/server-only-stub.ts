// No-op stub for the `server-only` package under vitest. The real package throws
// if imported into a client bundle; that guard is correct in the app build but
// meaningless in the test runner, where server modules are exercised directly.
export {};
