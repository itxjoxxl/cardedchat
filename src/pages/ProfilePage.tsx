import { useState } from 'react';
import { motion } from 'framer-motion';
import AppShell from '@/components/layout/AppShell';
import ProfileCard from '@/components/profile/ProfileCard';
import StatsGrid from '@/components/profile/StatsGrid';
import ProfileExport from '@/components/profile/ProfileExport';
import AvatarPicker from '@/components/profile/AvatarPicker';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { useProfileStore } from '@/store/profileStore';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/cn';

export default function ProfilePage() {
  const { profile, stats, updateName, updateAvatar } = useProfileStore();
  const { soundEnabled, toggleSound, cardBackColor, setCardBackColor, animationSpeed, setAnimationSpeed } = useSettingsStore();
  const allGameStats = Object.values(stats);
  const totalPlayed = allGameStats.reduce((s, g) => s + g.played, 0);
  const totalWon = allGameStats.reduce((s, g) => s + g.won, 0);
  const winRate = totalPlayed > 0 ? Math.round((totalWon / totalPlayed) * 100) : 0;
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(profile?.name ?? '');
  const [editAvatar, setEditAvatar] = useState(profile?.avatar ?? '😀');

  function handleSave() {
    if (editName.trim()) { updateName(editName.trim()); updateAvatar(editAvatar); }
    setEditOpen(false);
  }

  const CARD_BACKS = [
    { value: 'blue', label: '🔵 Blue' },
    { value: 'red', label: '🔴 Red' },
    { value: 'green', label: '🟢 Green' },
    { value: 'purple', label: '🟣 Purple' },
  ];

  return (
    <AppShell title="Profile">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-5 px-4 pt-6 pb-8"
      >
        {/* Profile card */}
        <div className="bg-felt-dark/60 rounded-3xl p-5 border border-white/10 flex items-center gap-4">
          <button onClick={() => { setEditAvatar(profile?.avatar ?? '😀'); setEditOpen(true); }} className="text-5xl hover:scale-110 transition-transform">
            {profile?.avatar}
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white font-ui">{profile?.name}</h2>
            <p className="text-white/40 text-sm font-ui">
              Member since {profile ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}
            </p>
          </div>
          <button onClick={() => { setEditName(profile?.name ?? ''); setEditAvatar(profile?.avatar ?? '😀'); setEditOpen(true); }} className="text-white/30 hover:text-white transition-colors px-2">
            ✏️
          </button>
        </div>

        {/* Stats summary row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Played', value: totalPlayed, color: 'text-white' },
            { label: 'Won', value: totalWon, color: 'text-green-400' },
            { label: 'Win %', value: `${winRate}%`, color: 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-felt-dark/60 rounded-2xl p-3 border border-white/10 text-center">
              <div className={`text-2xl font-bold font-ui ${color}`}>{value}</div>
              <div className="text-[10px] text-white/40 font-ui uppercase mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Per-game stats */}
        <div>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest font-ui mb-3">Game History</h2>
          <StatsGrid />
        </div>

        {/* Settings */}
        <div>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest font-ui mb-3">Settings</h2>
          <div className="flex flex-col gap-3">
            {/* Sound */}
            <div className="flex items-center justify-between bg-felt-dark/60 rounded-2xl px-4 py-3 border border-white/10">
              <span className="text-sm text-white font-ui">Sound Effects</span>
              <button
                onClick={toggleSound}
                className={cn('w-12 h-7 rounded-full transition-colors relative', soundEnabled ? 'bg-yellow-500' : 'bg-white/20')}
              >
                <span className={cn('absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform', soundEnabled ? 'left-6' : 'left-0.5')} />
              </button>
            </div>
            {/* Card back */}
            <div className="bg-felt-dark/60 rounded-2xl px-4 py-3 border border-white/10">
              <p className="text-sm text-white font-ui mb-2">Card Back Color</p>
              <div className="flex gap-2">
                {CARD_BACKS.map((b) => (
                  <button
                    key={b.value}
                    onClick={() => setCardBackColor(b.value)}
                    className={cn('flex-1 py-1.5 rounded-xl text-xs font-ui transition-all', cardBackColor === b.value ? 'bg-yellow-500 text-yellow-900 font-bold' : 'bg-black/30 text-white/60')}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Animation speed */}
            <div className="bg-felt-dark/60 rounded-2xl px-4 py-3 border border-white/10">
              <p className="text-sm text-white font-ui mb-2">Animation Speed</p>
              <div className="flex gap-2">
                {(['slow', 'normal', 'fast'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setAnimationSpeed(s)}
                    className={cn('flex-1 py-1.5 rounded-xl text-xs font-ui capitalize transition-all', animationSpeed === s ? 'bg-yellow-500 text-yellow-900 font-bold' : 'bg-black/30 text-white/60')}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Restore code */}
        <div>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest font-ui mb-3">Backup & Restore</h2>
          <ProfileExport />
        </div>
      </motion.div>

      {/* Edit modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile" size="lg">
        <div className="flex flex-col gap-4">
          <Input
            label="Your Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            maxLength={20}
          />
          <div>
            <label className="text-sm text-white/60 font-ui block mb-2">Avatar</label>
            <AvatarPicker selected={editAvatar} onSelect={setEditAvatar} />
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="gold" onClick={handleSave} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
