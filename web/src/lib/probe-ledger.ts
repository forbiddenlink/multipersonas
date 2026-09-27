/**
 * Probe ledger — the four public demo targets from experiments/net-new-violations.
 * "publicScan" = axe-core on the public entry URL (what a page-level scanner sees).
 * "netNew" = violations the session crawl found that the public scan did not.
 * Numbers copied from experiments/net-new-violations/results/*.json (analysis block).
 * Applitools is kept on purpose: the crawl found nothing new there, and saying so is
 * the point of a ledger.
 */
export const PROBE_LEDGER = [
  { host: "saucedemo.com", publicScan: 0, states: 7, netNew: 3 },
  { host: "opensource-demo.orangehrmlive.com", publicScan: 1, states: 5, netNew: 35 },
  { host: "the-internet.herokuapp.com", publicScan: 44, states: 3, netNew: 5 },
  { host: "demo.applitools.com", publicScan: 5, states: 1, netNew: 0 },
] as const;

/** SauceDemo states in crawl order, with the probe's own "why a crawler misses it". */
export const SAUCEDEMO_TRAIL = [
  { path: "/", label: "Login", publicUrl: true, findings: 0, why: "The only page a URL scanner loads." },
  { path: "/login (error)", label: "Login error", publicUrl: false, findings: 1, why: "Only exists after submitting bad input." },
  { path: "/inventory", label: "Inventory", publicUrl: false, findings: 1, why: "Behind auth. No session, no page." },
  { path: "/cart", label: "Cart", publicUrl: false, findings: 0, why: "Needs an item added first." },
  { path: "/checkout-step-one", label: "Checkout", publicUrl: false, findings: 0, why: "Three interactions deep." },
  { path: "/checkout (error)", label: "Checkout error", publicUrl: false, findings: 1, why: "An error state inside a multi-step flow." },
] as const;
