export type Route =
  | { name: 'dashboard' }
  | { name: 'meetings-new' }
  | { name: 'meetings'; week: string | null }
  | { name: 'quick-notes' }
  | { name: 'outputs-select'; meetingId: string }
  | { name: 'outputs-review'; meetingId: string }
  | { name: 'repository'; params: URLSearchParams };

const BASE = import.meta.env.BASE_URL ?? '/';

function stripBase(pathname: string): string {
  if (BASE && BASE !== '/' && pathname.startsWith(BASE)) {
    return pathname.slice(BASE.length - 1) || '/';
  }
  return pathname;
}

export function parsePath(): Route {
  const { pathname, search } = window.location;
  const path = stripBase(pathname);
  const params = new URLSearchParams(search);
  if (path === '/' || path === '/dashboard') return { name: 'dashboard' };
  if (path === '/meetings/new') return { name: 'meetings-new' };
  if (path === '/meetings') return { name: 'meetings', week: params.get('week') };
  if (path === '/quick-notes') return { name: 'quick-notes' };
  const selectMatch = path.match(/^\/outputs\/select\/([^/]+)$/);
  if (selectMatch) return { name: 'outputs-select', meetingId: selectMatch[1] };
  const reviewMatch = path.match(/^\/outputs\/review\/([^/]+)$/);
  if (reviewMatch) return { name: 'outputs-review', meetingId: reviewMatch[1] };
  if (path === '/repository') return { name: 'repository', params };
  return { name: 'dashboard' };
}

export function navigate(path: string): void {
  const full = BASE && BASE !== '/' ? `${BASE.replace(/\/$/, '')}${path}` : path;
  window.history.pushState({}, '', full);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function routeKey(route: Route): string {
  if (route.name === 'repository') return `${route.name}:${route.params.toString()}`;
  return route.name;
}

export function breadcrumbFor(route: Route): string {
  switch (route.name) {
    case 'dashboard':
      return 'Dashboard';
    case 'meetings-new':
      return 'Meetings / New Meeting';
    case 'meetings':
      return 'Meetings';
    case 'quick-notes':
      return 'Quick Notes';
    case 'outputs-select':
      return 'Outputs / Select';
    case 'outputs-review':
      return 'Outputs / Review';
    case 'repository':
      return 'Follow-up Repository';
  }
}