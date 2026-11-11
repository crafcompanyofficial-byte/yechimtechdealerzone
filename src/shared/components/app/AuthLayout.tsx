import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import BrandLogo from './BrandLogo';
import { LangToggle, ThemeToggle } from './toggles';

/** Sign-in screens: shadcn's login block, a card centred on the muted background. */
export default function AuthLayout({ title, description, footer, children }: {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <BrandLogo className="w-64 self-center" />
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
        {footer ? <div className="text-center text-sm text-muted-foreground">{footer}</div> : null}
        <div className="flex justify-center gap-1">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
