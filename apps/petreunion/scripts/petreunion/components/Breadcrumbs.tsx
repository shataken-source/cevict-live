'use client';

import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: '20px' }}>
      <ol style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        listStyle: 'none',
        padding: 0,
        margin: 0,
        flexWrap: 'wrap'
      }}>
        <li>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#667eea',
              textDecoration: 'none',
              fontSize: '14px'
            }}
            aria-label="Home"
          >
            <Home size={16} />
            <span>Home</span>
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ChevronRight size={16} color="#999" />
            {item.href ? (
              <Link
                href={item.href}
                style={{
                  color: '#667eea',
                  textDecoration: 'none',
                  fontSize: '14px'
                }}
              >
                {item.label}
              </Link>
            ) : (
              <span style={{ color: '#666', fontSize: '14px' }}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

