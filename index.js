import unfetch from 'unfetch';
import mitt from 'mitt';

/**
 * @param  {string} eventName
 *
 * @returns {Event}
 */
function createNewEvent(eventName) {
	let event;
	if (typeof Event === 'function') {
		event = new Event(eventName);
	} else {
		event = document.createEvent('Event');
		event.initEvent(eventName, false, false);
	}
	return event;
}

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
		let abortError, internalSignalAborted;
		try {
			abortError = new DOMException('Aborted', 'AbortError');
		} catch (error) {
			abortError = new Error('Aborted');
			abortError.name = 'AbortError';
		}

		isAborted = () => {
			if (internalSignalAborted) {
				return internalSignalAborted;
			}
			return signal.aborted;
		};
		abort = () => {
			signal.dispatchEvent(createNewEvent('abort'));
		};

		const abortHandler = () => {
			if (internalSignalAborted) {
				return;
			}
			internalSignalAborted = true;
			xhr.abort();
			resolvePendingPromise();
			reject()(abortError);
		};

		signal.onabort = abortHandler;

		if (isAborted()) {
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
