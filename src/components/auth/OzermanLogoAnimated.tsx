import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import './OzermanLogoAnimated.css';

const MARK_SRC = '/ozerman-mark.png';

type OzermanLogoAnimatedProps = {
  className?: string;
  alt?: string;
};

export default function OzermanLogoAnimated({
  className,
  alt = 'Özerman',
}: OzermanLogoAnimatedProps) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (reduceMotion) {
    return (
      <img
        src={MARK_SRC}
        alt={alt}
        className={cn('object-contain', className)}
      />
    );
  }

  return (
    <div
      className={cn('ozerman-logo', className)}
      role="img"
      aria-label={alt}
    >
      <img
        src={MARK_SRC}
        alt=""
        aria-hidden
        className="ozerman-logo__layer ozerman-logo__top"
        draggable={false}
      />
      <img
        src={MARK_SRC}
        alt=""
        aria-hidden
        className="ozerman-logo__layer ozerman-logo__middle"
        draggable={false}
      />
      <img
        src={MARK_SRC}
        alt=""
        aria-hidden
        className="ozerman-logo__layer ozerman-logo__bottom"
        draggable={false}
      />
      {/* Sizing spacer — layers are absolute */}
      <img
        src={MARK_SRC}
        alt=""
        aria-hidden
        className="block h-full w-auto max-w-full object-contain opacity-0"
        draggable={false}
      />
    </div>
  );
}
