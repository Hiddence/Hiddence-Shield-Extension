import { SERVER_MAP, normalizeServerId } from '../config/servers';
import {
  createRuntimeState,
  getAllServerSnapshots,
  getServerSnapshot,
  KEEP_ALIVE_ALARM_NAME,
  KEEP_ALIVE_INTERVAL_MINUTES,
  measurePing,
  PING_TEST_URL,
  PROXY_PASSWORD,
  PROXY_USERNAME,
  updateServerPing,
  wait,
} from './common';

const api = browser;
const runtimeState = createRuntimeState();
const PROXY_ALERT_NOTIFICATION_ID = 'proxy-connection-alert';
const KEEP_ALIVE_INTERVAL_MS = Math.max(15000, Math.round(KEEP_ALIVE_INTERVAL_MINUTES * 60 * 1000));
let keepAliveIntervalId = null;
let keepAliveInFlight = false;
let consecutiveKeepAliveFailures = 0;
const MAX_KEEP_ALIVE_FAILURES = 3;
let consecutiveGetPingFailures = 0;
const MAX_GET_PING_FAILURES = 3;

function onProxyRequest(requestDetails) {
  if (!runtimeState.isProxyActive) {
    return { type: 'direct' };
  }

  const server = SERVER_MAP[runtimeState.currentServerId];
  const basicAuth = btoa(`${PROXY_USERNAME}:${PROXY_PASSWORD}`);

  const proxyEntry = {
    type: server.scheme,
    host: server.host,
    port: server.port,
    proxyAuthorizationHeader: `Basic ${basicAuth}`,
  };

  if (requestDetails.url === PING_TEST_URL) {
    return { ...proxyEntry, failoverTimeout: 30 };
  }

  return [
    { ...proxyEntry, failoverTimeout: 5 },
    null,
  ];
}

api.proxy.onRequest.addListener(onProxyRequest, { urls: ['<all_urls>'] });

function setBadgeState(mode) {
  const actionApi = api.action;

  if (!actionApi) {
    return;
  }

  if (mode === 'connected') {
    actionApi.setBadgeText({ text: 'ON' });
    actionApi.setBadgeBackgroundColor({ color: '#0ea5e9' });
    actionApi.setTitle({ title: 'Hiddence Shield: connected' });
    return;
  }

  if (mode === 'attention') {
    actionApi.setBadgeText({ text: '!' });
    actionApi.setBadgeBackgroundColor({ color: '#ef4444' });
    actionApi.setTitle({ title: 'Hiddence Shield: connection lost' });
    return;
  }

  actionApi.setBadgeText({ text: '' });
  actionApi.setTitle({ title: 'Hiddence Shield' });
}

function showDisconnectNotification(message) {
  if (!api.notifications?.create) {
    return;
  }

  try {
    const result = api.notifications.create(PROXY_ALERT_NOTIFICATION_ID, {
      type: 'basic',
      iconUrl: api.runtime.getURL('assets/logo/icon-128.png'),
      title: 'Hiddence Shield',
      message: `Proxy connection lost. ${message}`,
    });

    if (result && typeof result.catch === 'function') {
      result.catch(() => {});
    }
  } catch (_error) { }
}

function stopKeepAliveLoop() {
  if (keepAliveIntervalId !== null) {
    clearInterval(keepAliveIntervalId);
    keepAliveIntervalId = null;
  }
}

async function runKeepAliveProbe() {
  if (!runtimeState.isProxyActive || keepAliveInFlight) {
    return;
  }

  keepAliveInFlight = true;

  try {
    const pingResult = await measurePing(1);

    if (!pingResult.success) {
      consecutiveKeepAliveFailures++;

      if (consecutiveKeepAliveFailures >= MAX_KEEP_ALIVE_FAILURES) {
        consecutiveKeepAliveFailures = 0;
        await clearProxyInternal({
          errorMessage: pingResult.error || 'Failed to connect to proxy',
          automatic: true,
          notify: true,
        });
      }
      return;
    }

    consecutiveKeepAliveFailures = 0;
    updateServerPing(runtimeState, runtimeState.currentServerId, pingResult.ping);
  } finally {
    keepAliveInFlight = false;
  }
}

function startKeepAliveLoop() {
  stopKeepAliveLoop();
  keepAliveIntervalId = setInterval(() => {
    runKeepAliveProbe().catch(() => {});
  }, KEEP_ALIVE_INTERVAL_MS);
}

