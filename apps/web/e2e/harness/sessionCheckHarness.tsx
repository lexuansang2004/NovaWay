import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { getSessionSnapshot, retrySessionCheck, subscribeToSession } from '@/services/authSession';
import { useSessionCheck } from '@/services/useSessionCheck';

// Test-only page for e2e/session-check.hook.spec.ts (WEB-01, review round 1
// finding R01). It mounts the REAL useSessionCheck hook on top of the real
// session store, auth service and API client, so the lifecycle under test —
// which request a mount owns, and what its cleanup cancels — is the
// production one. Not part of the app bundle: nothing in src/ imports it, and
// it is only reachable through the Vite dev server.
//
// The one thing replaced is the transport. Every /api/ request is held open
// until the test answers it, and the AbortSignal is recorded but NOT obeyed,
// so "the answer still arrives after the request was given up on" stays a
// real case instead of being made impossible by abort().

interface HeldRequest {
  authorization: string | undefined;
  signal: AbortSignal | undefined;
  respond: (status: number, body: unknown) => void;
  fail: () => void;
}

const TOKEN_KEY = 'novaway_web_token';
const requests: HeldRequest[] = [];
const realFetch = window.fetch.bind(window);

window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  if (!String(input).includes('/api/')) return realFetch(input, init);
  return new Promise<Response>((resolve, reject) => {
    requests.push({
      authorization: (init.headers as Record<string, string> | undefined)?.Authorization,
      signal: init.signal ?? undefined,
      respond: (status, body) =>
        resolve(
          new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
        ),
      fail: () => reject(new TypeError('Failed to fetch')),
    });
  });
};

let notifications = 0;
subscribeToSession(() => {
  notifications += 1;
});

// --- Lifecycle barrier (review round 2, finding R03) -------------------------
//
// root.render() only SCHEDULES work. When it returns, React has neither
// removed the old page from the DOM nor run its effect cleanup — and the
// cleanup of a useEffect runs in a later pass than the DOM removal, so "the
// element is gone" does not mean "the cleanup ran" either. A test that
// answers a request right after calling mount([]) may therefore be answering
// a page that is still mounted, which is not the "after unmount" case at all.
//
// So the harness reports the lifecycle itself. Each probe registers through
// its own effect; that effect and useSessionCheck's effect are set up and
// torn down by React in the same pass. `live` therefore only reaches the
// requested set once the real hook's effects/cleanups for that change have
// run. The comparison happens in a microtask, i.e. after React has finished
// the whole synchronous pass (StrictMode's mount → cleanup → mount included),
// so it does not depend on the order of the two effects inside the component.
// No timers are involved: the tests run with a fake clock.
const live = new Set<string>();
let requested: string[] = [];
let waiting: Array<() => void> = [];

function resolveIfSettled() {
  if (live.size !== requested.length || !requested.every((name) => live.has(name))) return;
  const resolvers = waiting;
  waiting = [];
  for (const resolve of resolvers) resolve();
}

const checkAfterThisPass = () => queueMicrotask(resolveIfSettled);

// Resolves once the mounted probes are exactly the requested ones and their
// effects (or cleanups) have run.
function whenSettled(): Promise<void> {
  return new Promise((resolve) => {
    waiting.push(resolve);
    checkAfterThisPass();
  });
}

// Exported only so React Fast Refresh treats this file as a component module.
export function Probe({ name }: { name: string }) {
  const session = useSessionCheck();

  useEffect(() => {
    live.add(name);
    checkAfterThisPass();
    return () => {
      live.delete(name);
      checkAfterThisPass();
    };
  }, [name]);

  return (
    <section data-probe={name}>
      <output data-testid={`${name}-status`}>{session.status}</output>
      <output data-testid={`${name}-user`}>{session.user?.email ?? ''}</output>
      <button type="button" onClick={retrySessionCheck}>
        Retry {name}
      </button>
    </section>
  );
}

const params = new URLSearchParams(window.location.search);
const strict = params.get('strict') === '1';
const root = createRoot(document.getElementById('root')!);

// Each name is one mounted page using the hook. Re-rendering with a different
// list unmounts and mounts by key, exactly like navigating between two pages
// that both check the session. The returned promise is the barrier above:
// awaiting it is what makes "after unmount" true.
function mount(names: string[]): Promise<void> {
  requested = [...names];
  const probes = names.map((name) => <Probe key={name} name={name} />);
  root.render(strict ? <StrictMode>{probes}</StrictMode> : <>{probes}</>);
  return whenSettled();
}

const sessionHarness = {
  mount,
  whenSettled,
  respond: (index: number, status: number, body: unknown) => requests[index].respond(status, body),
  fail: (index: number) => requests[index].fail(),
  state: () => ({
    snapshot: getSessionSnapshot(),
    notifications,
    token: sessionStorage.getItem(TOKEN_KEY),
    // Probes whose effects are currently set up — not just present in the DOM.
    live: [...live].sort(),
    requests: requests.map((request) => ({
      authorization: request.authorization,
      aborted: request.signal?.aborted ?? null,
    })),
  }),
};

declare global {
  interface Window {
    sessionHarness: typeof sessionHarness;
  }
}

window.sessionHarness = sessionHarness;
void mount((params.get('mount') ?? 'a').split(',').filter(Boolean));
