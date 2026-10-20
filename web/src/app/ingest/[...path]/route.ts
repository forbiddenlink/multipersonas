/**
 * PostHog reverse proxy.
 *
 * Replaces the `/ingest` rewrites in next.config. A rewrite to an external host forwards
 * every request header, including `Cookie`. For a signed-in user that is the auth cookies,
 * which (a) hand the session to PostHog's hosts and (b) can push the request header section
 * past the 8 KB limit upstream, so the assets host answers 400
 * `RequestHeaderSectionTooLarge` and the SDK extensions never load.
 *
 * This handler builds a fresh header set from an allowlist, so cookie and authorization
 * can never be forwarded, and strips `set-cookie` from the response.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PREFIX = '/ingest'
const API_ORIGIN = 'https://us.i.posthog.com'
const ASSET_ORIGIN = 'https://us-assets.i.posthog.com'

const FORWARDED_REQUEST_HEADERS = [
  'content-type',
  'content-encoding',
  'accept',
  'accept-encoding',
  'accept-language',
  'user-agent',
  'origin',
  'referer',
] as const

/** Headers that describe the upstream wire encoding, which fetch has already undone. */
const DROPPED_RESPONSE_HEADERS = [
  'set-cookie',
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
] as const

function upstreamUrl(request: Request): URL {
  const { pathname, search } = new URL(request.url)
  const path = pathname.startsWith(PREFIX) ? pathname.slice(PREFIX.length) : pathname
  const base = path.startsWith('/static/') || path.startsWith('/array/') ? ASSET_ORIGIN : API_ORIGIN
  return new URL(`${base}${path}${search}`)
}

function clientIp(request: Request): string | null {
  return (
    request.headers.get('x-vercel-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')
  )
}

async function proxy(request: Request): Promise<Response> {
  const headers = new Headers()
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  const ip = clientIp(request)
  if (ip) headers.set('x-forwarded-for', ip)

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
    redirect: 'manual',
  }
  if (hasBody) {
    init.body = request.body
    init.duplex = 'half'
  }

  const upstream = await fetch(upstreamUrl(request), init)

  const responseHeaders = new Headers(upstream.headers)
  for (const name of DROPPED_RESPONSE_HEADERS) responseHeaders.delete(name)

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}

export const GET = proxy
export const POST = proxy
export const OPTIONS = proxy
