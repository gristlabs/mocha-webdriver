import {assert} from '../lib';
import {serializeCalls} from '../lib/serialize-calls';

interface IResolver {
  resolve(value: string): void;
  reject(err: Error): void;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('serialize-calls', () => {
  it('should serialize calls', async () => {
    // The test for serializeCalls is a bit tricky. We make in parallel a bunch of calls: each one
    // will add an event to the events array when it starts and when it resolves or fails.
    const calls = new Map<string, IResolver>();
    const events: string[] = [];

    // This is a "call": we can tell when it was made and when it finished by looking at the
    // events array.
    async function makeCall(id: string): Promise<void> {
      events.push(`${id} called`);
      try {
        const r = await new Promise<string>((resolve, reject) => calls.set(id, {resolve, reject}));
        events.push(`${id} returned ${r}`);
      } catch (err) {
        events.push(`${id} threw ${err.message}`);
      }
    }

    // While the calls are pending, we run also this "resolver" function, which resolves the calls
    // with the given IDs in the specified order. Depending on the ID, it may reject a call
    // instead, to test that errors are processed as well.
    async function resolveCalls(ids: string[]): Promise<void> {
      for (const id of ids) {
        await delay(1);
        if (id.startsWith('Err')) {
          calls.get(id)!.reject(new Error(id.toUpperCase()));
        } else {
          calls.get(id)!.resolve(id.toUpperCase());
        }
        calls.delete(id);
      }
    }

    // With the plain call, all calls are made at once, and resolved in whatever order we
    // specified. This is to show that this test is doing what we want.
    await Promise.all([
      Promise.all(['a1', 'a2', 'a3', 'a4', 'a5', 'Err1', 'a6', 'Err2'].map(makeCall)),
      resolveCalls(['a1', 'a3', 'a4', 'a2', 'Err1', 'a5', 'a6', 'Err2']),
    ]);
    assert.deepEqual(events, [
      "a1 called",
      "a2 called",
      "a3 called",
      "a4 called",
      "a5 called",
      "Err1 called",
      "a6 called",
      "Err2 called",
      "a1 returned A1",
      "a3 returned A3",
      "a4 returned A4",
      "a2 returned A2",
      "Err1 threw ERR1",
      "a5 returned A5",
      "a6 returned A6",
      "Err2 threw ERR2",
    ]);

    // Clear the events array.
    events.splice(0, events.length);

    // The actual test is of the serialized version of makeCall. The resolutions are in the same
    // order, but calls are only made to keep at most 3 in-progress calls.
    const serializedMakeCall = serializeCalls(makeCall, 3);
    await Promise.all([
      Promise.all(['a1', 'a2', 'a3', 'a4', 'a5', 'Err1', 'a6', 'Err2'].map(serializedMakeCall)),
      resolveCalls(['a1', 'a3', 'a4', 'a2', 'Err1', 'a5', 'a6', 'Err2']),
    ]);
    assert.deepEqual(events, [
      "a1 called",
      "a2 called",
      "a3 called",
      "a1 returned A1",
      "a4 called",
      "a3 returned A3",
      "a5 called",
      "a4 returned A4",
      "Err1 called",
      "a2 returned A2",
      "a6 called",
      "Err1 threw ERR1",
      "Err2 called",
      "a5 returned A5",
      "a6 returned A6",
      "Err2 threw ERR2",
    ]);
  });
});
