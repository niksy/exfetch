'use strict';

const babel = require('rollup-plugin-babel');
const resolve = require('rollup-plugin-node-resolve');
const babelCore = require('@babel/core');

const unfetchId = 'unfetch';

module.exports = {
	input: 'index.js',
	output: [
		{
			file: 'index.cjs.js',
			format: 'cjs',
			sourcemap: true
		},
		{
			file: 'index.esm.js',
			format: 'esm',
			sourcemap: true
		}
	],
	external: ['mitt'],
	plugins: [
		babel({
			exclude: 'node_modules/**'
		}),
		resolve({
			only: [unfetchId]
		}),
		{
			async transform(code, id) {
				if (id.includes(unfetchId)) {
					const result = await babelCore.transformAsync(code, {
						sourceMaps: true,
						plugins: [
							babelCore.createConfigItem(({ types: t }) => {
								let returnResolved = false;
								let promiseResolved = false;
								let onloadResolved = false;
								let onerrorResolved = false;

								const xhrIdentifier = '__xhr__';
								const promiseIdentifier = '__promise__';
								const isAbortedIdentifier = '__isAborted__';
								const resolveIdentifier = '__resolve__';
								const rejectIdentifier = '__reject__';

								return {
									visitor: {
										ReturnStatement(path) {
											if (returnResolved) {
												return;
											}
											returnResolved = true;
											const argument = path.get(
												'argument'
											).node;
											path.insertBefore(
												t.variableDeclaration('var', [
													t.variableDeclarator(
														t.identifier(
															xhrIdentifier
														),
														t.newExpression(
															t.identifier(
																'XMLHttpRequest'
															),
															[]
														)
													)
												])
											);
											path.insertBefore(
												t.variableDeclaration('var', [
													t.variableDeclarator(
														t.identifier(
															isAbortedIdentifier
														),
														t.booleanLiteral(false)
													)
												])
											);
											path.insertBefore(
												t.variableDeclaration('var', [
													t.variableDeclarator(
														t.identifier(
															resolveIdentifier
														)
													)
												])
											);
											path.insertBefore(
												t.variableDeclaration('var', [
													t.variableDeclarator(
														t.identifier(
															rejectIdentifier
														)
													)
												])
											);
											path.insertBefore(
												t.variableDeclaration('var', [
													t.variableDeclarator(
														t.identifier(
															promiseIdentifier
														)
													)
												])
											);

											path.replaceWith(
												t.expressionStatement(argument)
											);
										},
										NewExpression(path) {
											const isXHR =
												path.get('callee.name').node ===
													'XMLHttpRequest' &&
												path.findParent(
													(path) =>
														path.isVariableDeclarator() &&
														path.get('id.name')
															.node !==
															xhrIdentifier
												);
											const isPromise =
												path.get('callee.name').node ===
												'Promise';
											if (isXHR) {
												path.replaceWith(
													t.identifier(xhrIdentifier)
												);
											}
											if (isPromise && !promiseResolved) {
												promiseResolved = true;
												path.replaceWith(
													t.assignmentExpression(
														'=',
														t.identifier(
															promiseIdentifier
														),
														t.functionExpression(
															null,
															[],
															t.blockStatement([
																t.returnStatement(
																	path.node
																)
															])
														)
													)
												);
											}
										},
										ExportDefaultDeclaration(path) {
											path.get(
												'declaration.body'
											).pushContainer(
												'body',
												t.returnStatement(
													t.objectExpression([
														t.objectProperty(
															t.identifier(
																xhrIdentifier.replace(
																	/__/g,
																	''
																)
															),
															t.identifier(
																xhrIdentifier
															)
														),
														t.objectProperty(
															t.identifier(
																promiseIdentifier.replace(
																	/__/g,
																	''
																)
															),
															t.identifier(
																promiseIdentifier
															)
														),
														t.objectProperty(
															t.identifier(
																resolveIdentifier.replace(
																	/__/g,
																	''
																)
															),
															t.functionExpression(
																null,
																[],
																t.blockStatement(
																	[
																		t.returnStatement(
																			t.identifier(
																				resolveIdentifier
																			)
																		)
																	]
																)
															)
														),
														t.objectProperty(
															t.identifier(
																rejectIdentifier.replace(
																	/__/g,
																	''
																)
															),
															t.functionExpression(
																null,
																[],
																t.blockStatement(
																	[
																		t.returnStatement(
																			t.identifier(
																				rejectIdentifier
																			)
																		)
																	]
																)
															)
														),
														t.objectProperty(
															t.identifier(
																isAbortedIdentifier.replace(
																	/__/g,
																	''
																)
															),
															t.functionExpression(
																null,
																[],
																t.blockStatement(
																	[
																		t.returnStatement(
																			t.identifier(
																				isAbortedIdentifier
																			)
																		)
																	]
																)
															)
														)
													])
												)
											);
										},
										Identifier(path) {
											const isOnload =
												path.get('name').node ===
												'onload';
											const isOnerror =
												path.get('name').node ===
												'onerror';

											if (isOnload) {
												const parent = path.findParent(
													(path) =>
														path.isAssignmentExpression()
												);
												const onloadFn = parent.get(
													'right'
												);
												if (!onloadResolved) {
													onloadResolved = true;
													onloadFn.unshiftContainer(
														'params',
														t.identifier('e')
													);
													onloadFn
														.get('body')
														.unshiftContainer(
															'body',
															t.expressionStatement(
																t.assignmentExpression(
																	'=',
																	t.identifier(
																		isAbortedIdentifier
																	),
																	t.binaryExpression(
																		'===',
																		t.memberExpression(
																			t.identifier(
																				'e'
																			),
																			t.identifier(
																				'type'
																			)
																		),
																		t.stringLiteral(
																			'abort'
																		)
																	)
																)
															)
														);
													onloadFn.replaceWith(
														t.assignmentExpression(
															'=',
															t.identifier(
																resolveIdentifier
															),
															onloadFn.node
														)
													);
												}
											}
											if (isOnerror) {
												const parent = path.findParent(
													(path) =>
														path.isAssignmentExpression()
												);
												const onError = parent.get(
													'right'
												);
												if (!onerrorResolved) {
													onerrorResolved = true;
													onError.replaceWith(
														t.assignmentExpression(
															'=',
															t.identifier(
																rejectIdentifier
															),
															onError.node
														)
													);
												}
											}
										}
									}
								};
							})
						]
					});
					return {
						code: result.code,
						map: result.map
					};
				}
				return {
					code: code,
					map: null
				};
			}
		}
	]
};
