import { useEffect, useState } from 'react';
import Sidebar, { MobileNav } from './components/Sidebar';
import TopBar from './components/TopBar';
import { ToastProvider } from './components/Toast';
import Dashboard from './pages/Dashboard';
import NewMeeting from './pages/NewMeeting';
import Meetings from './pages/Meetings';
import QuickNotes from './pages/QuickNotes';
import OutputSelection from './pages/OutputSelection';
import OutputReview from './pages/OutputReview';
import Repository from './pages/Repository';
import { parsePath, routeKey, type Route } from './lib/router';

export default function App() {
  const [route, setRoute] = useState<Route>(() => parsePath());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const onPop = () => {
      setRoute(parsePath());
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const renderPage = () => {
    const key = routeKey(route);
    switch (route.name) {
      case 'dashboard':
        return <Dashboard key={key} />;
      case 'meetings-new':
        return <NewMeeting key={key} />;
      case 'meetings':
        return <Meetings key={key} week={route.week} />;
      case 'quick-notes':
        return <QuickNotes key={key} />;
      case 'outputs-select':
        return <OutputSelection key={key} meetingId={route.meetingId} />;
      case 'outputs-review':
        return <OutputReview key={key} meetingId={route.meetingId} />;
      case 'repository':
        return <Repository key={key} params={route.params} />;
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen">
        <Sidebar route={route} />
        <MobileNav route={route} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        <div className="md:pl-64">
          <TopBar route={route} onMenuOpen={() => setMobileNavOpen(true)} />
          <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">{renderPage()}</main>
        </div>
      </div>
    </ToastProvider>
  );
}