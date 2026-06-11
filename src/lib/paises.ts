// Lista curada dos países mais comuns na comunidade (brasileiros/portugueses + imigração em
// Portugal). "Outro" no seletor cobre qualquer outro país via número internacional completo.
export type Pais = { iso: string; nome: string; flag: string; code: string; exemplo?: string };

export const PAISES: Pais[] = [
  { iso: "PT", nome: "Portugal", flag: "🇵🇹", code: "+351", exemplo: "912 345 678" },
  { iso: "BR", nome: "Brasil", flag: "🇧🇷", code: "+55", exemplo: "11 91234-5678" },
  { iso: "AO", nome: "Angola", flag: "🇦🇴", code: "+244" },
  { iso: "MZ", nome: "Moçambique", flag: "🇲🇿", code: "+258" },
  { iso: "CV", nome: "Cabo Verde", flag: "🇨🇻", code: "+238" },
  { iso: "ES", nome: "Espanha", flag: "🇪🇸", code: "+34" },
  { iso: "FR", nome: "França", flag: "🇫🇷", code: "+33" },
  { iso: "GB", nome: "Reino Unido", flag: "🇬🇧", code: "+44" },
  { iso: "IE", nome: "Irlanda", flag: "🇮🇪", code: "+353" },
  { iso: "DE", nome: "Alemanha", flag: "🇩🇪", code: "+49" },
  { iso: "CH", nome: "Suíça", flag: "🇨🇭", code: "+41" },
  { iso: "IT", nome: "Itália", flag: "🇮🇹", code: "+39" },
  { iso: "NL", nome: "Países Baixos", flag: "🇳🇱", code: "+31" },
  { iso: "BE", nome: "Bélgica", flag: "🇧🇪", code: "+32" },
  { iso: "LU", nome: "Luxemburgo", flag: "🇱🇺", code: "+352" },
  { iso: "US", nome: "Estados Unidos", flag: "🇺🇸", code: "+1" },
  { iso: "UA", nome: "Ucrânia", flag: "🇺🇦", code: "+380" },
];

export const PAIS_PADRAO = "+351"; // Portugal — onde a maioria da comunidade está
