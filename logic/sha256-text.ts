let encoder: TextEncoder
export async function sha256Text(text: string): Promise<string> {
  encoder ??= new TextEncoder()
  const data = encoder.encode(text)

  const hash = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hash))
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")

  return hashHex
}
