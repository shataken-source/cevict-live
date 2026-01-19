import { SessionTimeoutWarning } from './SessionTimeoutWarning';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';

export default function SessionTimeoutWarningWrapper() {
  const { showWarning, remainingSeconds, handleExtend, handleLogout } = useSessionMonitor();

  return (
    <SessionTimeoutWarning
      isOpen={showWarning}
      remainingSeconds={remainingSeconds}
      onExtend={handleExtend}
      onLogout={handleLogout}
    />
  );
}
