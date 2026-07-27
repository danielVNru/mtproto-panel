import { Dispatch, SetStateAction } from 'react';
import { Select, TextInput, HelpMark } from '@gravity-ui/uikit';

export function normalizeBooleanLike(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

export const DEFAULT_ADVANCED = {
  useMiddleProxy: true,
  fastMode: true,
  me2dcFallback: true,
  me2dcFast: true,
  meKeepaliveEnabled: true,
  meKeepaliveIntervalSecs: 5,
  meKeepaliveJitterSecs: 1,
  meKeepalivePayloadRandom: true,
  meReconnectBackoffBaseMs: 200,
  meReconnectBackoffCapMs: 1000,
  meReconnectFastRetryCount: 12,
  desyncAllFull: true,
  meWriterPickMode: 'p2c',
  meWarmupStaggerEnabled: true,
  meWarmupStepDelayMs: 30,
  meWarmupStepJitterMs: 5,
  beobachten: true,
  beobachtenMinutes: 15,
  beobachtenFlushSecs: 5,
  beobachtenFile: '/tmp/telemt-beobachten.json',
  upstreamConnectRetryAttempts: 5,
  upstreamConnectRetryBackoffMs: 500,
  tgConnect: 10,
  rstOnClose: "off",
  logLevel: 'silent',
  unknownDcFileLogEnabled: true,
  updateEvery: 30,
  networkPrefer: 'system',
  stunServers: 'stun.l.google.com:19302',
  serverClientMss: 1360,
  censorshipTlsDomain: '',
  censorshipTlsEmulation: true,
  censorshipTlsFrontDir: '',
  meInitRetryAttempts: 5,
};

export type AdvancedOptions = typeof DEFAULT_ADVANCED;

function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
      <span>{label}</span>
      <HelpMark>{help}</HelpMark>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontWeight: 600,
      fontSize: 11,
      color: 'var(--g-color-text-secondary)',
      marginTop: 12,
      marginBottom: 4,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
    }}>
      {children}
    </div>
  );
}

function BoolSelect({ value, onUpdate }: { value: boolean; onUpdate: (v: boolean) => void }) {
  return (
    <Select
      value={[value ? 'true' : 'false']}
      onUpdate={(val: string[]) => onUpdate(val[0] === 'true')}
      options={[{ value: 'true', content: 'true' }, { value: 'false', content: 'false' }]}
      width="max"
    />
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <TextInput
      type="number"
      value={value.toString()}
      onUpdate={(val) => {
        const n = parseInt(val, 10);
        onChange(isNaN(n) ? 0 : n);
      }}
      size="l"
    />
  );
}

interface TelemtFieldsProps {
  opts: AdvancedOptions;
  set: Dispatch<SetStateAction<AdvancedOptions>>;
}

