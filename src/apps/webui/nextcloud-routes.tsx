import { lazy } from 'react';

const NextcloudLoginView = lazy(() =>
  import('@/components/public/components/NextcloudLoginView').then(m => ({ default: m.NextcloudLoginView })),
);

export const renderNextcloudPublicPage = (page: string) => {
  if (page === 'nextcloud-login') {
    return <NextcloudLoginView />;
  }
  return null;
};