async function applyWebRtcProtection(enabled) {
  const policyApi = api.privacy?.network?.webRTCIPHandlingPolicy;

  if (!policyApi) {
    return {
      status: 'error',
      error: 'No privacy API support',
    };
  }

  if (enabled) {
    await policyApi.set({ value: 'disable_non_proxied_udp' });
  } else {
    await policyApi.clear({});
  }

  return {
    status: 'success',
    policy: enabled ? 'disable_non_proxied_udp' : 'default',
  };
}

async function applyProxyDnsProtection(enabled) {
  const dnsApi = api.privacy?.network?.proxyDNS;

  if (!dnsApi) {
    return;
  }

  if (enabled) {
    await dnsApi.set({ value: true });
  } else {
    await dnsApi.clear({});
  }
}

async function syncProtectionWithStorage(forceEnabled) {
  const { webrtcEnabled } = await api.storage.local.get(['webrtcEnabled']);
  const shouldProtect = typeof forceEnabled === 'boolean' ? forceEnabled : runtimeState.isProxyActive && webrtcEnabled !== false;

  await applyWebRtcProtection(shouldProtect);
  await applyProxyDnsProtection(runtimeState.isProxyActive);
}

async function clearProxyInternal(options = {}) {
  const {
    errorMessage = '',
    automatic = false,
    notify = false,
    badgeState = automatic ? 'attention' : 'idle',
  } = options;

  runtimeState.isProxyActive = false;
  consecutiveKeepAliveFailures = 0;
  consecutiveGetPingFailures = 0;
  stopKeepAliveLoop();
  await api.alarms.clear(KEEP_ALIVE_ALARM_NAME);
  await api.storage.local.set({
    vpnConnected: false,
    badgeState,
    lastDisconnectReason: errorMessage,
    lastDisconnectWasAutomatic: automatic,
    lastDisconnectAt: automatic ? Date.now() : null,
  });

  try {
    await syncProtectionWithStorage(false);
  } catch (_error) { }

  setBadgeState(badgeState);

  if (notify && errorMessage) {
    showDisconnectNotification(errorMessage);
  }
}

async function disconnectForProbeFailure(errorMessage) {
  await clearProxyInternal({
    errorMessage,
    automatic: true,
    notify: true,
  });

  return {
    status: 'error',
    error: errorMessage,
    timestamp: Date.now(),
  };
}

async function handleSetProxy(serverId) {
  const normalizedServerId = normalizeServerId(serverId);
  runtimeState.currentServerId = normalizedServerId;
  consecutiveKeepAliveFailures = 0;
  consecutiveGetPingFailures = 0;
  runtimeState.isProxyActive = true;

  await wait(1000);
  const pingResult = await measurePing();

  if (!pingResult.success) {
    await clearProxyInternal({
      errorMessage: pingResult.error || 'Failed to connect to proxy',
      automatic: true,
      notify: true,
    });
    return {
      status: 'error',
      error: pingResult.error || 'Failed to connect to proxy',
    };
  }

  updateServerPing(runtimeState, normalizedServerId, pingResult.ping);
  await api.storage.local.set({
    vpnConnected: true,
    badgeState: 'connected',
    selectedServer: normalizedServerId,
    lastDisconnectReason: '',
    lastDisconnectWasAutomatic: false,
    lastDisconnectAt: null,
  });
  await syncProtectionWithStorage();
  await api.alarms.create(KEEP_ALIVE_ALARM_NAME, { periodInMinutes: KEEP_ALIVE_INTERVAL_MINUTES });
  startKeepAliveLoop();
  setBadgeState('connected');

  return {
    status: 'success',
    server: getServerSnapshot(runtimeState, normalizedServerId),
  };
}

async function handleGetPing() {
  if (!runtimeState.isProxyActive) {
    return {
      status: 'error',
      error: 'VPN is not connected',
      timestamp: Date.now(),
    };
  }

  const pingResult = await measurePing(1);

  if (!pingResult.success) {
    consecutiveGetPingFailures++;

    if (consecutiveGetPingFailures >= MAX_GET_PING_FAILURES) {
      consecutiveGetPingFailures = 0;
      return disconnectForProbeFailure(pingResult.error);
    }

    return {
      status: 'success',
      ping: null,
      timestamp: Date.now(),
    };
  }

  consecutiveGetPingFailures = 0;
  updateServerPing(runtimeState, runtimeState.currentServerId, pingResult.ping);

  return {
    status: 'success',
    ping: pingResult.ping,
    timestamp: Date.now(),
  };
}

