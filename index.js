export default {
  async fetch(request) {
    const PROXY_ENDPOINT = "/cors-proxy/";

    if (!request || !request.url || !request.url.includes(PROXY_ENDPOINT))
      return new Response(null, {
        status: 400,
        statusText: "Bad Request",
      });

    function splitUrl(url) {
      const remainingUrl = url.split(PROXY_ENDPOINT)[1];
      return remainingUrl;
    }

    function isValidUrl(url) {
      try {
        new URL(url);
        return true;
       } catch (error) {
        return false;
      }
    }

    async function handleRequest(request) {
      const proxyUrl = splitUrl(request.url);

      if (!proxyUrl || (proxyUrl.length == 0) || !isValidUrl(proxyUrl))
        return new Response(null, {
          status: 400,
          statusText: "Bad Request",
        });

      const API_URL = "https://www.darkread.io/api/getUrlId";
      const apiUrl = new URL(`${API_URL}?url=${encodeURIComponent(proxyUrl)}`);

      // Rewrite request to point to API URL. This also makes the request mutable
      // so you can add the correct Origin header to make the API server think
      // that this request is not cross-site.
      request = new Request(apiUrl, request);
      request.headers.set("Origin", request.origin);

      let response = await fetch(request);

      // Recreate the response so you can modify the headers
      response = new Response(response.body, response);

      // Set CORS headers
      response.headers.set("Access-Control-Allow-Origin", "*");

      // Append to/Add Vary header so browser will cache response correctly
      response.headers.append("Vary", "Origin");

      return response;
    }

    async function handleOptions(request) {
      if (
        request.headers.get("Origin") !== null &&
        request.headers.get("Access-Control-Request-Method") !== null &&
        request.headers.get("Access-Control-Request-Headers") !== null
      ) {
        const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
          "Access-Control-Max-Age": "86400",
        };
    
        // Handle CORS preflight requests.
        return new Response(null, {
          headers: {
            ...corsHeaders,
            "Access-Control-Allow-Headers": request.headers.get(
              "Access-Control-Request-Headers"
            ),
          },
        });
      } else {
        // Handle standard OPTIONS request.
        return new Response(null, {
          headers: {
            Allow: "GET, HEAD, POST, OPTIONS",
          },
        });
      }
    }

    if (request.method === "OPTIONS") {
      // Handle CORS preflight requests
      return handleOptions(request);
    } else if (
      request.method === "GET" ||
      request.method === "HEAD" ||
      request.method === "POST"
    ) {
      // Handle requests to the API server
      return handleRequest(request);
    } else {
      return new Response(null, {
        status: 405,
        statusText: "Method Not Allowed",
      });
    }
  },
};