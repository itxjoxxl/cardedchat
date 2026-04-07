import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import GameSelector from '@/components/lobby/GameSelector';
import { fadeVariants, slideUpVariants } from '@/animations/variants';

export default function HomePage() {
  return (
    <AppShell>
      <motion.div
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6 px-4 pt-6 pb-4"
      >
        {/* Hero */}
        <motion.div variants={slideUpVariants} className="text-center">
          <h1 className="text-3xl font-bold text-yellow-400 font-card tracking-wider mb-1">
            CARDED
          </h1>
          <p className="text-white/50 text-sm font-ui">Classic card games, anywhere.</p>
        </motion.div>

        {/* Game selector */}
        <motion.div variants={slideUpVariants} transition={{ delay: 0.1 }}>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest font-ui mb-3">
            Choose a Game
          </h2>
          <GameSelector />
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
