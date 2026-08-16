export type Route =
  | { name: 'dashboard' }
  | { name: 'meetings-new' }
  | { name: 'meetings'; week: string | null }
  | { name: 'quick-notes' }
  | { name: 'outputs-select'; meetingId: string }
  | { name: 'outputs-review'; meetingId: string }
  | { name: 'repository'; params: URLSearchParams };

export function parsePath(): Route {
  const { pathname, search } = window.location;
  const params = new URLSearchParams(search);
  if (pathname === '/' || pathname === '/dashboard') return { name: 'dashboard' };
  if (pathname === '/meetings/new') return { name: 'meetings-new' };
  if (pathname === '/meetings') return { name: 'meetings', week: params.get('week') };
  if (pathname === '/quick-notes') return { name: 'quick-notes' };
  const selectMatch = pathname.match(/^\/outputs\/select\/([^/]+)$/);
  if (selectMatch) return { name: 'outputs-select', meetingId: selectMatch[1] };
  const reviewMatch = pathname.match(/^\/outputs\/review\/([^/]+)$/);
  if (reviewMatch) return { name: 'outputs-review', meetingId: reviewMatch[1] };
  if (pathname === '/repository') return { name: 'repository', params };
  return { name: 'dashboard' };
}

export function navigate(path: string): void {
  window.history.pushState({}, '', path);
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