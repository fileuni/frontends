import { lazy } from 'react';

const NextcloudLoginView = lazy(() =>
  import('@/components/public/components/NextcloudLoginView').then(m => ({ default: m.NextcloudLoginView })),
);
const NextcloudDirectEditingView = lazy(() =>
  import('@/components/public/components/NextcloudDirectEditingView').then(m => ({ default: m.NextcloudDirectEditingView })),
);

export const renderNextcloudPublicPage = (page: string) => {
  if (page === 'nextcloud-login') {
    return <NextcloudLoginView />;
  }
  if (page === 'nextcloud-direct-editing') {
    return <NextcloudDirectEditingView />;
  }
  return null;
};
