import { DEFAULT_SERVER_ID } from '../lib/constants';

export const SERVER_LIST = [
  {
    id: 'uae',
    host: 'uae-example.proxy-example.com',
    port: 8080,
    scheme: 'http',
    country: 'United Arab Emirates',
    flag: '🇦🇪',
  },
  {
    id: 'us',
    host: 'us-example.proxy-example.com',
    port: 8080,
    scheme: 'http',
    country: 'United States',
    flag: '🇺🇸',
  }
];

export const SERVER_MAP = Object.fromEntries(
  SERVER_LIST.map((server) => [server.id, { ...server }])
);

export function createServerState() {
  return Object.fromEntries(
    SERVER_LIST.map((server) => [server.id, { ...server, ping: null }])
  );
}

export function normalizeServerId(serverId) {
  return SERVER_MAP[serverId] ? serverId : DEFAULT_SERVER_ID;
}