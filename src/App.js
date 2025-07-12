import React, { useState, useEffect, useCallback } from 'react';

const translations = {
    en: {
        status_connected: "Connected",
        status_not_connected: "Not Connected",
        connect_button: "Connect",
        disconnect_button: "Disconnect",
        advanced_settings: "Advanced Settings",
        webrtc_protection: "WebRTC Leak Protection",
        connection_error: "Connection Problem",
        error_message_title: "Connection Problem:",
        error_check_internet: "1. Check your internet connection",
        error_proxy_unavailable: "2. Proxy server seems to be unavailable",
        error_check_firewall: "3. Check if your firewall allows SOCKS5 connections",
        connecting: "Connecting..."
    },
    ru: {
        status_connected: "Подключено",
        status_not_connected: "Не подключено",
        connect_button: "Подключиться",
        disconnect_button: "Отключиться",
        advanced_settings: "Расширенные настройки",
        webrtc_protection: "Защита от утечек WebRTC",
        connection_error: "Ошибка соединения",
        error_message_title: "Проблема с подключением:",
        error_check_internet: "1. Проверьте ваше интернет-соединение",
        error_proxy_unavailable: "2. Прокси-сервер недоступен",
        error_check_firewall: "3. Проверьте, разрешает ли ваш брандмауэр соединения SOCKS5",
        connecting: "Подключение..."
    },
    es: {
        status_connected: "Conectado",
        status_not_connected: "No Conectado",
        connect_button: "Conectar",
        disconnect_button: "Desconectar",
        advanced_settings: "Configuración Avanzada",
        webrtc_protection: "Protección contra fugas WebRTC",
        connection_error: "Problema de Conexión",
        error_message_title: "Problema de conexión con el proxy:",
        error_check_internet: "1. Comprueba tu conexión a internet",
        error_proxy_unavailable: "2. El servidor proxy parece estar inaccesible",
        error_check_firewall: "3. Comprueba si tu firewall permite conexiones SOCKS5",
        connecting: "Conectando..."
    },
    de: {
        status_connected: "Verbunden",
        status_not_connected: "Nicht Verbunden",
        connect_button: "Verbinden",
        disconnect_button: "Trennen",
        advanced_settings: "Erweiterte Einstellungen",
        webrtc_protection: "WebRTC-Leak-Schutz",
        connection_error: "Verbindungsproblem",
        error_message_title: "Problem mit der Proxy-Verbindung:",
        error_check_internet: "1. Überprüfen Sie Ihre Internetverbindung",
        error_proxy_unavailable: "2. Der Proxy-Server scheint nicht erreichbar zu sein",
        error_check_firewall: "3. Prüfen Sie, ob Ihre Firewall SOCKS5-Verbindungen zulässt",
        connecting: "Verbinde..."
    },
    uk: {
        status_connected: "Підключено",
        status_not_connected: "Не підключено",
        connect_button: "Підключитися",
        disconnect_button: "Відключитися",
        advanced_settings: "Розширені налаштування",
        webrtc_protection: "Захист від витоків WebRTC",
        connection_error: "Проблема з підключенням",
        error_message_title: "Проблема з підключенням:", 
        error_check_internet: "1. Перевірте ваше інтернет-з'єднання",
        error_proxy_unavailable: "2. Проксі-сервер недоступний",
        error_check_firewall: "3. Перевірте, чи дозволяє ваш брандмауер з'єднання SOCKS5",
        connecting: "Підключення..."
    },
    pt: {
        status_connected: "Conectado",
        status_not_connected: "Não Conectado",
        connect_button: "Conectar",
        disconnect_button: "Desconectar",
        advanced_settings: "Configurações Avançadas",
        webrtc_protection: "Proteção contra Vazamento WebRTC",
        connection_error: "Problema de Conexão",
        error_message_title: "Problema de Conexão:",
        error_check_internet: "1. Verifique sua conexão com a internet",
        error_proxy_unavailable: "2. O servidor proxy parece estar indisponível",
        error_check_firewall: "3. Verifique se seu firewall permite conexões SOCKS5",
        connecting: "Conectando..."
    },
    it: {
        status_connected: "Connesso",
        status_not_connected: "Non Connesso",
        connect_button: "Connetti",
        disconnect_button: "Disconnetti",
        advanced_settings: "Impostazioni Avanzate",
        webrtc_protection: "Protezione dalle Perdite WebRTC",
        connection_error: "Problema di Connessione",
        error_message_title: "Problema di Connessione:",
        error_check_internet: "1. Controlla la tua connessione internet",
        error_proxy_unavailable: "2. Il server proxy sembra non essere disponibile",
        error_check_firewall: "3. Verifica se il firewall consente connessioni SOCKS5",
        connecting: "Connessione in corso..."
    },
    fr: {
        status_connected: "Connecté",
        status_not_connected: "Non Connecté",
        connect_button: "Connecter",
        disconnect_button: "Déconnecter",
        advanced_settings: "Paramètres Avancés",
        webrtc_protection: "Protection contre les Fuites WebRTC",
        connection_error: "Problème de Connexion",
        error_message_title: "Problème de Connexion:", 
        error_check_internet: "1. Vérifiez votre connexion internet",
        error_proxy_unavailable: "2. Le serveur proxy semble être indisponible",
        error_check_firewall: "3. Vérifiez si votre pare-feu autorise les connexions SOCKS5",
        connecting: "Connexion en cours..."
    },
    nl: {
        status_connected: "Verbonden",
        status_not_connected: "Niet Verbonden",
        connect_button: "Verbinden",
        disconnect_button: "Verbreken",
        advanced_settings: "Geavanceerde Instellingen",
        webrtc_protection: "WebRTC Lekbescherming",
        connection_error: "Verbindingsprobleem",
        error_message_title: "Verbindingsprobleem:",
        error_check_internet: "1. Controleer uw internetverbinding",
        error_proxy_unavailable: "2. Proxyserver lijkt niet beschikbaar te zijn",
        error_check_firewall: "3. Controleer of uw firewall SOCKS5-verbindingen toestaat",
        connecting: "Verbinden..."
    },
    sv: { 
        status_connected: "Ansluten",
        status_not_connected: "Inte Ansluten",
        connect_button: "Anslut",
        disconnect_button: "Koppla från",
        advanced_settings: "Avancerade Inställningar",
        webrtc_protection: "WebRTC Läckageskydd",
        connection_error: "Anslutningsproblem",
        error_message_title: "Anslutningsproblem:",
        error_check_internet: "1. Kontrollera din internetanslutning",
        error_proxy_unavailable: "2. Proxyservern verkar vara otillgänglig",
        error_check_firewall: "3. Kontrollera om din brandvägg tillåter SOCKS5-anslutningar",
        connecting: "Ansluter..."
    },
    ar: {
        status_connected: "متصل",
        status_not_connected: "غير متصل",
        connect_button: "اتصال",
        disconnect_button: "قطع الاتصال",
        advanced_settings: "إعدادات متقدمة",
        webrtc_protection: "حماية من تسرب WebRTC",
        connection_error: "مشكلة في الاتصال",
        error_message_title: "مشكلة في الاتصال:",
        error_check_internet: "1. تحقق من اتصالك بالإنترنت",
        error_proxy_unavailable: "2. يبدو أن خادم الوكيل غير متاح",
        error_check_firewall: "3. تحقق مما إذا كان جدار الحماية الخاص بك يسمح باتصالات SOCKS5",
        connecting: "جاري الاتصال..."
    },
    ja: {
        status_connected: "接続済み",
        status_not_connected: "未接続",
        connect_button: "接続",
        disconnect_button: "切断",
        advanced_settings: "詳細設定",
        webrtc_protection: "WebRTC漏洩保護",
        connection_error: "接続問題",
        error_message_title: "接続問題:",
        error_check_internet: "1. インターネット接続を確認してください",
        error_proxy_unavailable: "2. プロキシサーバーが利用できないようです",
        error_check_firewall: "3. ファイアウォールがSOCKS5接続を許可しているか確認してください",
        connecting: "接続中..."
    },
    zh: {
        status_connected: "已连接",
        status_not_connected: "未连接",
        connect_button: "连接",
        disconnect_button: "断开",
        advanced_settings: "高级设置",
        webrtc_protection: "WebRTC泄漏保护",
        connection_error: "连接问题",
        error_message_title: "连接问题:",
        error_check_internet: "1. 检查您的互联网连接",
        error_proxy_unavailable: "2. 代理服务器似乎不可用",
        error_check_firewall: "3. 检查您的防火墙是否允许SOCKS5连接",
        connecting: "连接中..."
    },
    vi: {
        status_connected: "Đã kết nối",
        status_not_connected: "Chưa kết nối",
        connect_button: "Kết nối",
        disconnect_button: "Ngắt kết nối",
        advanced_settings: "Cài đặt nâng cao",
        webrtc_protection: "Bảo vệ rò rỉ WebRTC",
        connection_error: "Sự cố kết nối",
        error_message_title: "Sự cố kết nối:",
        error_check_internet: "1. Kiểm tra kết nối internet của bạn",
        error_proxy_unavailable: "2. Máy chủ proxy dường như không khả dụng",
        error_check_firewall: "3. Kiểm tra xem tường lửa của bạn có cho phép kết nối SOCKS5 không",
        connecting: "Đang kết nối..."
    },
    tr: {
        status_connected: "Bağlandı",
        status_not_connected: "Bağlı Değil",
        connect_button: "Bağlan",
        disconnect_button: "Bağlantıyı Kes",
        advanced_settings: "Gelişmiş Ayarlar",
        webrtc_protection: "WebRTC Sızıntı Koruması",
        connection_error: "Bağlantı Sorunu",
        error_message_title: "Bağlantı Sorunu:",
        error_check_internet: "1. İnternet bağlantınızı kontrol edin",
        error_proxy_unavailable: "2. Proxy sunucusu kullanılamıyor gibi görünüyor",
        error_check_firewall: "3. Güvenlik duvarınızın SOCKS5 bağlantılarına izin verip vermediğini kontrol edin",
        connecting: "Bağlanıyor..."
    },
    el: {
        status_connected: "Συνδεδεμένο",
        status_not_connected: "Μη Συνδεδεμένο",
        connect_button: "Σύνδεση",
        disconnect_button: "Αποσύνδεση",
        advanced_settings: "Προηγμένες Ρυθμίσεις",
        webrtc_protection: "Προστασία Διαρροής WebRTC",
        connection_error: "Πρόβλημα Σύνδεσης",
        error_message_title: "Πρόβλημα Σύνδεσης:",
        error_check_internet: "1. Ελέγξτε τη σύνδεσή σας στο διαδίκτυο",
        error_proxy_unavailable: "2. Ο διακομιστής μεσολάβησης φαίνεται να είναι μη διαθέσιμος",
        error_check_firewall: "3. Ελέγξτε αν το τείχος προστασίας σας επιτρέπει συνδέσεις SOCKS5",
        connecting: "Σύνδεση..."
    },
    pl: {
        status_connected: "Połączono",
        status_not_connected: "Niepołączono",
        connect_button: "Połącz",
        disconnect_button: "Rozłącz",
        advanced_settings: "Ustawienia zaawansowane",
        webrtc_protection: "Ochrona przed wyciekiem WebRTC",
        connection_error: "Problem z połączeniem",
        error_message_title: "Problem z połączeniem:",
        error_check_internet: "1. Sprawdź swoje połączenie internetowe",
        error_proxy_unavailable: "2. Serwer proxy wydaje się być niedostępny",
        error_check_firewall: "3. Sprawdź, czy zapora sieciowa zezwala na połączenia SOCKS5",
        connecting: "Łączenie..."
    },
    ko: {
        status_connected: "연결됨",
        status_not_connected: "연결되지 않음",
        connect_button: "연결",
        disconnect_button: "연결 해제",
        advanced_settings: "고급 설정",
        webrtc_protection: "WebRTC 유출 보호",
        connection_error: "연결 문제",
        error_message_title: "연결 문제:",
        error_check_internet: "1. 인터넷 연결을 확인하세요",
        error_proxy_unavailable: "2. 프록시 서버가 사용 불가능한 것 같습니다",
        error_check_firewall: "3. 방화벽이 SOCKS5 연결을 허용하는지 확인하세요",
        connecting: "연결 중..."
    },
    he: {
        status_connected: "מחובר",
        status_not_connected: "לא מחובר",
        connect_button: "התחבר",
        disconnect_button: "התנתק",
        advanced_settings: "הגדרות מתקדמות",
        webrtc_protection: "הגנה מפני דליפת WebRTC",
        connection_error: "בעיית חיבור",
        error_message_title: "בעיית חיבור:",
        error_check_internet: "1. בדוק את חיבור האינטרנט שלך",
        error_proxy_unavailable: "2. נראה כי שרת ה-Proxy אינו זמין",
        error_check_firewall: "3. בדוק אם חומת האש שלך מאפשרת חיבורי SOCKS5",
        connecting: "מתחבר..."
    },
    cs: {
        status_connected: "Připojeno",
        status_not_connected: "Nepřipojeno",
        connect_button: "Připojit",
        disconnect_button: "Odpojit",
        advanced_settings: "Pokročilá nastavení",
        webrtc_protection: "Ochrana proti úniku WebRTC",
        connection_error: "Problém s připojením",
        error_message_title: "Problém s připojením:",
        error_check_internet: "1. Zkontrolujte připojení k internetu",
        error_proxy_unavailable: "2. Proxy server se zdá být nedostupný",
        error_check_firewall: "3. Zkontrolujte, zda váš firewall umožňuje připojení SOCKS5",
        connecting: "Připojování..."
    },
    lt: {
        status_connected: "Prisijungta",
        status_not_connected: "Neprisijungta",
        connect_button: "Prisijungti",
        disconnect_button: "Atsijungti",
        advanced_settings: "Išplėstiniai nustatymai",
        webrtc_protection: "WebRTC nuotėkio apsauga",
        connection_error: "Ryšio problema",
        error_message_title: "Ryšio problema:",
        error_check_internet: "1. Patikrinkite savo interneto ryšį",
        error_proxy_unavailable: "2. Atrodo, kad tarpinis serveris yra neprieinamas",
        error_check_firewall: "3. Patikrinkite, ar jūsų užkarda leidžia SOCKS5 ryšius",
        connecting: "Jungiamasi..."
    },
    lv: {
        status_connected: "Savienots",
        status_not_connected: "Nav savienots",
        connect_button: "Savienot",
        disconnect_button: "Atvienot",
        advanced_settings: "Papildu iestatījumi",
        webrtc_protection: "WebRTC noplūdes aizsardzība",
        connection_error: "Savienojuma problēma",
        error_message_title: "Savienojuma problēma:",
        error_check_internet: "1. Pārbaudiet savu interneta savienojumu",
        error_proxy_unavailable: "2. Šķiet, ka starpniekserveris nav pieejams",
        error_check_firewall: "3. Pārbaudiet, vai jūsu ugunsmūris atļauj SOCKS5 savienojumus",
        connecting: "Savienojas..."
    },
    et: {
        status_connected: "Ühendatud",
        status_not_connected: "Ühendamata",
        connect_button: "Ühenda",
        disconnect_button: "Katkesta ühendus",
        advanced_settings: "Täpsemad seaded",
        webrtc_protection: "WebRTC lekke kaitse",
        connection_error: "Ühenduse probleem",
        error_message_title: "Ühenduse probleem:",
        error_check_internet: "1. Kontrollige oma internetiühendust",
        error_proxy_unavailable: "2. Tundub, et puhverserver ei ole saadaval",
        error_check_firewall: "3. Kontrollige, kas teie tulemüür lubab SOCKS5 ühendusi",
        connecting: "Ühendamine..."
    }
};

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState('en');
  const [texts, setTexts] = useState(translations.en);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [ping, setPing] = useState('--');
  const [webrtcEnabled, setWebrtcEnabled] = useState(true);

  const setWebRTCPolicy = useCallback((disable) => {
    chrome.runtime.sendMessage({
        action: 'toggleWebRTC',
        disableLeak: disable
    });
  }, []);

  const updateWebRTCPolicy = useCallback((vpnConnected, webrtcEnabledValue) => {
      if (vpnConnected && webrtcEnabledValue) {
          setWebRTCPolicy(true);
      } else {
          setWebRTCPolicy(false);
      }
  }, [setWebRTCPolicy]);

  useEffect(() => {
    const loadInitialData = async () => {
        try {
            const result = await new Promise(resolve => chrome.storage.local.get(['language', 'vpnConnected', 'webrtcEnabled'], resolve));

            const browserLang = navigator.language.split('-')[0];
            const lang = result.language || (translations[browserLang] ? browserLang : 'en');
            setLanguage(lang);
            setTexts(translations[lang]);

            const webrtcEnabledValue = typeof result.webrtcEnabled === 'boolean' ? result.webrtcEnabled : true;
            setWebrtcEnabled(webrtcEnabledValue);

            const vpnConnected = !!result.vpnConnected;
            if (vpnConnected) {
                const response = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'getServerInfo', measurePing: true }, resolve));
                if (response && response.status === 'success') {
                    setIsConnected(true);
                    setPing(response.server.ping ? `${response.server.ping}ms` : '--');
                } else {
                    setConnectionError(response?.error || 'Connection failed');
                    setIsConnected(false);
                    await new Promise(resolve => chrome.storage.local.set({ vpnConnected: false }, resolve));
                }
                updateWebRTCPolicy(true, webrtcEnabledValue);
            }
        } catch (e) {
            console.error("Failed to load initial data", e);
        } finally {
            setIsLoading(false);
        }
    };
    loadInitialData();
  }, [updateWebRTCPolicy]);

  useEffect(() => {
    let pingInterval;
    if (isConnected && !isConnecting) {
      pingInterval = setInterval(() => {
        chrome.runtime.sendMessage({ action: 'getPing' }, (response) => {
          if (response && response.status === 'success' && response.ping) {
            setPing(`${response.ping}ms`);
            setConnectionError(null);
          } else {
            setPing('--');
            setConnectionError(response?.error || 'Ping failed');
            setIsConnected(false);
            chrome.storage.local.set({ vpnConnected: false });
            updateWebRTCPolicy(false, webrtcEnabled);
          }
        });
      }, 2000);
    }

    return () => {
      if (pingInterval) {
        clearInterval(pingInterval);
      }
    };
  }, [isConnected, isConnecting, updateWebRTCPolicy, webrtcEnabled]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setTexts(translations[newLang]);
    chrome.storage.local.set({ language: newLang });
  };

  const handleToggleConnection = () => {
    if (isConnected) {
        chrome.runtime.sendMessage({ action: 'clearProxy' }, (response) => {
            if (response && response.status === 'success') {
                setIsConnected(false);
                setPing('--');
                setConnectionError(null);
                chrome.storage.local.set({ vpnConnected: false }, () => {
                    updateWebRTCPolicy(false, webrtcEnabled);
                });
            }
        });
    } else {
        setIsConnecting(true);
        setConnectionError(null);
        chrome.runtime.sendMessage({ action: 'setProxy', server: 'auto' }, (response) => {
            setIsConnecting(false);
            if (response && response.status === 'success') {
                setIsConnected(true);
                setPing(response.server.ping ? `${response.server.ping}ms` : '--');
                chrome.storage.local.set({ vpnConnected: true }, () => {
                    updateWebRTCPolicy(true, webrtcEnabled);
                });
            } else {
                setConnectionError(response?.error || 'Unknown error');
                setIsConnected(false);
                chrome.storage.local.set({ vpnConnected: false });
            }
        });
    }
  };

  const handleWebrtcChange = (e) => {
    const enabled = e.target.checked;
    setWebrtcEnabled(enabled);
    chrome.storage.local.set({ webrtcEnabled: enabled }, () => {
        updateWebRTCPolicy(isConnected, enabled);
    });
  };
  
  const getStatusText = () => {
      if (isConnecting) return texts.connecting;
      if (connectionError) return texts.connection_error;
      if (isConnected) return texts.status_connected;
      return texts.status_not_connected;
  };
  
  const getPingClassName = () => {
      const pingValue = parseInt(ping, 10);
      if (isNaN(pingValue)) return 'ping-bad';
      if (pingValue < 100) return 'ping-good';
      if (pingValue < 200) return 'ping-medium';
      return 'ping-bad';
  };

  if (isLoading) {
      return null;
  }

  return (
    <div className={`vpn-popup ${isConnected ? 'connected' : ''} ${isConnecting ? 'connecting' : ''}`}>
      <header>
        <div className="logo-container">
          <img src="img/icon-128.png" alt="Shield Logo" className="logo" />
          <h2><a href="https://hiddence.net/?utm_source=hiddenceshield" target="_blank" rel="noopener noreferrer" className="text-primary">Hiddence.NET</a></h2>
        </div>
        <div className="language-selector">
          <select value={language} onChange={handleLanguageChange}>
            <option value="en">EN</option>
            <option value="zh">ZH</option>
            <option value="es">ES</option>
            <option value="ar">AR</option>
            <option value="pt">PT</option>
            <option value="ru">RU</option>
            <option value="ja">JP</option>
            <option value="vi">VI</option>
            <option value="tr">TR</option>
            <option value="ko">KR</option>
            <option value="de">DE</option>
            <option value="fr">FR</option>
            <option value="it">IT</option>
            <option value="uk">UA</option>
            <option value="pl">PL</option>
            <option value="nl">NL</option>
            <option value="el">GR</option>
            <option value="sv">SE</option>
            <option value="cs">CZ</option>
            <option value="he">IL</option>
            <option value="lt">LT</option>
            <option value="lv">LV</option>
            <option value="et">EE</option>
          </select>
        </div>
      </header>
      <div className="status-container">
        <div className="status">
          <div className="status-icon"></div>
          <p style={{ color: connectionError ? '#F44336' : isConnected ? '#42a5f5' : '' }}>
            {getStatusText()}
          </p>
        </div>
        <div className="server-info">
          <span className={`server-ping ${getPingClassName()}`}>{ping}</span>
        </div>
      </div>
      <div className="controls">
        <button onClick={handleToggleConnection} className="button" disabled={isConnecting}>
            {isConnecting ? '...' : isConnected ? texts.disconnect_button : texts.connect_button}
        </button>
      </div>

      {connectionError && (
          <div id="proxy-error-message" style={{ backgroundColor: 'rgba(244, 67, 54, 0.1)', color: '#F44336', padding: '15px', borderRadius: '8px', marginTop: '15px', fontSize: '13px', lineHeight: '1.5' }}>
              <strong>{texts.error_message_title}</strong><br />
              {texts.error_check_internet}<br />
              {texts.error_proxy_unavailable}<br />
              {texts.error_check_firewall}
          </div>
      )}

      <hr className="divider" />
      <div className="advanced-settings">
        <h3>{texts.advanced_settings}</h3>
        <div className="feature-row">
          <label className="switch">
            <input type="checkbox" checked={webrtcEnabled} onChange={handleWebrtcChange} />
            <span className="slider">
              <span className="bg-off"></span>
              <span className="bg-on"></span>
            </span>
          </label>
          <span className="feature-label">{texts.webrtc_protection}</span>
        </div>
      </div>
      <footer>
        <span className="version">v1.1</span>
      </footer>
    </div>
  );
};

export default App; 