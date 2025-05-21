import { makeTempFile } from '@std/fs/unstable-make-temp-file';

async function runCode(signal: AbortSignal, code: string): Promise<[string, string]> {
  const file = await makeTempFile({ suffix: '.tinyapl' });
  await Deno.writeTextFile(file, code);
  const output = await new Deno.Command('./tinyapl', { args: ['-E', file], signal }).output();
  const d = new TextDecoder();
  return [d.decode(output.stdout), d.decode(output.stderr)];
}

Deno.serve({ port: 12321 }, async req => {
  if (req.method !== 'POST')
    return new Response('Only POST allowed.', { status: 405 });
  const body = await req.text();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const output = await runCode(controller.signal, body);
  clearTimeout(timeout);
  if (controller.signal.aborted)
    return new Response('Code timed out.', { status: 400 });  
  if (output[1].trim().length)
    return new Response(output[1], { status: 400 });
  return new Response(output[0]);
});
