# exfetch

[![Build Status][ci-img]][ci]
[![BrowserStack Status][browserstack-img]][browserstack]

Enhanced [`unfetch`](https://github.com/developit/unfetch) API.

Features:

-   Progress listeners for download and upload
-   Abortable request with custom implementation or
    [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController),
    following [abortable Fetch][abortable-fetch] approach

## Install

```sh
npm install exfetch --save
```

## Usage

### Custom abort implementation

```js
import exfetch from 'exfetch';

(async () => {
	const { request, abort, isAborted, onEvent } = exfetch('https://becky.com');
	let downloaded = 0;
	let uploaded = 0;

	onEvent('download', (e) => {
		if (e.lengthComputable) {
			downloaded = e.loaded / e.total;
		}
	});

	onEvent('upload', (e) => {
		if (e.lengthComputable) {
			uploaded = e.loaded / e.total;
		}
	});

	setTimeout(() => {
		// Will abort request after 2 seconds
		abort();
	}, 2000);

	const response = await request();

	if (isAborted()) {
		// Request aborted!
		return;
	}

	// Parse response as JSON
	const data = await response.json();
})();
```

### "Abortable Fetch" approach

Using `abort` and `isAborted` export properties will throw error which instructs
to use
[`AbortController.abort()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort)
method and
[`AbortSignal.aborted`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/aborted)
property respectively.

```js
import exfetch from 'exfetch';

(async () => {
	const controller = new AbortController();
	const signal = controller.signal;
	const { request, onEvent } = exfetch('https://becky.com', { signal });
	let downloaded = 0;
	let uploaded = 0;

	onEvent('download', (e) => {
		if (e.lengthComputable) {
			downloaded = e.loaded / e.total;
		}
	});

	onEvent('upload', (e) => {
		if (e.lengthComputable) {
			uploaded = e.loaded / e.total;
		}
	});

	setTimeout(() => {
		// Will abort request after 2 seconds
		controller.abort();
	}, 2000);

	try {
		const response = await request();
		// Parse response as JSON
		const data = await response.json();
	} catch (error) {
		if (error.name === 'AbortError') {
			// Request aborted!
			return;
		}
	}
})();
```

## API

### exfetch(url, [options])

Returns: `Object`

See
[`unfetch` API documentation](https://github.com/developit/unfetch#fetchurl-string-options-object)
for arguments.

Returns API object with following properties:

#### request

Type: `Function`  
Returns: `Promise`

Returns request `Promise`.

#### onEvent(eventName, handler)

Type: `Function`  
Returns: `Function`

Wrapper around
[progress event](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/progress_event).

| Event name | Original handler        |
| ---------- | ----------------------- |
| `download` | `xhr.onprogress`        |
| `upload`   | `xhr.upload.onprogress` |

Handler receives one argument which is original `Event`.

Returns function for unlistening event.

#### abort

Type: `Function`  
Returns: `undefined`

Aborts request.

This has effect only with custom abort implementation. If you use this method
with ["abortable Fetch" approach][abortable-fetch], it will throw error telling
you to use `AbortController.abort()` instead.

#### isAborted

Type: `Function`  
Returns: `boolean`

Check if current request is aborted.

This has effect only with custom abort implementation. If you use this method
with ["abortable Fetch" approach][abortable-fetch], it will throw error telling
you to use `AbortSignal.aborted` instead.

## Questions

### Why two different abort implementations?

[Original GitHub issue on aborting Fetch](https://github.com/whatwg/fetch/issues/27)
is rather long and it culminated with generic `AbortController` approach not
connected only with Fetch, which is great for any kind of abortable operations.

But XHR already has simple solution for aborting requests and it would be shame
not to use that.

I wanted to support both approaches, but they have differences in how they are
resolved.

For ["abortable Fetch" approach][abortable-fetch], request Promise is rejected
with `AbortError` following standard implementation.

For custom abort approach, request Promise is resolved/fulfilled to response
object following
[XHR abort operation sequence](<https://xhr.spec.whatwg.org/#the-abort()-method>)
with `ok` set to false and status set to `0`.

## Browser support

Tested in IE11+ and all modern browsers, assuming `Promise` is available
([polyfill](https://github.com/calvinmetcalf/lie)).

If you want to use ["abortable Fetch" approach][abortable-fetch], you also need
to have `AbortController` available
([polyfill](https://github.com/mo/abortcontroller-polyfill)).

## Test

For automated tests, run `npm run test:automated` (append `:watch` for watcher
support).

## License

MIT © [Ivan Nikolić](http://ivannikolic.com)

<!-- prettier-ignore-start -->

[ci]: https://travis-ci.com/niksy/exfetch
[ci-img]: https://travis-ci.com/niksy/exfetch.svg?branch=master
[browserstack]: https://www.browserstack.com/
[browserstack-img]: https://www.browserstack.com/automate/badge.svg?badge_key=MTd2TTJxWHhNRHltNEpXUjVGVXd2QTg0NXhMeDNVdFNiZGJEZVAvZnlOQT0tLXdKc2Q1UEo5b2V1WWtnRWZvTU91MGc9PQ==--4e42ab7c6a6e0029de392caaaeca797b11b5f57d
[abortable-fetch]: https://developers.google.com/web/updates/2017/09/abortable-fetch

<!-- prettier-ignore-end -->
