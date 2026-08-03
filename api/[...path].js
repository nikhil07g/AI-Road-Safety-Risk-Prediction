import { proxyRequest } from "./_proxy.js";

export default {
  fetch(request) {
    const pathname = new URL(request.url).pathname;
    return proxyRequest(request, pathname);
  },
};
