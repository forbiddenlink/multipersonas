/**
 * Natural URL guesses that should land on the real auth routes instead of 404ing.
 * Lives outside next.config.ts so a test can assert every guess resolves to a route
 * that exists on disk.
 */
export const AUTH_REDIRECTS = [
  { source: "/auth/sign-up", destination: "/auth/signup", permanent: true },
  { source: "/signup", destination: "/auth/signup", permanent: true },
  { source: "/sign-up", destination: "/auth/signup", permanent: true },
  { source: "/register", destination: "/auth/signup", permanent: true },
  { source: "/auth/register", destination: "/auth/signup", permanent: true },
  { source: "/login", destination: "/auth/login", permanent: true },
  { source: "/sign-in", destination: "/auth/login", permanent: true },
  { source: "/signin", destination: "/auth/login", permanent: true },
  { source: "/auth/sign-in", destination: "/auth/login", permanent: true },
] as const;
