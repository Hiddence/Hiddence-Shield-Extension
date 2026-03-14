const runtimeApi = globalThis.browser || globalThis.chrome;

export const isFirefox = typeof globalThis.browser !== 'undefined';
export const browserName = isFirefox ? 'firefox' : 'chrome';

export async function sendRuntimeMessage(message) {
  if (isFirefox) {
    return runtimeApi.runtime.sendMessage(message);
  }

  return new Promise((resolve) => {
    runtimeApi.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

export async function storageGet(keys) {
  if (isFirefox) {
    return runtimeApi.storage.local.get(keys);
  }

  return new Promise((resolve) => {
    runtimeApi.storage.local.get(keys, (result) => {
      resolve(result);
    });
  });
}

export async function storageSet(value) {
  if (isFirefox) {
    return runtimeApi.storage.local.set(value);
  }

  return new Promise((resolve) => {
    runtimeApi.storage.local.set(value, () => {
      resolve();
    });
  });
}