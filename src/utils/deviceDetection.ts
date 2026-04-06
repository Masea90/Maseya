export const getDeviceInfo = () => {
  const ua = navigator.userAgent.toLowerCase();
  return {
    isIOS: /iphone|ipad|ipod/.test(ua),
    isAndroid: /android/.test(ua),
    isMobile: /iphone|ipad|ipod|android/.test(ua),
    isStandalone: window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true,
  };
};
