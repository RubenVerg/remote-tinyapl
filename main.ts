import { makeTempFile } from '@std/fs/unstable-make-temp-file';

const timeoutPromise = <A>(ms: number, promise: Promise<A>): Promise<A> => {
  let timeout: number;
  const timeoutPromise = new Promise<A>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error("Timed out!")), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
};

async function runCode(code: string): Promise<[string, string]> {
  const file = await makeTempFile({ suffix: '.tinyapl' });
  await Deno.writeTextFile(file, code);
  const output = await new Deno.Command('./tinyapl', { args: ['-E', file] }).output();
  const d = new TextDecoder();
  return [d.decode(output.stdout), d.decode(output.stderr)];
}

Deno.serve({ port: 12321 }, async req => {
  if (req.method !== 'POST')
    return new Response('Only POST allowed.', { status: 405 });
  const body = await req.text();
  try {
    const output = await timeoutPromise(5000, runCode(body));
    if (output[1].trim().length)
      return new Response(output[1], { status: 400 });
    return new Response(output[0]);
  } catch (_e) {
    return new Response('Code timed out.', { status: 408 });
  }
});
