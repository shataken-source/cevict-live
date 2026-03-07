'use client';

import React from 'react';
import type { CSSProperties } from 'react';
import styles from '../page.module.css';

export function KpiTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className={styles.kpiTile}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue} style={{ color: color ?? '#e5e7eb' }}>
        {value}
      </div>
    </div>
  );
}

export function HealthMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.healthMetric}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function DistributionBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className={styles.distRow}>
      <div className={styles.distLabel}>{label}</div>
      <div className={styles.distBarWrap}>
        <div className={styles.distBar} style={{ width: `${value}%` }} />
      </div>
      <div className={styles.distValue}>{value}%</div>
    </div>
  );
}

export function ConfirmationDialog({
  dialog,
  onClose,
  onConfirm,
}: {
  dialog: { title: string; message: string; type: 'info' | 'error' | 'warning' };
  onClose: () => void;
  onConfirm?: () => void;
}) {
  const isExit = dialog.title.includes('Exit');
  const titleColor =
    dialog.type === 'error'
      ? '#fb7185'
      : dialog.type === 'warning'
        ? '#fbbf24'
        : '#a78bfa';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1f3a 0%, #0f1419 100%)',
          border: '1px solid rgba(102, 126, 234, 0.3)',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '420px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Backspace') e.preventDefault();
        }}
      >
        <div
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: titleColor,
            marginBottom: '12px',
          }}
        >
          {dialog.title}
        </div>
        <div
          style={{
            fontSize: '14px',
            color: '#c4b5fd',
            lineHeight: 1.6,
            marginBottom: '24px',
          }}
        >
          {dialog.message}
        </div>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'rgba(102, 126, 234, 0.2)',
              color: '#a78bfa',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            {isExit ? 'Cancel' : 'Close'}
          </button>
          {isExit && onConfirm && (
            <button
              onClick={onConfirm}
              style={{
                padding: '10px 20px',
                background: 'rgba(251, 113, 133, 0.2)',
                color: '#fb7185',
                border: '1px solid rgba(251, 113, 133, 0.3)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
            >
              Exit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
