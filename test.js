const path = require('path');

const test = require('prova');
const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const devnull = require('dev-null');
const qs = require('q-stream');


test('Prints `--help`', (assert) => {
  assert.plan(3);

  const child = { spawnSync: (command, args) => {
    assert.equal(command, 'man',
      'spawns `man`'
    );

    assert.equal(
      args[0],
      path.resolve(__dirname, 'manpages/elm-live.1'),
      'with the right manpage'
    );
  } };

  const elmLive = proxyquire('./source/elm-live', { 'child_process': child });

  const exitCode = elmLive(['--help'], { stream: devnull() });

  assert.equal(exitCode, 0,
    'succeeds'
  );
});


test('Shouts if `elm-make` can’t be found', (assert) => {
  assert.plan(3);

  const expectedMessage = new RegExp(
`^elm-live:
  I can’t find the command \`elm-make\`!`
  );

  const child = { execFile: (command) => {
    assert.equal(command, 'elm-make',
      'executes `elm-make`'
    );

    return { error: { code: 'ENOENT' } };
  } };

  const elmLive = proxyquire('./source/elm-live', { 'child_process': child });

  const exitCode = elmLive([], { stream: qs((chunk) => {
    assert.ok(
      expectedMessage.test(chunk),
      'prints an informative message'
    );
  }) });

  assert.equal(exitCode, 1,
    'fails'
  );
});


test('Prints any other `elm-make` error', (assert) => {
  assert.plan(3);

  const message = 'whatever';
  const status = 9;

  const child = { execFile: (command) => {
    assert.equal(command, 'elm-make',
      'executes `elm-make`'
    );

    return { status, error: { toString: () => message } };
  } };

  const elmLive = proxyquire('./source/elm-live', { 'child_process': child });

  const exitCode = elmLive([], { stream: qs((chunk) => {
    assert.equal(
      chunk,
      (
`elm-live: Error while calling \`elm-make\`! The output may be helpful:
  ${ message }

`
      ),
      'prints the error’s output'
    );
  }) });

  assert.equal(exitCode, status,
    'exits with whatever code `elm-make` returned'
  );
});


test('Passes correct args to `elm-make`', (assert) => {
  assert.plan(2);

  const elmLiveArgs = ['--port=77'];
  const otherArgs =
    ['--anything', 'whatever', 'whatever 2', '--beep=boop', '--no-flag'];

  const child = { execFile: (command, args) => {
    assert.equal(command, 'elm-make',
      'executes `elm-make`'
    );

    assert.deepEqual(
      args,
      otherArgs,
      'passes all not understood arguments'
    );

    // Kill after one attempt
    return { status: 77, error: {} };
  } };

  const elmLive = proxyquire('./source/elm-live', { 'child_process': child });
  elmLive(elmLiveArgs.concat(otherArgs), { stream: devnull() });
});


test('Disambiguates `elm-make` args with `--`', (assert) => {
  assert.plan(2);

  const elmMakeBefore =
    ['--anything', 'whatever', 'whatever 2'];
  const elmLiveBefore =
    ['--open'];
  const elmMakeAfter =
    ['--port=77', '--beep=boop'];
  const allArgs = [].concat(
    elmMakeBefore,
    elmLiveBefore,
    ['--'],
    elmMakeAfter
  );

  const child = { execFile: (command, args) => {
    assert.equal(command, 'elm-make',
      'executes `elm-make`'
    );

    assert.deepEqual(
      args,
      elmMakeBefore.concat(elmMakeAfter),
      'passes all not understood commands and all commands after the `--` ' +
      'to elm-make'
    );

    // Kill after one attempt
    return { status: 77, error: {} };
  } };

  const elmLive = proxyquire('./source/elm-live', { 'child_process': child });
  elmLive(allArgs, { stream: devnull() });
});


test('Redirects elm-make output', (assert) => {
  const testOutput = (
`Hello there!
How’s it going?
`
  );

  const child = { execFile: (command, _, options) => {
    assert.equal(command, 'elm-make',
      'executes `elm-make`'
    );

    options.stdio[1].write(testOutput);

    return {};
  } };

  const elmLive = proxyquire('./source/elm-live', { 'child_process': child });
  elmLive([], { stream: qs((chunk) => {
    assert.equal(
      chunk,
`elm-make:
  Hello there!
  How’s it going?

`,
      'prints the output, annotated and indented'
    );

    assert.end();
  }) });
});


// Starts budo at the specified `--port`


// `--open`s the default browser


// Reruns elm-make whenever an Elm file is changes
