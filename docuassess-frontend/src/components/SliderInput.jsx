export default function SliderInput({ value, onChange, min = 1, max = 20, label = 'Count per type' }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
          {label}
        </h3>
        <span
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--color-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${((value - min) / (max - min)) * 100}%, var(--color-border) ${((value - min) / (max - min)) * 100}%, var(--color-border) 100%)`,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{min}</span>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{max}</span>
      </div>
    </div>
  );
}
