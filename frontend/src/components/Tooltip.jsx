import { useState } from 'react';
import './Tooltip.css';

export default function Tooltip({ 
  children, 
  content, 
  title = null,
  type = 'info', // info | warning | danger
  position = 'top', // top | right | bottom | left
  className = ''
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div 
      className={`tooltip-container ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <span className={`tooltip-icon ${type}`}>?</span>
      {visible && (
        <div className={`tooltip-box ${position !== 'top' ? 'no-arrow' : ''}`} style={{ 
          ...(position === 'right' && { left: 'calc(100% + 8px)', bottom: '50%', transform: 'translateY(50%)' }),
          ...(position === 'bottom' && { bottom: 'auto', top: 'calc(100% + 8px)' }),
        }}>
          {title && <div className="tooltip-title">{title}</div>}
          {content}
        </div>
      )}
    </div>
  );
}

export function FormField({ label, children, hint, required = false }) {
  return (
    <div className="form-field-tooltip">
      <label>
        {label}
        {required && <span style={{color: '#ef4444'}}>*</span>}
        {hint && (
          <Tooltip content={hint} type="info">
            <span />
          </Tooltip>
        )}
      </label>
      <div style={{flex: 1}}>{children}</div>
    </div>
  );
}

export function ButtonTooltip({ children, configNeeded, className = '' }) {
  return (
    <div className={`btn-tooltip ${className}`}>
      {children}
      {configNeeded && (
        <Tooltip 
          type="warning"
          content="API key or configuration required. Go to Settings to configure."
          title="Not Configured"
        >
          <span />
        </Tooltip>
      )}
    </div>
  );
}

export function StatusBadge({ status, label }) {
  const colors = {
    active: '#22c55e',
    inactive: '#94a3b8',
    error: '#ef4444',
    warning: '#f97316'
  };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500',
      background: `${colors[status] || '#94a3b8'}20`,
      color: colors[status] || '#94a3b8'
    }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: colors[status] || '#94a3b8'
      }} />
      {label || status}
    </span>
  );
}