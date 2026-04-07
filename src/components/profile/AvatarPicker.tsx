import { useState } from 'react';
import { cn } from '@/lib/cn';

const AVATAR_CATEGORIES = {
  'People': ['😀', '😂', '🤣', '😍', '🥳', '🤩', '😎', '🤓', '🧐', '🥸', '🤗', '😏', '😊', '🙂', '😈', '👻', '🤠', '🥷', '🧙', '👑'],
  'Animals': ['🐶', '🐱', '🐭', '🐹', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🦋', '🦄', '🦅', '🦉', '🐙', '🦈', '🦊'],
  'Games': ['🃏', '🀄', '🎰', '🎯', '🎲', '🏆', '🥇', '🎮', '🕹️', '🎱', '♠️', '♥️', '♦️', '♣️', '🎪', '🎭', '🎨', '🎬', '🎤', '🎸'],
  'Food': ['🍎', '🍊', '🍋', '🍇', '🍓', '🍕', '🍔', '🎂', '🍦', '🍩', '🍿', '🧀', '🌮', '🍜', '🍣', '🍺', '🥑', '🌶️', '🍕', '🧁'],
  'Nature': ['⭐', '🌙', '☀️', '🌈', '🔮', '💎', '🌊', '🔥', '❄️', '⚡', '🌸', '🍀', '🌴', '🦋', '🌺', '🍄', '🌻', '🌿', '🐚', '💐'],
  'Objects': ['🚀', '🎩', '💡', '🔑', '💰', '📚', '🎸', '🎺', '🎻', '🥁', '🎵', '🎶', '🎪', '🎠', '⚓', '🗡️', '🛡️', '🎁', '💌', '🔮'],
};

interface AvatarPickerProps {
  selected: string;
  onSelect: (emoji: string) => void;
  className?: string;
}

export default function AvatarPicker({ selected, onSelect, className }: AvatarPickerProps) {
  const [activeCategory, setActiveCategory] = useState<keyof typeof AVATAR_CATEGORIES>('People');
  const [search, setSearch] = useState('');

  const categories = Object.keys(AVATAR_CATEGORIES) as (keyof typeof AVATAR_CATEGORIES)[];
  const emojis = AVATAR_CATEGORIES[activeCategory];
  const filtered = search
    ? Object.values(AVATAR_CATEGORIES).flat().filter((e) => e.includes(search))
    : emojis;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search emoji..."
        className="w-full rounded-xl px-4 py-2.5 bg-black/30 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-yellow-400 text-sm font-ui"
      />

      {/* Category tabs */}
      {!search && (
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium font-ui flex-shrink-0 transition-colors',
                activeCategory === cat
                  ? 'bg-yellow-500 text-yellow-900'
                  : 'bg-white/10 text-white/60 hover:bg-white/20',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="grid grid-cols-6 gap-2">
        {filtered.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className={cn(
              'aspect-square rounded-xl text-2xl flex items-center justify-center transition-all',
              'hover:bg-white/10 active:scale-90',
              selected === emoji && 'bg-yellow-500/20 ring-2 ring-yellow-400 scale-110',
            )}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
