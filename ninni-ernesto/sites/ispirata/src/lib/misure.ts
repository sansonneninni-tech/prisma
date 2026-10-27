/**
 * Separatori che non restano soli a inizio riga (regola di Casa, logica copiata da `sites/casa/src/lib/misure.ts`).
 * Le misure non vanno più a capo nel mezzo: dal core 0.3.0 `formatDimensions` usa già spazi non separabili.
 * Per le righe in HTML c'è la classe `.sep-riga` (base.css), che a inizio riga il punto lo nasconde.
 */
export const SEP = ' · ';
export const unisci = (parti: (string | false | null | undefined | 0)[]): string => parti.filter(Boolean).join(SEP);
/** Le parti di una frase già tradotta con « · », da mettere in una `.sep-riga`. «伊莎贝拉·皮斯蒂洛» resta intero. */
export const pezzi = (s: string): string[] => s.split(/\s+·\s+/).filter(Boolean);
