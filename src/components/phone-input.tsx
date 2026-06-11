"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { PAISES, PAIS_PADRAO } from "@/lib/paises";

// Quebra um E.164 salvo (ex.: "+5511987654321") em código do país + número local, pra pré-preencher.
function dividir(e164: string): { cc: string; local: string } {
  const v = (e164 ?? "").trim();
  if (!v.startsWith("+")) return { cc: PAIS_PADRAO, local: v.replace(/\D/g, "") };
  const porMaiorCodigo = [...PAISES].sort((a, b) => b.code.length - a.code.length);
  const p = porMaiorCodigo.find((x) => v.startsWith(x.code));
  if (p) return { cc: p.code, local: v.slice(p.code.length) };
  return { cc: "other", local: v }; // país fora da lista → modo "Outro" com o número completo
}

export function PhoneInput({ id, name = "telefone", defaultValue = "" }: {
  id?: string; name?: string; defaultValue?: string;
}) {
  const inicial = dividir(defaultValue);
  const [cc, setCc] = useState(inicial.cc);
  const [local, setLocal] = useState(inicial.local);

  const outro = cc === "other";
  const pais = PAISES.find((p) => p.code === cc);
  // Em modo país: junta código + dígitos (tira zeros de tronco). Em "Outro": o número já vem completo.
  const digitos = local.replace(/\D/g, "").replace(/^0+/, "");
  const valor = outro ? local.trim() : digitos ? `${cc}${digitos}` : "";

  function trocarPais(novo: string) {
    // Ao ir pra "Outro", preserva o número como internacional pra não perder o que já foi digitado.
    if (novo === "other" && !outro && digitos) setLocal(`${cc}${digitos}`);
    setCc(novo);
  }

  return (
    <div className="flex gap-2">
      <input type="hidden" name={name} value={valor} />
      <select aria-label="País" value={cc} onChange={(e) => trocarPais(e.target.value)}
        className="w-36 shrink-0 rounded-lg border border-input bg-background px-2 text-sm">
        {PAISES.map((p) => <option key={p.iso} value={p.code}>{p.flag} {p.nome}</option>)}
        <option value="other">🌐 Outro</option>
      </select>
      <Input id={id} type="tel" inputMode="tel" autoComplete="tel" value={local} required
        onChange={(e) => setLocal(e.target.value)}
        placeholder={outro ? "+1 555 123 4567" : (pais?.exemplo ?? "Número de telefone")}
        className="flex-1" />
    </div>
  );
}
