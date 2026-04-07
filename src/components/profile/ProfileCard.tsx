import { Link } from 'react-router-dom';
import { useProfileStore } from '@/store/profileStore';

export default function ProfileCard() {
  const { profile } = useProfileStore();
  if (!profile) return null;

  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div className="bg-felt-dark/60 rounded-3xl p-5 border border-white/10 flex items-center gap-4">
      <div className="text-5xl">{profile.avatar}</div>
      <div className="flex-1">
        <h2 className="text-xl font-bold text-white font-ui">{profile.name}</h2>
        <p className="text-white/40 text-sm font-ui">Member since {memberSince}</p>
      </div>
      <Link to="/profile/edit" className="text-white/40 hover:text-white transition-colors text-xl">✏️</Link>
    </div>
  );
}
