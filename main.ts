import { Hono } from "https://deno.land/x/hono@v4.0.8/mod.ts"
import { cors } from "https://deno.land/x/hono@v4.0.8/middleware.ts"

import Hls from "npm:hls-parser"
import { type MediaPlaylist } from "npm:hls-parser/types"

import { retry } from "./logic/retry.ts"
import { sha256Text } from "./logic/sha256-text.ts"

const KV_KEY_REDIRECT_URI = "redirect uri"

const KV_EXPIRE_REDIRECT_URI = 30 * 24 * 60 * 60 // 30 days

const kv = (await Deno.openKv?.()) as Deno.Kv | undefined

const app = new Hono()
app.use(
  cors({
    origin: [
      "https://animevsub.eu.org",
      "https://animevsub.netlify.app",
      "http://localhost:9000",
      "http://localhost:9200"
    ]
  })
)

app.get("/resolve-redirect", async (c) => {
  const rawUrl = c.req.query("url")?.toLowerCase()
  const referer = c.req.query("referer")

  if (!rawUrl)
    return c.json({ message: 'Missing query "url".' }, { status: 403 })

  const sha256Url = await sha256Text(rawUrl)
  const savedInKv = (await kv?.get<string>([KV_KEY_REDIRECT_URI, sha256Url]))
    ?.value
  if (savedInKv) {
    void kv?.set([KV_KEY_REDIRECT_URI, sha256Url], savedInKv, {
      expireIn: KV_EXPIRE_REDIRECT_URI
    })
    return c.json({
      redirectTo: savedInKv
    })
  }

  try {
    const redirectTo = await getRedirectUrl(rawUrl, referer)
    return c.json({
      redirectTo
    })
  } catch (err) {
    return c.json(
      {
        message: err?.message ?? "Unknown error",
        ...err
      },
      { status: err?.status ?? 406 }
    )
  }
})
app.get("/resolve-redirect-hls", async (c) => {
  const fileM3u8 = c.req.query("url")?.toLowerCase()
  const referer = c.req.query("referer")

  if (!fileM3u8)
    return c.json({ message: 'Missing query "url".' }, { status: 403 })

  const m3u8 = await fetch(fileM3u8, {
    headers: referer ? new Headers({ referer }) : undefined
  }).then((res) => res.text())

  console.log(m3u8)

  const parsedManifest = Hls.parse(m3u8)

  if (parsedManifest.isMasterPlaylist)
    return c.json(
      {
        message: "This API not support master playlist"
      },
      { status: 406 }
    )

  await Promise.all(
    (parsedManifest as MediaPlaylist).segments.map(async (segment) => {
      await retry(
        async () => {
          segment.uri = await getRedirectUrl(segment.uri, referer)
        },
        {
          delay: 100,
          repeat: 5
        }
      )
    })
  )

  return c.json({
    content: Hls.stringify(parsedManifest)
  })
})

Deno.serve(app.fetch)

async function getRedirectUrl(
  rawUrl: string,
  referer?: string
): Promise<string> {
  const sha256Url = await sha256Text(rawUrl)
  const savedInKv = (await kv?.get<string>([KV_KEY_REDIRECT_URI, sha256Url]))
    ?.value
  if (savedInKv) {
    void kv?.set([KV_KEY_REDIRECT_URI, sha256Url], savedInKv, {
      expireIn: KV_EXPIRE_REDIRECT_URI
    })
    return savedInKv
  }

  try {
    const url = new URL(rawUrl, "https://example.com")

    try {
      const response = await fetch(url, {
        headers: referer
          ? new Headers({
              referer
            })
          : undefined,
        redirect: "manual"
      })

      if (!response.ok && response.status !== 302) throw response

      const redirectTo = response.headers.get("location")

      if (!redirectTo)
        throw Object.assign(new Error('"url" not is redirect.'), {
          status: 405
        })

      void kv?.set([KV_KEY_REDIRECT_URI, sha256Url], redirectTo, {
        expireIn: KV_EXPIRE_REDIRECT_URI
      })

      return redirectTo
    } catch (err) {
      throw Object.assign(new Error('Can\'t resolve request "url".'), {
        caption: err?.message,
        statusText: err?.statusText,
        status: err?.status
      })
    }
  } catch (err) {
    throw Object.assign(new Error('Query "url" invalid URL.'), {
      caption: err?.message,
      status: 405
    })
  }
}
