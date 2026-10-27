# Dati del negozio

- `opere.json`: le foto in vendita. **Dopo ogni vendita di un'edizione limitata aumenta `edizione.vendute`** (il prezzo e "ne restano N" si aggiornano da soli).
- Titoli e numeri di copie vendute oggi sono **provvisori** (dimostrativi): da confermare con Ninni prima di andare online.
- `autore`: `ninni` o `ernesto`. Id 01–49 Ninni, 51–99 Ernesto.
- `stampa_max_cm`: lato lungo massimo stampabile (dipende dalla risoluzione del file).
- Listino stampe e cornici: `packages/core/src/config/prints.ts`.