export function TelemtFields({ opts, set }: TelemtFieldsProps) {
  const upd = <K extends keyof AdvancedOptions>(key: K) =>
    (value: AdvancedOptions[K]) =>
      set((prev) => ({ ...prev, [key]: value } as AdvancedOptions));

  return (
    <div style={{ display: 'grid', gap: 10 }}>

      <SectionLabel>Подключение</SectionLabel>

      <div className="dialog-field">
        <FieldLabel label="use_middle_proxy" help="Использовать средний прокси Telegram. Необходим для работы промо-контента и тегов." />
        <BoolSelect value={opts.useMiddleProxy} onUpdate={upd('useMiddleProxy')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="fast_mode" help="Быстрый режим подключения к ME серверам без дополнительных проверок." />
        <BoolSelect value={opts.fastMode} onUpdate={upd('fastMode')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="me2dc_fallback" help="Возврат к DC2 если основной ME сервер недоступен." />
        <BoolSelect value={opts.me2dcFallback} onUpdate={upd('me2dcFallback')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="me2dc_fast" help="Быстрое переключение на DC2 без ожидания таймаутов." />
        <BoolSelect value={opts.me2dcFast} onUpdate={upd('me2dcFast')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="tg_connect" help="Использовать TG Connect для подключения к серверам Telegram." />
        <NumInput value={opts.tgConnect} onChange={upd('tgConnect')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="rst_on_close" help=" Управляет поведением SO_LINGER(0) на принятых клиентских TCP-сокетах. На высоконагруженных прокси-серверах накапливаются FIN-WAIT-1 и осиротевшие (orphan) сокеты от соединений, которые не завершают Telegram-рукопожатие (сканеры, DPI-зонды, боты). Эта опция позволяет отправлять немедленный RST вместо корректного FIN для таких соединений, мгновенно освобождая ресурсы ядра.

off — по умолчанию. Обычный FIN при закрытии всех соединений; поведение не меняется.
errors — SO_LINGER(0) устанавливается при accept(). Если клиент успешно проходит аутентификацию, linger сбрасывается и relay-сессия закрывается корректно через FIN. Соединения, закрытые до завершения рукопожатия (таймауты, ошибки крипто, сканеры), отправляют RST.
always — SO_LINGER(0) устанавливается при accept() и никогда не сбрасывается. Все закрытия отправляют RST независимо от результата рукопожатия." />
        <Select
          value={[opts.rstOnClose]}
          onUpdate={(val: string[]) => upd('rstOnClose')(val[0] || 'off')}
          options={['off', 'errors', 'always'].map((v) => ({ value: v, content: v }))}
          width="max"
        />
      </div>

      <div className="dialog-field">
        <FieldLabel label="update_every" help="Интервал обновления конфигурации от серверов Telegram (секунды)." />
        <NumInput value={opts.updateEvery} onChange={upd('updateEvery')} />
      </div>

      <SectionLabel>Keepalive</SectionLabel>

      <div className="dialog-field">
        <FieldLabel label="me_keepalive_enabled" help="Включить keepalive пакеты для ME соединений." />
        <BoolSelect value={opts.meKeepaliveEnabled} onUpdate={upd('meKeepaliveEnabled')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="me_keepalive_interval_secs" help="Интервал отправки keepalive пакетов (секунды)." />
        <NumInput value={opts.meKeepaliveIntervalSecs} onChange={upd('meKeepaliveIntervalSecs')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="me_keepalive_jitter_secs" help="Случайное отклонение интервала keepalive в секундах для маскировки трафика." />
        <NumInput value={opts.meKeepaliveJitterSecs} onChange={upd('meKeepaliveJitterSecs')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="me_keepalive_payload_random" help="Использовать случайный payload в keepalive пакетах для дополнительной маскировки." />
        <BoolSelect value={opts.meKeepalivePayloadRandom} onUpdate={upd('meKeepalivePayloadRandom')} />
      </div>

      <SectionLabel>Реконнект</SectionLabel>

      <div className="dialog-field">
        <FieldLabel label="me_reconnect_backoff_base_ms" help="Базовая задержка перед повторным подключением к ME (мс)." />
        <NumInput value={opts.meReconnectBackoffBaseMs} onChange={upd('meReconnectBackoffBaseMs')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="me_reconnect_backoff_cap_ms" help="Максимальная задержка перед повторным подключением к ME (мс)." />
        <NumInput value={opts.meReconnectBackoffCapMs} onChange={upd('meReconnectBackoffCapMs')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="me_reconnect_fast_retry_count" help="Количество быстрых попыток реконнекта до применения экспоненциального backoff." />
        <NumInput value={opts.meReconnectFastRetryCount} onChange={upd('meReconnectFastRetryCount')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="me_init_retry_attempts" help="Количество попыток инициализации подключения к ME серверу." />
        <NumInput value={opts.meInitRetryAttempts} onChange={upd('meInitRetryAttempts')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="upstream_connect_retry_attempts" help="Количество попыток подключения к upstream серверу." />
        <NumInput value={opts.upstreamConnectRetryAttempts} onChange={upd('upstreamConnectRetryAttempts')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="upstream_connect_retry_backoff_ms" help="Задержка между попытками подключения к upstream (мс)." />
        <NumInput value={opts.upstreamConnectRetryBackoffMs} onChange={upd('upstreamConnectRetryBackoffMs')} />
      </div>

      <SectionLabel>Производительность</SectionLabel>

      <div className="dialog-field">
        <FieldLabel label="desync_all_full" help="Полная десинхронизация всех соединений для обхода DPI систем." />
        <BoolSelect value={opts.desyncAllFull} onUpdate={upd('desyncAllFull')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="me_writer_pick_mode" help="Режим выбора writer'а для ME соединений. 'p2c' — приоритет скорости." />
        <TextInput value={opts.meWriterPickMode} onUpdate={upd('meWriterPickMode')} placeholder="p2c" size="l" />
      </div>

      <div className="dialog-field">
        <FieldLabel label="me_warmup_stagger_enabled" help="Постепенный прогрев соединений при старте для снижения пиковой нагрузки." />
        <BoolSelect value={opts.meWarmupStaggerEnabled} onUpdate={upd('meWarmupStaggerEnabled')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="me_warmup_step_delay_ms" help="Задержка между шагами прогрева соединений (мс)." />
        <NumInput value={opts.meWarmupStepDelayMs} onChange={upd('meWarmupStepDelayMs')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="me_warmup_step_jitter_ms" help="Случайное отклонение задержки прогрева соединений (мс)." />
        <NumInput value={opts.meWarmupStepJitterMs} onChange={upd('meWarmupStepJitterMs')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="server_client_mss" help="MSS (Maximum Segment Size) для соединений клиент-сервер в байтах." />
        <NumInput value={opts.serverClientMss} onChange={upd('serverClientMss')} />
      </div>

      <SectionLabel>Сеть</SectionLabel>

      <div className="dialog-field">
        <FieldLabel label="network_prefer" help="Предпочтительная версия IP протокола. 'system' — следовать системным настройкам." />
        <Select
          value={[opts.networkPrefer]}
          onUpdate={(val: string[]) => upd('networkPrefer')(val[0] || 'system')}
          options={['system', 'ipv4', 'ipv6'].map((v) => ({ value: v, content: v }))}
          width="max"
        />
      </div>

      <div className="dialog-field">
        <FieldLabel label="stun_servers" help="STUN серверы для определения внешнего IP адреса (через запятую)." />
        <TextInput
          value={opts.stunServers}
          onUpdate={upd('stunServers')}
          placeholder="stun.l.google.com:19302"
          size="l"
        />
      </div>

      <SectionLabel>Маскировка (censorship)</SectionLabel>

      <div className="dialog-field">
        <FieldLabel label="censorship_tls_domain" help="Домен для TLS маскировки при обходе цензуры. По умолчанию совпадает с fake TLS доменом прокси." />
        <TextInput
          value={opts.censorshipTlsDomain}
          onUpdate={upd('censorshipTlsDomain')}
          placeholder="напр. www.google.com"
          size="l"
        />
      </div>

      <div className="dialog-field">
        <FieldLabel label="censorship_tls_emulation" help="Включает эмуляцию TLS при обходе цензуры." />
        <BoolSelect value={opts.censorshipTlsEmulation} onUpdate={upd('censorshipTlsEmulation')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="censorship_tls_front_dir" help="Директория для TLS fronting файлов (если используется)." />
        <TextInput
          value={opts.censorshipTlsFrontDir}
          onUpdate={upd('censorshipTlsFrontDir')}
          placeholder="tlsfront"
          size="l"
        />
      </div>

      <SectionLabel>Логирование и мониторинг</SectionLabel>

      <div className="dialog-field">
        <FieldLabel label="log_level" help="Уровень детализации логов." />
        <Select
          value={[opts.logLevel]}
          onUpdate={(val: string[]) => upd('logLevel')(val[0] || 'info')}
          options={[`debug`, `verbose`, `normal`, `silent`].map((level) => ({ value: level, content: level }))}
          width="max"
        />
      </div>

      <div className="dialog-field">
        <FieldLabel label="unknown_dc_file_log_enabled" help="Записывать адреса неизвестных DC в лог файл для диагностики." />
        <BoolSelect value={opts.unknownDcFileLogEnabled} onUpdate={upd('unknownDcFileLogEnabled')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="beobachten" help="Включить систему сбора статистики соединений." />
        <BoolSelect value={opts.beobachten} onUpdate={upd('beobachten')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="beobachten_minutes" help="Период хранения данных статистики в памяти (минуты)." />
        <NumInput value={opts.beobachtenMinutes} onChange={upd('beobachtenMinutes')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="beobachten_flush_secs" help="Интервал сброса данных статистики на диск (секунды)." />
        <NumInput value={opts.beobachtenFlushSecs} onChange={upd('beobachtenFlushSecs')} />
      </div>

      <div className="dialog-field">
        <FieldLabel label="beobachten_file" help="Путь к файлу для хранения данных статистики соединений." />
        <TextInput
          value={opts.beobachtenFile}
          onUpdate={upd('beobachtenFile')}
          placeholder="/tmp/telemt-beobachten.json"
          size="l"
        />
      </div>

    </div>
  );
}
