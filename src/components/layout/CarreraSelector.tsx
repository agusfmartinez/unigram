import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/store/useAppStore";

export function CarreraSelector() {
  const carreras = useAppStore((s) => s.carreras);
  const carreraActivaId = useAppStore((s) => s.carreraActivaId);
  const setCarreraActiva = useAppStore((s) => s.setCarreraActiva);

  if (carreras.length === 0) return null;

  return (
    <Select value={carreraActivaId ?? undefined} onValueChange={setCarreraActiva}>
      <SelectTrigger className="w-full" size="sm">
        <SelectValue placeholder="Elegí una carrera" />
      </SelectTrigger>
      <SelectContent>
        {carreras.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
