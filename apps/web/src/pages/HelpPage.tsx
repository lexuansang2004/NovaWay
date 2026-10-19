import { useCallback, useEffect, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HELP_INTRO, HELP_SECTIONS } from '@/pages/helpContent';

// WEB-10 (docs/web/WEB_ACCOUNT_RWD_SPEC.md §4.5, FR-WEBHELP-01…03).
// Static help: it makes no request of its own (AppLayout's GET /api/auth/me is
// the only traffic) and has no form, button or contact channel. The content
// and its traceability live in helpContent.ts / docs/web/WEB_HELP_CONTENT_MAP.md.
//
// Table-of-contents and in-page links target the section heading. The heading
// is focusable (tabIndex -1) and receives focus, so the next Tab continues
// inside that section; <main> is the scroll container and the mobile header
// sits outside it, so a heading scrolled to the top of <main> is never under
// the header. The hash is kept in the URL, so a deep link or a reload to
// /help#section lands on the same heading once the session check is done.

const linkClass =
  'inline-flex min-h-11 w-fit max-w-full items-center rounded-lg border border-cyan-400/30 px-4 py-2 text-sm font-medium text-cyan-200 [overflow-wrap:anywhere] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300';

const SECTION_IDS = new Set(HELP_SECTIONS.map((section) => section.id));

// The URL fragment is outside input. It names a target only if it decodes to
// one of the help sections above; a malformed escape (`#%`, a cut UTF-8
// sequence), an empty fragment or any other id is no target. The try covers
// only the decoding, so a bad fragment cannot reach the global ErrorBoundary.
function sectionFromHash(hash: string): string | null {
  if (hash.length < 2) return null;
  let id: string;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return null;
  }
  return SECTION_IDS.has(id) ? id : null;
}

function focusSection(id: string) {
  const heading = document.getElementById(id);
  if (!heading) return;
  heading.scrollIntoView({ block: 'start' });
  heading.focus({ preventScroll: true });
}

export default function HelpPage() {
  const { hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const id = sectionFromHash(hash);
    if (id) focusSection(id);
  }, [hash]);

  const goToSection = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, id: string) => {
      event.preventDefault();
      // Same hash again: the effect would not re-run, so move there directly.
      if (hash === `#${id}`) focusSection(id);
      else navigate({ hash: `#${id}` });
    },
    [hash, navigate],
  );

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 px-3 py-6 sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white [overflow-wrap:anywhere]">Trợ giúp</h1>
        <p className="text-sm text-slate-300 [overflow-wrap:anywhere]">{HELP_INTRO}</p>
      </div>

      <nav aria-label="Mục lục trợ giúp" className="min-w-0 rounded-2xl border border-cyan-400/20 bg-slate-900/50 p-4 sm:p-6">
        <h2 className="text-sm font-medium text-slate-400">Mục lục</h2>
        <ol className="mt-2 flex min-w-0 list-decimal flex-col gap-1 pl-6 text-cyan-200 marker:text-slate-500">
          {HELP_SECTIONS.map((section) => (
            <li key={section.id} className="min-w-0">
              <a
                href={`#${section.id}`}
                onClick={(event) => goToSection(event, section.id)}
                className="inline-flex min-h-11 max-w-full items-center rounded-lg px-2 text-sm font-medium [overflow-wrap:anywhere] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {HELP_SECTIONS.map((section) => (
        <section
          key={section.id}
          aria-labelledby={section.id}
          className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-4 sm:p-6"
        >
          <h2
            id={section.id}
            tabIndex={-1}
            className="scroll-mt-4 rounded text-lg font-semibold text-white [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            {section.title}
          </h2>
          <ul className="flex min-w-0 list-disc flex-col gap-2 pl-5 text-sm text-slate-200 marker:text-slate-500">
            {section.items.map((item) => (
              <li key={item.id} data-help-id={item.id} className="min-w-0 [overflow-wrap:anywhere]">
                {item.text}
              </li>
            ))}
          </ul>
          {section.link && (
            <Link to={section.link.to} className={linkClass}>
              {section.link.label}
            </Link>
          )}
          {section.seeAlso && (
            <a
              href={`#${section.seeAlso.sectionId}`}
              onClick={(event) => goToSection(event, section.seeAlso!.sectionId)}
              className={linkClass}
            >
              {section.seeAlso.label}
            </a>
          )}
        </section>
      ))}
    </div>
  );
}
