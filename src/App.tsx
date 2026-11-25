import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { OfflineIndicator } from '@/src/components/common/OfflineIndicator';
import { HelpPage } from '@/src/pages/HelpPage';
import { LandingPage } from '@/src/pages/LandingPage';
import { PrivacyPolicyPage } from '@/src/pages/PrivacyPolicyPage';
import { RoomWorkspacePage } from '@/src/pages/RoomWorkspacePage';
import { extractRoomCodeFromInput } from '@/src/lib/validation/schemas';
import type { AppRoute } from '@/src/types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function parseRouteFromLocation(): { route: AppRoute; inviteCode: string } {
  const path = window.location.pathname;
  const search = new URLSearchParams(window.location.search);
  const codeQuery = search.get('code') || '';

  if (path === '/privacy') {
    return { route: { view: 'privacy' }, inviteCode: '' };
  }
  if (path === '/help') {
    return { route: { view: 'help' }, inviteCode: '' };
  }

  const roomMatch = path.match(/^\/room\/(\d{6})$/);
  if (roomMatch) {
    return { route: { view: 'room', roomCode: roomMatch[1] }, inviteCode: '' };
  }

  const validCode = extractRoomCodeFromInput(codeQuery) || '';
  return { route: { view: 'landing' }, inviteCode: validCode };
}

export default function App() {
  const initial = parseRouteFromLocation();
  const [route, setRoute] = useState<AppRoute>(initial.route);
  const [inviteCode, setInviteCode] = useState<string>(initial.inviteCode);
  const [roomSessionIds, setRoomSessionIds] = useState<{ roomId?: string; memberId?: string }>({});

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseRouteFromLocation();
      setRoute(parsed.route);
      setInviteCode(parsed.inviteCode);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = (nextPath: string, nextRoute: AppRoute) => {
    window.history.pushState({}, '', nextPath);
    setRoute(nextRoute);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" richColors closeButton />
      <OfflineIndicator />

      {route.view === 'landing' && (
        <LandingPage
          initialJoinCode={inviteCode}
          onNavigateRoom={(roomCode, roomId, memberId) => {
            setRoomSessionIds({ roomId, memberId });
            navigateTo(`/room/${roomCode}`, { view: 'room', roomCode });
          }}
          onNavigatePage={(page) => navigateTo(`/${page}`, { view: page })}
        />
      )}

      {route.view === 'room' && (
        <RoomWorkspacePage
          roomCode={route.roomCode}
          initialRoomId={roomSessionIds.roomId}
          initialMemberId={roomSessionIds.memberId}
          onExitRoom={() => {
            setRoomSessionIds({});
            setInviteCode('');
            navigateTo('/', { view: 'landing' });
          }}
        />
      )}

      {route.view === 'privacy' && (
        <PrivacyPolicyPage onBack={() => navigateTo('/', { view: 'landing' })} />
      )}

      {route.view === 'help' && (
        <HelpPage onBack={() => navigateTo('/', { view: 'landing' })} />
      )}
    </QueryClientProvider>
  );
}
