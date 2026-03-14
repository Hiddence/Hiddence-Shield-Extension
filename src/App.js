import React, { useEffect, useMemo, useState } from 'react';
import { SERVER_LIST } from './config/servers';
import { sendRuntimeMessage, storageGet, storageSet } from './lib/browserApi';
import { APP_VERSION, DEFAULT_SERVER_ID, PING_POLL_MS, STORAGE_KEYS } from './lib/constants';
import { getPingTier } from './lib/network';
import { getTexts, LANGUAGE_OPTIONS, resolveLanguage } from './i18n/translations';

function formatPing(pingValue) {
  return typeof pingValue === 'number' ? `${pingValue} ms` : '--';
}

function updateServerCollection(currentServers, incomingServer) {
  return currentServers.map((server) =>
    server.id === incomingServer.id ? { ...server, ...incomingServer } : server
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState('en');
  const [texts, setTexts] = useState(getTexts('en'));
  const [servers, setServers] = useState(SERVER_LIST.map((server) => ({ ...server, ping: null })));
  const [selectedServer, setSelectedServer] = useState(DEFAULT_SERVER_ID);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [ping, setPing] = useState(null);
  const [webrtcEnabled, setWebrtcEnabled] = useState(true);
  const [capabilities, setCapabilities] = useState({
    canToggleWebRTC: false,
    dnsOverProxyEnforced: false,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await storageGet([
          ...STORAGE_KEYS,
          'lastDisconnectReason',
          'lastDisconnectWasAutomatic',
          'lastDisconnectAt',
        ]);
        const browserLanguage = resolveLanguage((navigator.language || 'en').split('-')[0]);
        const nextLanguage = resolveLanguage(stored.language || browserLanguage);

        setLanguage(nextLanguage);
        setTexts(getTexts(nextLanguage));
        setSelectedServer(stored.selectedServer || DEFAULT_SERVER_ID);
        setWebrtcEnabled(typeof stored.webrtcEnabled === 'boolean' ? stored.webrtcEnabled : true);

        if (stored.lastDisconnectWasAutomatic && stored.lastDisconnectReason) {
          setConnectionError(stored.lastDisconnectReason);
        }

        const capabilitiesResponse = await sendRuntimeMessage({ action: 'getCapabilities' });
        if (capabilitiesResponse?.status === 'success') {
          setCapabilities(capabilitiesResponse.capabilities);
        }

        const serversResponse = await sendRuntimeMessage({ action: 'getAllServers' });
        if (serversResponse?.status === 'success') {
          setServers(serversResponse.servers);
          setSelectedServer(serversResponse.currentServer || stored.selectedServer || DEFAULT_SERVER_ID);
        }

        if (stored.vpnConnected) {
          const serverInfoResponse = await sendRuntimeMessage({
            action: 'getServerInfo',
            server: stored.selectedServer || DEFAULT_SERVER_ID,
            measurePing: true,
          });

          if (serverInfoResponse?.status === 'success') {
            setIsConnected(true);
            setPing(serverInfoResponse.server.ping ?? null);
            setServers((currentServers) =>
              updateServerCollection(currentServers, serverInfoResponse.server)
            );
          } else {
            setConnectionError(serverInfoResponse?.error || texts.connection_error);
            setIsConnected(false);
          }
        }
      } catch (error) {
        setConnectionError(error?.message || 'Failed to load extension state');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!isConnected || isConnecting) {
      return undefined;
    }

    const intervalId = setInterval(async () => {
      const pingResponse = await sendRuntimeMessage({ action: 'getPing' });

      if (pingResponse?.status === 'success' && typeof pingResponse.ping === 'number') {
        setPing(pingResponse.ping);
        setConnectionError('');
        return;
      }

      setPing(null);
      setIsConnected(false);
      setConnectionError(pingResponse?.error || texts.connection_error);
    }, PING_POLL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [isConnected, isConnecting, texts.connection_error]);

  const currentServer = useMemo(() => {
    return servers.find((server) => server.id === selectedServer) || servers[0];
  }, [selectedServer, servers]);

  const statusTone = connectionError
    ? 'error'
    : isConnecting
      ? 'connecting'
      : isConnected
        ? 'connected'
        : 'idle';

  const statusText = isConnecting
    ? texts.connecting
    : connectionError
      ? texts.connection_error
      : isConnected
        ? texts.status_connected
        : texts.status_not_connected;

  const statusHint = isConnected ? texts.disconnect_hint : texts.idle_hint;
  const pingTier = getPingTier(ping);

  const handleLanguageChange = async (event) => {
    const nextLanguage = resolveLanguage(event.target.value);
    setLanguage(nextLanguage);
    setTexts(getTexts(nextLanguage));
    await storageSet({ language: nextLanguage });
  };

  const applyProxySelection = async (serverId) => {
    setIsConnecting(true);
    setConnectionError('');

    try {
      const response = await sendRuntimeMessage({
        action: 'setProxy',
        server: serverId,
      });

      if (response?.status !== 'success') {
        setIsConnected(false);
        setPing(null);
        setConnectionError(response?.error || texts.connection_error);
        return;
      }

      setIsConnected(true);
      setPing(response.server.ping ?? null);
      setServers((currentServers) =>
        updateServerCollection(currentServers, response.server)
      );
    } catch (error) {
      setIsConnected(false);
      setPing(null);
      setConnectionError(error?.message || texts.connection_error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleServerChange = async (event) => {
    const nextServerId = event.target.value;
    setSelectedServer(nextServerId);
    await storageSet({ selectedServer: nextServerId });

    if (isConnected) {
      await applyProxySelection(nextServerId);
    }
  };

  const handleConnectionToggle = async () => {
    if (isConnecting) {
      return;
    }

    if (isConnected) {
      setIsConnecting(true);

      try {
        const response = await sendRuntimeMessage({ action: 'clearProxy' });

        if (response?.status === 'success') {
          setIsConnected(false);
          setPing(null);
          setConnectionError('');
        } else {
          setConnectionError(response?.error || texts.connection_error);
        }
      } finally {
        setIsConnecting(false);
      }

      return;
    }

    await applyProxySelection(selectedServer);
  };

  const handleWebRtcChange = async (event) => {
    const enabled = event.target.checked;
    setWebrtcEnabled(enabled);

    if (!capabilities.canToggleWebRTC) {
      return;
    }

    const response = await sendRuntimeMessage({
      action: 'toggleWebRTC',
      disableLeak: enabled,
    });

    if (response?.status !== 'success') {
      setWebrtcEnabled(!enabled);
      setConnectionError(response?.error || texts.connection_error);
    }
  };

  if (isLoading) {
    return (
      <div className="app-shell">
        <div className="loading-state">
          <div className="loading-orb" />
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell tone-${statusTone}`}>
      <section className="hero-card">
        <div className="hero-topbar">
          <div className="brand-lockup">
            <div className="brand-mark">
              <img src="assets/logo-main.svg" alt="Hiddence logo" className="brand-mark-image" />
            </div>
            <div>
              <div className="brand-title">Hiddence Shield</div>
            </div>
          </div>

          <select className="language-select" value={language} onChange={handleLanguageChange}>
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="status-panel">
          <div className="status-orb-shell">
            <div className="orb-glow" />
            <div className="orb-track orb-track-1" />
            <div className="orb-track orb-track-2" />
            <div className="orb-track orb-track-3" />
            <div className="orb-body">
              <div className="orb-highlight" />
              <div className="orb-core" />
            </div>
            <div className="orb-spark orb-spark-1" />
            <div className="orb-spark orb-spark-2" />
            <div className="orb-spark orb-spark-3" />
          </div>
          <div className="status-copy">
            <div className="status-label">{statusText}</div>
            <div className="status-hint">{statusHint}</div>
          </div>
        </div>

        <div className="metrics-grid">
          <article className="metric-card">
            <span className="metric-label">{texts.active_server}</span>
            <strong>{currentServer?.country || '--'}</strong>
          </article>
          <article className={`metric-card ping-tier-${pingTier}`}>
            <span className="metric-label">{texts.latency}</span>
            <strong>{formatPing(ping)}</strong>
          </article>
        </div>

        <button className="primary-button" onClick={handleConnectionToggle} disabled={isConnecting}>
          {isConnecting
            ? texts.connecting
            : isConnected
              ? texts.disconnect_button
              : texts.connect_button}
        </button>
      </section>

      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h2>{texts.select_server}</h2>
            <p>{texts.server_help}</p>
          </div>
        </div>

        <select
          className="server-select"
          value={selectedServer}
          onChange={handleServerChange}
          disabled={isConnecting}
        >
          {servers.map((server) => (
            <option key={server.id} value={server.id}>
              {server.flag} · {server.country}
            </option>
          ))}
        </select>
      </section>

      <section className="panel-card panel-card-compact">
        <label className={`setting-row ${!capabilities.canToggleWebRTC ? 'disabled' : ''}`}>
          <div>
            <div className="setting-title">{texts.webrtc_protection}</div>
            <div className="setting-help">
              {capabilities.canToggleWebRTC ? texts.webrtc_help : texts.protection_unavailable}
            </div>
          </div>

          <span className="switch">
            <input
              type="checkbox"
              checked={webrtcEnabled}
              onChange={handleWebRtcChange}
              disabled={!capabilities.canToggleWebRTC}
            />
            <span className="switch-track" />
          </span>
        </label>

        {capabilities.dnsOverProxyEnforced ? (
          <div className="info-note">{texts.dns_protection_note}</div>
        ) : null}
      </section>

      {connectionError ? (
        <section className="error-card">
          <strong>{texts.error_message_title}</strong>
          <p>{connectionError}</p>
          <p>{texts.error_check_internet}</p>
          <p>{texts.error_proxy_unavailable}</p>
          <p>{texts.error_check_firewall}</p>
        </section>
      ) : null}

      <footer className="footer-bar">
        <a href="https://hiddence.net/?utm_source=hiddenceshield" target="_blank" rel="noreferrer">
          Hiddence.NET
        </a>
        <span>v{APP_VERSION}</span>
      </footer>
    </div>
  );
}