type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

export const getNavigatorPlatformSource = (): string => {
  if (typeof navigator === "undefined") {
    return "";
  }

  const nav = navigator as NavigatorWithUserAgentData;
  return nav.userAgentData?.platform ?? navigator.userAgent;
};
