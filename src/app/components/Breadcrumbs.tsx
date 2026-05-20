import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-2 text-sm" role="list">
        <li>
          <Link
            to="/"
            className="transition-opacity hover:opacity-70"
            style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', fontWeight: 500 }}
          >
            Home
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4" style={{ color: '#B7B09F' }} aria-hidden="true" />
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="transition-opacity hover:opacity-70"
                  style={{ fontFamily: 'Inter, sans-serif', color: '#5B1E6E', fontWeight: 500 }}
                >
                  {item.label}
                </Link>
              ) : (
                <span style={{ fontFamily: 'Inter, sans-serif', color: '#1A0A24', fontWeight: 600 }} aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}