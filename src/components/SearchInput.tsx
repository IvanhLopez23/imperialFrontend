interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  busy?: boolean; // true mientras se teclea o se pide al servidor
}

export default function SearchInput({ value, onChange, placeholder, busy }: Props) {
  return (
    <div className="search-wrap">
      {busy ? <span className="spinner" /> : <span className="search-ico">⌕</span>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Buscar..."}
      />
      {value && (
        <button type="button" className="search-clear" onClick={() => onChange("")} title="Limpiar búsqueda">
          ✕
        </button>
      )}
    </div>
  );
}
