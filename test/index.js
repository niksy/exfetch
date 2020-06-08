import assert from 'assert';
import fn from '../index';

before(function() {
	window.fixture.load('/test/fixtures/index.html');
});

after(function() {
	window.fixture.cleanup();
});

it('test!', function() {
	// …
});
