// deno-lint-ignore no-explicit-any
export async function retry<Fn extends () => any>(
  fn: Fn,
  {
    repeat,
    delay
  }: {
    repeat: number
    delay: number
  }
): Promise<ReturnType<Fn>> {
  try {
    return await fn()
  } catch (err) {
    if (repeat-- > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
      return await retry(fn, { repeat, delay })
    } else {
      throw err
    }
  }
}
