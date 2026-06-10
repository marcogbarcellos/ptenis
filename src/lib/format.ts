import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "?";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

const CORES_AVATAR = [
  "bg-emerald-600", "bg-teal-600", "bg-sky-600", "bg-indigo-600",
  "bg-violet-600", "bg-rose-600", "bg-amber-600", "bg-lime-600",
];
export function corAvatar(nome: string) {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) % 997;
  return CORES_AVATAR[h % CORES_AVATAR.length];
}

export function formatarDataHora(data: Date, tz: string) {
  return formatInTimeZone(data, tz, "EEE, d MMM, HH:mm", { locale: ptBR });
}
export function formatarData(data: Date, tz: string) {
  return formatInTimeZone(data, tz, "d 'de' MMMM", { locale: ptBR });
}

// [[6,4],[3,6],[10,7]] → "6/4 3/6 [10-7]" (match tiebreak entre colchetes)
export function placarTexto(sets: number[][]) {
  return sets
    .map(([a, b]) => (Math.max(a, b) >= 10 ? `[${a}-${b}]` : `${a}/${b}`))
    .join(" ");
}
