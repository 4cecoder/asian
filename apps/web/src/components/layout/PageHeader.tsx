type PageHeaderProps = {
  title: string;
  description?: string;
  /** Right-aligned slot for page-level actions (buttons, links). */
  actions?: React.ReactNode;
};

/** Standard heading block at the top of an (app) or (auth) page. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
