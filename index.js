import unfetch from 'unfetch';
import mitt from 'mitt';

export default (url, options = {}) => {
	const { xhr, promise, isAborted: baseIsAborted, resolve, reject } = unfetch(
		url,
		options
	);
	const emitter = mitt();
	const signal = options.signal;

	let pendingPromise, isAborted, abort;

	xhr.onprogress = (e) => {
		emitter.emit('download', e);
	};
	xhr.upload.onprogress = (e) => {
		emitter.emit('upload', e);
	};

	const resolvePendingPromise = () => {
		pendingPromise ?? (pendingPromise = promise());
		return pendingPromise;
	};

	const onEvent = (eventName, handler) => {
		emitter.on(eventName, handler);
		return () => {
			emitter.off(eventName, handler);
		};
	};

	const request = resolvePendingPromise;

	if (signal) {
		let abortError;
		try {
			abortError = new DOMException('Aborted', 'AbortError');
		} catch (error) {
			abortError = new Error('Aborted');
			abortError.name = 'AbortError';
		}

		isAborted = () => {
			throw new Error('Use `AbortSignal.aborted` instead.');
		};
		abort = () => {
			throw new Error('Use `AbortController.abort()` instead.');
		};

		const abortHandler = () => {
			xhr.abort();
			resolvePendingPromise();
			reject()(abortError);
		};

		signal.onabort = abortHandler;

		if (signal.aborted) {
			abortHandler();
		}
	} else {
		isAborted = baseIsAborted;
		abort = () => {
			resolvePendingPromise();
			xhr.abort();
		};
		xhr.onabort = (e) => {
			resolvePendingPromise();
			resolve()(e);
		};
	}

	return {
		request,
		abort,
		isAborted,
		onEvent
	};
};
