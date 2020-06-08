import assert from 'assert';
import sinon from 'sinon';
import fn from '../index';

before(function() {
	window.fixture.load('/test/fixtures/index.html');
});

after(function() {
	window.fixture.cleanup();
});

it('should process request', async function() {
	const { request } = fn('/test/get');

	const response = await request();
	const json = await response.json();

	assert.equal(response.status, 200);
	assert.equal(json.response, 'becky');
});

it('should abort unstarted request', async function() {
	const { request, abort, isAborted } = fn('/test/delay');

	abort();

	const response = await request();

	assert.equal(response.ok, false);
	assert.equal(response.status, 0);
	assert.equal(isAborted(), true);
});

it('should abort started request', async function() {
	const { request, abort, isAborted } = fn('/test/delay');

	setTimeout(abort, 1000);

	const response = await request();

	assert.equal(response.ok, false);
	assert.equal(response.status, 0);
	assert.equal(isAborted(), true);
});

it('should abort unstarted request with AbortController', async function() {
	const controller = new AbortController();
	const signal = controller.signal;
	const { request, abort, isAborted } = fn('/test/delay', { signal });

	assert.throws(() => {
		abort();
	}, /AbortController\.abort/);

	controller.abort();

	try {
		await request();
	} catch (error) {
		assert.equal(error.name, 'AbortError');
		assert.throws(() => {
			isAborted();
		}, /AbortSignal\.aborted/);
	}
});

it('should abort started request with AbortController', async function() {
	const controller = new AbortController();
	const signal = controller.signal;
	const { request, abort, isAborted } = fn('/test/delay', { signal });

	setTimeout(() => {
		assert.throws(() => {
			abort();
		}, /AbortController\.abort/);
		controller.abort();
	}, 1000);

	try {
		await request();
	} catch (error) {
		assert.equal(error.name, 'AbortError');
		assert.throws(() => {
			isAborted();
		}, /AbortSignal\.aborted/);
	}
});

it('should monitor download progress', async function() {
	const spy = sinon.spy();
	const { request, onEvent } = fn('/test/delay');

	const unlisten = onEvent('download', spy);

	await request();

	const [argument] = spy.firstCall.args;

	assert.ok(spy.called);
	assert.equal(argument.type, 'progress');
	unlisten();
});

it('should monitor upload progress', async function() {
	const spy = sinon.spy();

	const formData = new FormData();
	const { request, onEvent } = fn('/test/delay', {
		method: 'POST',
		body: formData
	});

	const unlisten = onEvent('upload', spy);

	await request();

	const [argument] = spy.firstCall.args;

	assert.ok(spy.called);
	assert.equal(argument.type, 'progress');
	unlisten();
});