api.webRequest.onAuthRequired.addListener(
  (details) => {
    const server = SERVER_MAP[runtimeState.currentServerId];

    if (
      !runtimeState.isProxyActive ||
      details.isProxy === false ||
      (details.challenger &&
        (details.challenger.host !== server.host ||
          details.challenger.port !== server.port))
    ) {
      return;
    }

    return {
      authCredentials: {
        username: PROXY_USERNAME,
        password: PROXY_PASSWORD,
      },
    };
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);

api.runtime.onMessage.addListener(async (message) => {
  await ensureInitialized();

  if (message.action === 'setProxy') {
    return handleSetProxy(message.server);
  }

  if (message.action === 'clearProxy') {
    await clearProxyInternal();
    return { status: 'success' };
  }

  if (message.action === 'getPing') {
    return handleGetPing();
  }

  if (message.action === 'toggleWebRTC') {
    const result = await applyWebRtcProtection(Boolean(message.disableLeak));

    if (result.status === 'success') {
      await api.storage.local.set({ webrtcEnabled: Boolean(message.disableLeak) });
    }

    return result;
  }

  if (message.action === 'getServerInfo') {
    if (message.measurePing) {
      const pingResult = await handleGetPing();

      if (pingResult.status === 'error') {
        return pingResult;
      }
    }

    return {
      status: 'success',
      server: getServerSnapshot(runtimeState, message.server),
    };
  }

  if (message.action === 'getAllServers') {
    return {
      status: 'success',
      servers: getAllServerSnapshots(runtimeState),
      currentServer: runtimeState.currentServerId,
    };
  }

  if (message.action === 'getCapabilities') {
    return {
      status: 'success',
      capabilities: {
        browser: 'firefox',
        canToggleWebRTC: Boolean(api.privacy?.network?.webRTCIPHandlingPolicy),
        dnsOverProxyEnforced: Boolean(api.privacy?.network?.proxyDNS),
      },
    };
  }

  if (message.action === 'clearDisconnectNotice') {
    await api.storage.local.set({
      badgeState: runtimeState.isProxyActive ? 'connected' : 'idle',
      lastDisconnectReason: '',
      lastDisconnectWasAutomatic: false,
      lastDisconnectAt: null,
    });
    setBadgeState(runtimeState.isProxyActive ? 'connected' : 'idle');
    return { status: 'success' };
  }

  return {
    status: 'error',
    error: 'Unknown action',
  };
});

api.alarms.onAlarm.addListener(async (alarm) => {
  await ensureInitialized();

  if (alarm.name !== KEEP_ALIVE_ALARM_NAME || !runtimeState.isProxyActive) {
    return;
  }

  await runKeepAliveProbe();
});

let initPromise = null;

function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const stored = await api.storage.local.get([
          'badgeState',
          'vpnConnected',
          'webrtcEnabled',
          'selectedServer',
          'lastDisconnectReason',
          'lastDisconnectWasAutomatic',
          'lastDisconnectAt',
        ]);
        runtimeState.currentServerId = normalizeServerId(stored.selectedServer);
        runtimeState.isProxyActive = stored.vpnConnected === true;

        if (stored.vpnConnected) {
          await syncProtectionWithStorage(stored.webrtcEnabled !== false);
          await api.alarms.create(KEEP_ALIVE_ALARM_NAME, { periodInMinutes: KEEP_ALIVE_INTERVAL_MINUTES });
          startKeepAliveLoop();
          setBadgeState('connected');
          runKeepAliveProbe().catch(() => {});
        } else if (stored.badgeState === 'attention' || (stored.lastDisconnectWasAutomatic && stored.lastDisconnectReason)) {
          await clearProxyInternal({
            errorMessage: stored.lastDisconnectReason || '',
            automatic: true,
            notify: false,
            badgeState: 'attention',
          });
        } else {
          setBadgeState('idle');
        }
      } catch (_error) {
        await api.storage.local.set({ vpnConnected: false });
        setBadgeState('idle');
      }
    })();
  }
  return initPromise;
}

ensureInitialized();