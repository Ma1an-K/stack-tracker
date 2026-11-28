import { describe, it, expect } from 'vitest';
import { getInstallContext, isPhoneContext, type InstallContext } from './installContext';

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  iphoneFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15',
  iphoneEdge:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/131.2903.68 Mobile/15E148 Safari/605.1.15',
  iphoneFacebook:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/489.0.0.46.109;FBBV/658432551;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/18.1;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/80]',
  androidFacebook:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.81 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/489.0.0.66.81;]',
  iphoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 357.0.0.25.101 (iPhone15,2; iOS 18_1; en_US; en; scale=3.00; 1179x2556; 659283618)',
  androidWhatsApp:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.81 Mobile Safari/537.36 WhatsApp/2.24.23.78',
  iphoneLine:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.19.0',
  androidWeChat:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.81 Mobile Safari/537.36 XWEB/1300259 MMWEBSDK/20240404 MMWEBID/1234 MicroMessenger/8.0.49.2600(0x28003133) WeChat/arm64 Weixin NetType/WIFI Language/en ABI/arm64',
  iphoneSnapchat:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/13.17.0.40 (like Safari/8618.2.12.10.4, panda)',
  androidTikTok:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.81 Mobile Safari/537.36 trill_370103 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/37.1.3 ByteLocale/en ByteFullLocale/en Region/AU AppId/1233 Spark/1.6.0.5-bugfix AppVersion/37.1.3 BytedanceWebview/d8a21c6 TikTok/37.1.3',
  iphoneLinkedIn:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.30.2950',
  ipadDesktopMode:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  macChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

type Env = Parameters<typeof getInstallContext>[0];
const env = (over: Partial<Env>): Env => ({
  ua: UA.iphoneSafari,
  maxTouchPoints: 5,
  standalone: false,
  native: false,
  hasPrompt: false,
  ...over,
});

describe('getInstallContext', () => {
  it('reports native first, even when standalone or in-app', () => {
    expect(getInstallContext(env({ native: true }))).toBe('native');
    expect(getInstallContext(env({ native: true, standalone: true, ua: UA.iphoneFacebook }))).toBe('native');
  });

  it('reports installed when running standalone, even inside an in-app UA', () => {
    expect(getInstallContext(env({ standalone: true }))).toBe('installed');
    expect(getInstallContext(env({ standalone: true, ua: UA.iphoneInstagram }))).toBe('installed');
    expect(getInstallContext(env({ standalone: true, ua: UA.macChrome, maxTouchPoints: 0 }))).toBe('installed');
  });

  it.each([
    ['Facebook (FBAN) on iPhone', UA.iphoneFacebook],
    ['Facebook (FBAV) on Android', UA.androidFacebook],
    ['Instagram', UA.iphoneInstagram],
    ['WhatsApp', UA.androidWhatsApp],
    ['Line', UA.iphoneLine],
    ['WeChat (MicroMessenger)', UA.androidWeChat],
    ['Snapchat', UA.iphoneSnapchat],
    ['TikTok', UA.androidTikTok],
    ['LinkedIn', UA.iphoneLinkedIn],
  ])('reports in-app for %s', (_name, ua) => {
    expect(getInstallContext(env({ ua }))).toBe('in-app');
    // in-app wins over an Android install prompt too
    expect(getInstallContext(env({ ua, hasPrompt: true }))).toBe('in-app');
  });

  it('reports ios-safari for iPhone Safari', () => {
    expect(getInstallContext(env({ ua: UA.iphoneSafari }))).toBe('ios-safari');
  });

  it.each([
    ['Chrome (CriOS)', UA.iphoneChrome],
    ['Firefox (FxiOS)', UA.iphoneFirefox],
    ['Edge (EdgiOS)', UA.iphoneEdge],
  ])('reports ios-other for %s on iPhone', (_name, ua) => {
    expect(getInstallContext(env({ ua }))).toBe('ios-other');
  });

  it('treats a Macintosh UA with touch points as an iPad in Safari', () => {
    expect(getInstallContext(env({ ua: UA.ipadDesktopMode, maxTouchPoints: 5 }))).toBe('ios-safari');
  });

  it('reports android-prompt when Chrome has a deferred install prompt, android-manual otherwise', () => {
    expect(getInstallContext(env({ ua: UA.androidChrome, hasPrompt: true }))).toBe('android-prompt');
    expect(getInstallContext(env({ ua: UA.androidChrome, hasPrompt: false }))).toBe('android-manual');
  });

  it('reports desktop for Mac and Windows browsers, even with an install prompt', () => {
    expect(getInstallContext(env({ ua: UA.macSafari, maxTouchPoints: 0 }))).toBe('desktop');
    expect(getInstallContext(env({ ua: UA.macChrome, maxTouchPoints: 0, hasPrompt: true }))).toBe('desktop');
    expect(getInstallContext(env({ ua: UA.windowsChrome, maxTouchPoints: 0 }))).toBe('desktop');
    // a Windows touchscreen laptop is still desktop
    expect(getInstallContext(env({ ua: UA.windowsChrome, maxTouchPoints: 10 }))).toBe('desktop');
  });
});

describe('isPhoneContext', () => {
  it('is true for in-app, iOS and Android contexts only', () => {
    const phone: InstallContext[] = ['in-app', 'ios-safari', 'ios-other', 'android-prompt', 'android-manual'];
    const notPhone: InstallContext[] = ['native', 'installed', 'desktop'];
    for (const c of phone) expect(isPhoneContext(c)).toBe(true);
    for (const c of notPhone) expect(isPhoneContext(c)).toBe(false);
  });
});
