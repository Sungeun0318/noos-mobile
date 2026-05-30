import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

function isActive(status: AppStateStatus) {
  return status === 'active';
}

export function useAppActive() {
  const [appActive, setAppActive] = useState(() => isActive(AppState.currentState));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppActive(isActive(nextState));
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return appActive;
}
