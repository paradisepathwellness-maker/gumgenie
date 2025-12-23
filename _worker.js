export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return env.API.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
}