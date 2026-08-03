import { proxyRequest } from "./_proxy.js";

export default {
  fetch(request) {
    return proxyRequest(request, "/chat");
  },
};
