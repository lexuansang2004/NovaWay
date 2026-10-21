import { useEffect, useState, type ReactNode } from 'react';
import { motion, useAnimationControls, type TargetAndTransition } from 'framer-motion';
import { useReducedMotionNow } from '@/contexts/motionPreferenceContext';

const SHOWN = { opacity: 1, y: 0 };

// WEB-12 (spec §4.4, WEB-D13): a one-time decorative entrance (fade and/or
// slide) that follows reduced motion live. Reduced on mount → no entrance at
// all. Reduced while it is running → stopped and set to its final state at
// once, without remounting the children (form values and focus stay). It
// never replays when motion is allowed again. Framer reads its own
// MotionConfig only when an element mounts, so this is done explicitly.
export function Entrance({ from, duration, className, children }: {
  from: TargetAndTransition;
  duration: number;
  className?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotionNow();
  const [reducedAtMount] = useState(reduced);
  const controls = useAnimationControls();

  useEffect(() => {
    if (reducedAtMount) controls.set(SHOWN);
    else void controls.start({ ...SHOWN, transition: { duration, ease: 'easeOut' } });
  }, [controls, duration, reducedAtMount]);

  useEffect(() => {
    if (!reduced) return;
    controls.stop();
    controls.set(SHOWN);
  }, [controls, reduced]);

  return (
    <motion.div className={className} initial={reducedAtMount ? false : from} animate={controls}>
      {children}
    </motion.div>
  );
}
