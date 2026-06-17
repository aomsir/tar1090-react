export async function decodeGzipJson(buf: ArrayBuffer): Promise<unknown> {
  const stream = new Response(buf).body!.pipeThrough(new DecompressionStream('gzip'));
  const text = await new Response(stream).text();
  return JSON.parse(text);
}
