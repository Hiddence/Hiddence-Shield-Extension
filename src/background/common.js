import { createServerState, normalizeServerId, SERVER_LIST } from '../config/servers';
import { DEFAULT_SERVER_ID, PING_TIMEOUT_MS } from '../lib/constants';

export const PROXY_USERNAME = 'PROXY_USERNAME';
export const PROXY_PASSWORD = 'PROXY_PASSWORD';
export const KEEP_ALIVE_ALARM_NAME = 'keep-alive-ping';
export const KEEP_ALIVE_INTERVAL_MINUTES = 0.5;

export function createRuntimeState() {
  return {
    currentServerId: DEFAULT_SERVER_ID,
    isProxyActive: false,
    servers: createServerState(),
  };
}

export function getServerSnapshot(runtimeState, serverId = runtimeState.currentServerId) {
  const normalizedServerId = normalizeServerId(serverId);
  return { ...runtimeState.servers[normalizedServerId] };
}

export function getAllServerSnapshots(runtimeState) {
  return SERVER_LIST.map((server) => getServerSnapshot(runtimeState, server.id));
}

export function updateServerPing(runtimeState, serverId, ping) {
  const normalizedServerId = normalizeServerId(serverId);
  runtimeState.servers[normalizedServerId] = {
    ...runtimeState.servers[normalizedServerId],
    ping,
  };
}

export function wait(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export const PING_TEST_URL = 'https://www.cloudflare.com/cdn-cgi/trace';
const MEASURE_PING_MAX_RETRIES = 3;
const MEASURE_PING_RETRY_DELAY_MS = 1500;

async function singlePing() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

  try {
    const startedAt = performance.now();
    const response = await fetch(PING_TEST_URL, {
      method: 'GET',
      cache: 'no-store',
      mode: 'cors',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `Probe failed with status ${response.status}`,
      };
    }

    const body = await response.text();

    if (!body || !body.includes('fl=')) {
      return {
        success: false,
        error: 'Invalid probe response',
      };
    }

    return {
      success: true,
      ping: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    clearTimeout(timeoutId);

    return {
      success: false,
      error: error?.message || 'Could not connect through proxy',
    };
  }
}

export async function measurePing(retries = MEASURE_PING_MAX_RETRIES) {
  let lastError = '';

  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      await wait(MEASURE_PING_RETRY_DELAY_MS);
    }

    const result = await singlePing();

    if (result.success) {
      return result;
    }

    lastError = result.error;
  }

  return {
    success: false,
    error: lastError || 'Could not connect through proxy',
  };
}