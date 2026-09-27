// Cloudflare Worker entry point. See README.md for setup.
import { handle, type Env } from './handler';

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handle(request, env, { fetch: (input, init) => fetch(input, init), now: () => new Date() });
  },
};
