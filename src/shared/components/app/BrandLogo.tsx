import { cn } from '@/lib/utils';

/**
 * Dark wordmark in the light theme, white wordmark in the dark theme. The logo is wide
 * (about 9:1), so size it by width and let the height follow: a fixed height squeezes it
 * as soon as the container is narrower than the logo wants to be.
 */
export default function BrandLogo({ className }: { className?: string }) {
  return (
    <>
      <img src="/brand/ys-logo-light.png" alt="YECHIM.SYSTEMS" className={cn('h-auto w-full dark:hidden', className)} draggable={false} />
      <img src="/brand/ys-logo-dark.png" alt="YECHIM.SYSTEMS" className={cn('hidden h-auto w-full dark:block', className)} draggable={false} />
    </>
  );
}
