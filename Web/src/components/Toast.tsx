import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Toast { id: string; type: 'success' | 'error' | 'info'; message: string; }

export default function Toast({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' && <CheckCircle size={16} color="var(--success)" />}
          {t.type === 'error' && <AlertCircle size={16} color="var(--danger)" />}
          {t.type === 'info' && <Info size={16} color="var(--primary)" />}
          <span style={{ flex: 1, fontSize: 13.5 }}>{t.message}</span>
          <button className="btn-icon" style={{ border: 'none', padding: 4, background: 'transparent' }} onClick={() => onDismiss(t.id)}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
