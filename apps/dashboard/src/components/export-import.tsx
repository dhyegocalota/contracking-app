import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { getLocalSession, saveLocalSession } from '../storage';
import { isValidLocalSession, mergeImportedSession } from '../utils/merge-session';

function generateFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `contracking-export-${year}-${month}-${day}.json`;
}

type ExportImportProps = {
  onImportComplete: () => void;
};

export function ExportImport({ onImportComplete }: ExportImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = () => {
    const session = getLocalSession();
    if (!session) return;
    const exportData = {
      ...session,
      contractions: session.contractions.map((contraction) => ({ ...contraction, syncedAt: null })),
      events: session.events.map((event) => ({ ...event, syncedAt: null })),
      tombstones: [],
    };
    const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = generateFilename();
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    let imported: unknown;
    try {
      imported = JSON.parse(text);
    } catch {
      setMessage('Arquivo JSON inválido');
      return;
    }

    if (!isValidLocalSession(imported)) {
      setMessage('Formato de dados inválido');
      return;
    }

    const existing = getLocalSession();
    if (!existing) {
      const fresh = {
        ...imported,
        contractions: imported.contractions.map((contraction) => ({ ...contraction, syncedAt: null })),
        events: imported.events.map((event) => ({ ...event, syncedAt: null })),
        tombstones: [],
      };
      saveLocalSession(fresh);
      setMessage(`Importados ${imported.contractions.length} contrações e ${imported.events.length} eventos`);
      onImportComplete();
      return;
    }

    const { merged, contractionCount, eventCount } = mergeImportedSession({ existing, imported });
    saveLocalSession(merged);
    setMessage(`Importados ${contractionCount} contrações e ${eventCount} eventos`);
    onImportComplete();

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <Download size={12} />
          <span>Exportar dados</span>
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <Upload size={12} />
          <span>Importar dados</span>
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
      </div>
      {message && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{message}</span>}
    </div>
  );
}
