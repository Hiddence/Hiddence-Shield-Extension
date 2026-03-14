import { SERVER_MAP, normalizeServerId } from '../config/servers';
import {
  createRuntimeState,
  getAllServerSnapshots,
  getServerSnapshot,
  KEEP_ALIVE_ALARM_NAME,
  KEEP_ALIVE_INTERVAL_MINUTES,
  measurePing,
  PROXY_PASSWORD,
  PROXY_USERNAME,
  updateServerPing,
  wait,
} from './common';

const api = chrome;
const runtimeState = createRuntimeState();
const PROXY_ALERT_NOTIFICATION_ID = 'proxy-connection-alert';
let consecutiveKeepAliveFailures = 0;
const MAX_KEEP_ALIVE_FAILURES = 3;

function storageGet(keys) {
  return new Promise((resolve) => {
    api.storage.local.get(keys, resolve);
  });
}

function storageSet(value) {
  return new Promise((resolve) => {
    api.storage.local.set(value, () => resolve());
  });
}

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
      priority: 2,
    });

    if (result && typeof result.catch === 'function') {
      result.catch(() => {});
    }
  } catch (_error) { }
}

function getProxyConfig(serverId) {
  const server = SERVER_MAP[normalizeServerId(serverId)];

  return {
    mode: 'fixed_servers',
    rules: {
      singleProxy: {
        scheme: server.scheme,
        host: server.host,
        port: server.port,
      },
      bypassList: ['localhost', '127.0.0.1', '<local>'],
    },
  };
}

function proxySet(config) {
  return new Promise((resolve, reject) => {
    api.proxy.settings.set({ value: config, scope: 'regular' }, () => {
      if (api.runtime.lastError) {
        reject(new Error(api.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

function proxyClear() {
  return new Promise((resolve, reject) => {
    api.proxy.settings.clear({ scope: 'regular' }, () => {
      if (api.runtime.lastError) {
        reject(new Error(api.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

function proxyGet() {
  return new Promise((resolve) => {
    api.proxy.settings.get({ incognito: false }, resolve);
  });
}

function applyWebRtcProtection(enabled) {
  return new Promise((resolve) => {
    const policyApi = api.privacy?.network?.webRTCIPHandlingPolicy;

    if (!policyApi) {
      resolve({
        status: 'error',
        error: 'No privacy API support',
      });
      return;
    }

    const done = () => {
      if (api.runtime.lastError) {
        resolve({
          status: 'error',
          error: api.runtime.lastError.message,
        });
        return;
      }

      resolve({
        status: 'success',
        policy: enabled ? 'disable_non_proxied_udp' : 'default',
      });
    };

    if (enabled) {
      policyApi.set({ value: 'disable_non_proxied_udp' }, done);
    } else {
      policyApi.clear({}, done);
    }
  });
}

async function syncProtectionWithStorage(forceEnabled) {
  const { webrtcEnabled } = await storageGet(['webrtcEnabled']);
  const shouldProtect = typeof forceEnabled === 'boolean' ? forceEnabled : runtimeState.isProxyActive && webrtcEnabled !== false;
  await applyWebRtcProtection(shouldProtect);
}

async function clearProxyInternal(options = {}) {
  const {
    errorMessage = '',
    automatic = false,
    notify = false,
    preserveDisconnectState = false,
    badgeState = automatic ? 'attention' : 'idle',
  } = options;

  consecutiveKeepAliveFailures = 0;
  consecutiveGetPingFailures = 0;

  try {
    await proxyClear();
  } catch (_error) { }

  const currentProxyState = await proxyGet();
  const currentMode = currentProxyState?.value?.mode;

  if (currentMode && currentMode !== 'system' && currentMode !== 'direct') {
    await proxySet({ mode: 'direct' });
  }

  runtimeState.isProxyActive = false;
  await api.alarms.clear(KEEP_ALIVE_ALARM_NAME);
  await storageSet(
    preserveDisconnectState
      ? { vpnConnected: false }
      : {
          vpnConnected: false,
          badgeState,
          lastDisconnectReason: errorMessage,
          lastDisconnectWasAutomatic: automatic,
          lastDisconnectAt: automatic ? Date.now() : null,
        }
  );
  await syncProtectionWithStorage(false);
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

  await proxySet(getProxyConfig(normalizedServerId));
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
  await storageSet({
    vpnConnected: true,
    badgeState: 'connected',
    selectedServer: normalizedServerId,
    lastDisconnectReason: '',
    lastDisconnectWasAutomatic: false,
    lastDisconnectAt: null,
  });
  await syncProtectionWithStorage();
  await api.alarms.create(KEEP_ALIVE_ALARM_NAME, { periodInMinutes: KEEP_ALIVE_INTERVAL_MINUTES });
  setBadgeState('connected');

  return {
    status: 'success',
    server: getServerSnapshot(runtimeState, normalizedServerId),
  };
}

let consecutiveGetPingFailures = 0;
const MAX_GET_PING_FAILURES = 3;

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
    if (!runtimeState.isProxyActive || details.isProxy === false) {
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

api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
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
        await storageSet({ webrtcEnabled: Boolean(message.disableLeak) });
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
          browser: 'chrome',
          canToggleWebRTC: Boolean(api.privacy?.network?.webRTCIPHandlingPolicy),
          dnsOverProxyEnforced: false,
        },
      };
    }

    if (message.action === 'clearDisconnectNotice') {
      await storageSet({
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
  })()
    .then((result) => {
      sendResponse(result);
    })
    .catch(async (error) => {
      if (message.action === 'setProxy') {
        await clearProxyInternal({
          errorMessage: error?.message || 'Unexpected background error',
          automatic: true,
          notify: true,
        });
      }

      sendResponse({
        status: 'error',
        error: error?.message || 'Unexpected background error',
      });
    });

  return true;
});

api.alarms.onAlarm.addListener(async (alarm) => {
  await ensureInitialized();

  if (alarm.name !== KEEP_ALIVE_ALARM_NAME || !runtimeState.isProxyActive) {
    return;
  }

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
});

let initPromise = null;

function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const stored = await storageGet([
          'badgeState',
          'vpnConnected',
          'webrtcEnabled',
          'selectedServer',
          'lastDisconnectReason',
          'lastDisconnectWasAutomatic',
          'lastDisconnectAt',
        ]);
        runtimeState.currentServerId = normalizeServerId(stored.selectedServer);

        if (stored.vpnConnected) {
          await proxySet(getProxyConfig(runtimeState.currentServerId));
          runtimeState.isProxyActive = true;
          await syncProtectionWithStorage(stored.webrtcEnabled !== false);
          await api.alarms.create(KEEP_ALIVE_ALARM_NAME, { periodInMinutes: KEEP_ALIVE_INTERVAL_MINUTES });
          setBadgeState('connected');
        } else if (stored.badgeState === 'attention' || (stored.lastDisconnectWasAutomatic && stored.lastDisconnectReason)) {
          await clearProxyInternal({ preserveDisconnectState: true });
          setBadgeState('attention');
        } else {
          await clearProxyInternal();
          setBadgeState('idle');
        }
      } catch (_error) {
        await storageSet({ vpnConnected: false });
        await clearProxyInternal();
        setBadgeState('idle');
      }
    })();
  }
  return initPromise;
}

ensureInitialized();