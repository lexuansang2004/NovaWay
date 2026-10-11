import { StrictMode } from 'react';
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

// Exported only so React Fast Refresh treats this file as a component module.
export function Probe({ name }: { name: string }) {
  const session = useSessionCheck();
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
// that both check the session.
function render(names: string[]) {
  const probes = names.map((name) => <Probe key={name} name={name} />);
  root.render(strict ? <StrictMode>{probes}</StrictMode> : <>{probes}</>);
}

const sessionHarness = {
  mount: render,
  respond: (index: number, status: number, body: unknown) => requests[index].respond(status, body),
  fail: (index: number) => requests[index].fail(),
  state: () => ({
    snapshot: getSessionSnapshot(),
    notifications,
    token: sessionStorage.getItem(TOKEN_KEY),
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
render((params.get('mount') ?? 'a').split(',').filter(Boolean));
