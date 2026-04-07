import { useState } from 'react';
import { useProfileStore } from '@/store/profileStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useUIStore } from '@/store/uiStore';

export default function ProfileExport() {
  const { getRestoreCode, restoreFromCode } = useProfileStore();
  const { showToast } = useUIStore();
  const [restoreInput, setRestoreInput] = useState('');
  const [showRestore, setShowRestore] = useState(false);

  const code = getRestoreCode();

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      showToast('Restore code copied!', 'success');
    });
  }

  function handleRestore() {
    const ok = restoreFromCode(restoreInput.trim());
    if (ok) showToast('Profile restored!', 'success');
    else showToast('Invalid restore code', 'error');
    setRestoreInput('');
    setShowRestore(false);
  }

  return (
    <div className="bg-felt-dark/60 rounded-2xl p-4 border border-white/10 flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-bold text-white font-ui mb-0.5">Restore Code</h3>
        <p className="text-xs text-white/40 font-ui">Copy this code to restore your profile on another device</p>
      </div>

      <div className="bg-black/30 rounded-xl p-3 font-mono text-xs text-yellow-400 break-all leading-relaxed">
        {code.slice(0, 40)}...
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={handleCopy} className="flex-1">
          📋 Copy Code
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowRestore(!showRestore)} className="flex-1">
          🔄 Restore
        </Button>
      </div>

      {showRestore && (
        <div className="flex gap-2">
          <Input
            value={restoreInput}
            onChange={(e) => setRestoreInput(e.target.value)}
            placeholder="Paste restore code..."
            className="text-sm"
          />
          <Button variant="gold" size="sm" onClick={handleRestore} disabled={!restoreInput.trim()}>
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
