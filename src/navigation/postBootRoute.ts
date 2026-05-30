export type PostBootRoute = 'Onboarding' | 'MainTabs' | 'Settings/Home';

export function getPostBootRoute(hasOnboarded: boolean, backendBaseUrl: string): PostBootRoute {
  if (!hasOnboarded) {
    return 'Onboarding';
  }

  return backendBaseUrl ? 'MainTabs' : 'Settings/Home';
}
