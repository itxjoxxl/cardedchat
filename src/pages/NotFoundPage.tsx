import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFoundPage() {
  return (
    <div className="w-full h-full felt-surface flex flex-col items-center justify-center gap-6 px-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-7xl mb-4">🃏</div>
        <h1 className="text-3xl font-bold text-yellow-400 font-card mb-2">404</h1>
        <p className="text-white/60 font-ui">This page doesn't exist, partner.</p>
      </motion.div>
      <Link to="/" className="bg-yellow-500 text-yellow-900 font-bold px-6 py-3 rounded-2xl hover:bg-yellow-400 transition-colors font-ui">
        Back to Games
      </Link>
    </div>
  );
}
