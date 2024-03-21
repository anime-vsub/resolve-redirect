リダイレクトを解決する！

## API /resolve-redirect
### Description
This API endpoint is used to resolve a redirect URL based on the provided query parameters. It takes a URL and an optional referer as input and returns the redirect URL if it exists in the cache, otherwise it retrieves the redirect URL from an external source and caches it for future use.

### Endpoint
### GET /resolve-redirect

### Parameters
- url (string): The URL to resolve the redirect for. Required.
- referer (string): The referer URL. Optional.
### Response
The API response is a JSON object with the following properties:

- redirectTo (string): The redirect URL.
- message (string): An error message if there was an error resolving the redirect.
Example Usage
```ts
const url = "https://example.com/original-url";
const referer = "https://example.com/referer";

fetch(`/resolve-redirect?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(referer)}`)
  .then((response) => response.json())
  .then((data) => {
    if (data.redirectTo) {
      // Redirect to the resolved URL
      window.location.href = data.redirectTo;
    } else {
      // Handle the error
      console.error(data.message);
    }
  })
  .catch((error) => {
    console.error(error);
  });
```
## API /resolve-redirect-hls
### Description
This API endpoint is used to resolve a redirect URL for an HLS (HTTP Live Streaming) playlist. It takes an HLS playlist URL and an optional referer as input, fetches the playlist, resolves the redirect URLs for each segment, and returns the modified playlist.