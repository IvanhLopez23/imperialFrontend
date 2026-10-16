import type { ReactNode } from "react";

interface Props {
  category: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}

export default function PageHeader({ category, title, description, actions, icon }: Props) {
  return (
    <header className="page-header">
      <div>
        <div className="page-category">
          {icon}
          {category}
        </div>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
