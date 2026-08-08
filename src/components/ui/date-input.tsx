import { Input } from "@/components/ui/input";

// La app guarda fechas en DD/MM/YYYY, pero <input type="date"> usa YYYY-MM-DD.
// Este componente convierte ida y vuelta para mostrar el date picker nativo.

export function ddmmyyyyToISO(s?: string): string {
  if (!s) return "";
  const p = s.split("/");
  if (p.length !== 3) return "";
  const [d, m, y] = p;
  if (!d || !m || !y) return "";
  return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function isoToDDMMYYYY(s: string): string {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

export function DateInput({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (ddmmyyyy: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <Input
      type="date"
      className={className}
      value={ddmmyyyyToISO(value)}
      onChange={(e) => onChange(isoToDDMMYYYY(e.target.value))}
      placeholder={placeholder}
    />
  );
}
