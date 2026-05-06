/**
 * Apple-grade page layout primitives. Use these inside DashboardLayout to
 * get consistent responsive width, padding, and section spacing across every
 * surface. Mobile / tablet / desktop variants are baked in.
 *
 *   <Page>
 *     <PageHeader title="Leads" description="..." actions={<Button .../>} />
 *     <PageSection>...</PageSection>
 *     <PageSection title="Recent">...</PageSection>
 *   </Page>
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-full space-y-6 sm:space-y-8", className)}>{children}</div>;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-title-1 font-display">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

interface PageSectionProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageSection({ title, description, actions, children, className }: PageSectionProps) {
  return (
    <section className={cn("space-y-3 sm:space-y-4", className)}>
      {(title || actions) && (
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-title-2 font-display">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Responsive grid: 1 col mobile, 2 col tablet, configurable desktop. */
export function PageGrid({
  children,
  cols = 3,
  className,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  const lg =
    cols === 2 ? "lg:grid-cols-2" : cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5", lg, className)}>
      {children}
    </div>
  );
}
