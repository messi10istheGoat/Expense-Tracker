import { useId } from 'react';
import { Check, CheckCircle2, Monitor, Moon, SlidersHorizontal, Sun, Type } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { STYLES, type ModePreference } from './appearance';

export function ThemeStudio({ compact = false }: { compact?: boolean }) {
  const group = useId();
  const { style, setStyle, mode, setMode, isDark, textSize, setTextSize } = useTheme();
  const active = STYLES.find((item) => item.id === style)!;
  return (
    <div className={`theme-studio ${compact ? 'compact-studio' : ''}`}>
      <div className="studio-intro">
        <div>
          <span className="eyebrow">
            <SlidersHorizontal size={14} />
            YOUR SPACE, YOUR STYLE
          </span>
          <h3>
            Make it feel like <em>you.</em>
          </h3>
          <p>Five personalities. Light or dark. One clear picture of your money.</p>
        </div>
        <span className="studio-count">
          {String(STYLES.length).padStart(2, '0')} <span>CURATED STYLES</span>
        </span>
      </div>
      <fieldset className="mode-picker">
        <legend>Color mode</legend>
        <div className="mode-buttons">
          {(
            [
              { id: 'light', label: 'Light & airy', icon: Sun },
              { id: 'dark', label: 'After hours', icon: Moon },
              { id: 'system', label: 'Use device', icon: Monitor },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={mode === item.id}
              onClick={() => setMode(item.id as ModePreference)}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
              {mode === item.id && <Check size={14} />}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="style-picker">
        <legend>Choose your design</legend>
        <div className="style-gallery">
          {STYLES.map((item) => (
            <label
              key={item.id}
              className={`theme-choice theme-choice-${item.id} ${style === item.id ? 'chosen' : ''}`}
            >
              <input
                className="theme-choice-input"
                type="radio"
                name={group}
                value={item.id}
                checked={style === item.id}
                onChange={() => setStyle(item.id)}
                aria-label={`${item.name} theme`}
              />
              <div
                className="theme-miniature"
                data-preview={item.id}
                data-preview-mode={isDark ? 'dark' : 'light'}
                aria-hidden="true"
              >
                <div className="mini-side">
                  <span />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="mini-content">
                  <div className="mini-top">
                    <span>Overview</span>
                    <i />
                  </div>
                  <div className="mini-metrics">
                    <div>
                      <small>Your balance</small>
                      <strong>
                        $12,840<span>.00</span>
                      </strong>
                      <i />
                    </div>
                    <div>
                      <small>Monthly flow</small>
                      <span className="mini-bars">
                        {[35, 55, 42, 72, 64, 90].map((height, i) => (
                          <i key={i} style={{ height: `${height}%` }} />
                        ))}
                      </span>
                    </div>
                  </div>
                  <div className="mini-bottom">
                    <svg viewBox="0 0 150 40">
                      <path
                        d="M0 35L18 29L36 32L54 16L72 22L90 9L108 14L130 3L150 6"
                        fill="none"
                        stroke="var(--green)"
                        strokeWidth="3"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                </div>
              </div>
              <div className="theme-choice-title">
                <strong>{item.name}</strong>
                <span className="theme-radio">{style === item.id && <Check size={12} />}</span>
              </div>
              <span className="theme-tagline">{item.tagline}</span>
              <p>{item.description}</p>
              <span className="theme-meta">
                <span className="theme-swatches">
                  {item.colors.map((color) => (
                    <i key={color} style={{ background: color }} />
                  ))}
                </span>
                <span>{item.label}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="reading-size">
        <span>
          <Type size={20} />
          <span>
            <strong>A little easier to read</strong>
            <small>Make labels, notes, and controls larger.</small>
          </span>
        </span>
        <div role="group" aria-label="Reading size">
          <button aria-pressed={textSize === 'standard'} onClick={() => setTextSize('standard')}>
            Standard
          </button>
          <button aria-pressed={textSize === 'large'} onClick={() => setTextSize('large')}>
            Larger
          </button>
        </div>
      </div>
      <div className="studio-status" role="status">
        <CheckCircle2 size={16} />
        <span>
          <strong>{active.name}</strong> · {isDark ? 'Dark' : 'Light'}
          {mode === 'system' ? ' (following your device)' : ''}
        </span>
        <small>Applies instantly. Your financial data stays unchanged.</small>
      </div>
    </div>
  );
}
