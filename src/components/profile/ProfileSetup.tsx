import { useState } from 'react';
import { motion } from 'framer-motion';
import { useProfileStore } from '@/store/profileStore';
import { getOrCreateProfileId } from '@/lib/profile-id';
import AvatarPicker from './AvatarPicker';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function ProfileSetup() {
  const { profile, setProfile } = useProfileStore();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('😀');
  const [step, setStep] = useState<'name' | 'avatar'>('name');
  const [error, setError] = useState('');

  function handleNameNext() {
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (name.trim().length > 20) { setError('Name must be 20 characters or less'); return; }
    setError('');
    setStep('avatar');
  }

  function handleFinish() {
    const id = profile?.id || getOrCreateProfileId();
    setProfile({ id, name: name.trim(), avatar, createdAt: profile?.createdAt ?? new Date().toISOString() });
  }

  return (
    <div className="w-full h-full felt-surface flex flex-col items-center justify-center px-6 gap-8 safe-top safe-bottom">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-6xl mb-2">🃏</div>
        <h1 className="text-4xl font-bold text-yellow-400 font-card tracking-wider">CARDED</h1>
        <p className="text-white/50 font-ui mt-1">Classic card games, anywhere.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm bg-felt-dark/80 rounded-3xl p-6 border border-white/10 flex flex-col gap-5"
      >
        {step === 'name' ? (
          <>
            <div>
              <h2 className="text-xl font-bold text-white font-ui mb-1">What's your name?</h2>
              <p className="text-white/50 text-sm font-ui">This is how other players will know you</p>
            </div>
            <Input
              label="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name..."
              error={error}
              maxLength={20}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleNameNext()}
            />
            <Button variant="gold" size="lg" onClick={handleNameNext} fullWidth>
              Continue →
            </Button>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-bold text-white font-ui mb-1">Pick your avatar</h2>
              <p className="text-white/50 text-sm font-ui">Choose an emoji that represents you</p>
            </div>
            {/* Preview */}
            <div className="flex items-center gap-3 bg-black/20 rounded-2xl p-3">
              <span className="text-4xl">{avatar}</span>
              <div>
                <p className="text-white font-medium font-ui">{name}</p>
                <p className="text-white/40 text-xs font-ui">Card Player</p>
              </div>
            </div>
            <AvatarPicker selected={avatar} onSelect={setAvatar} />
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep('name')} className="flex-1">← Back</Button>
              <Button variant="gold" onClick={handleFinish} className="flex-1">Let's Play! 🎮</Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
