import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      <Icon className="mb-4 size-12 opacity-50" />
      <div className="mb-2 text-base font-semibold text-foreground/80">{title}</div>
      <p className="max-w-sm text-sm leading-relaxed">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
