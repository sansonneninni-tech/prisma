/**
 * Technical texts the core components need and that are not in `testi/*.json`.
 * They live under `core.*`; a site can override any of them by adding the same key to its texts.
 */
import { TESTI_AR } from '../ar/testi.ts';
import type { Locale } from '../types.ts';
import type { Messages } from './translate.ts';

export const CORE_MESSAGES: Record<Locale, Messages> = {
  it: {
    core: {
      zone: {
        italy: 'Italia',
        eu: 'Europa (UE)',
        'uk-ch': 'Regno Unito e Svizzera',
        asia: 'Cina e Asia',
        world: 'Resto del mondo',
      },
      cart: {
        conteggio_aria: 'Carrello: {n} articoli',
        diminuisci: 'Togli una copia di {titolo}',
        aumenta: 'Aggiungi una copia di {titolo}',
        rimuovi: 'Rimuovi {titolo} dal carrello',
        quantita_aggiornata: '{titolo}: quantità {n}.',
        stampa_dettaglio: 'Stampa {formato} cm · {supporto}',
        originale_dettaglio: 'Originale',
        assicurazione: 'di cui assicurazione',
        consegna_giorni: '{min}–{max} giorni lavorativi dalla spedizione',
        totale_aggiornato: 'Totale aggiornato: {totale}.',
        non_acquistabile: 'Questo pezzo non si può ancora acquistare.',
        iva_esente: "IVA non applicata (spedizione fuori dall'UE).",
      },
      checkout: {
        passo_n: 'Passo {n} di {totale}',
        errori_riepilogo: 'Ci sono {n} campi da sistemare:',
        carrello_vuoto: 'Il carrello è vuoto: aggiungi un\'opera per procedere.',
        rate_non_disponibili: 'Il pagamento a rate è disponibile per ordini da {min} a {max}.',
        carta_rifiutata_senza_rate: 'La banca ha rifiutato il pagamento. Prova con un\'altra carta.',
        carta_prova_suggerimento: 'Carta di prova: 4242 4242 4242 4242 · rifiutata: 4000 0000 0000 0002',
        campi_da_compilare: 'Campi da compilare',
        dati_titolo: 'Dati e indirizzo',
        riepilogo_dati: 'Consegna a',
      },
      form: {
        facoltativo: 'facoltativo',
        demo_nota: 'Demo: il messaggio non viene inviato a nessuno.',
      },
      lang: {
        scegli: 'Scegli la lingua',
      },
      ar: { ...TESTI_AR.it },
    },
  },
  en: {
    core: {
      zone: {
        italy: 'Italy',
        eu: 'Europe (EU)',
        'uk-ch': 'United Kingdom and Switzerland',
        asia: 'China and Asia',
        world: 'Rest of the world',
      },
      cart: {
        conteggio_aria: 'Cart: {n} items',
        diminuisci: 'Remove one copy of {titolo}',
        aumenta: 'Add one copy of {titolo}',
        rimuovi: 'Remove {titolo} from the cart',
        quantita_aggiornata: '{titolo}: quantity {n}.',
        stampa_dettaglio: 'Print {formato} cm · {supporto}',
        originale_dettaglio: 'Original',
        assicurazione: 'of which insurance',
        consegna_giorni: '{min}–{max} business days after shipping',
        totale_aggiornato: 'Total updated: {totale}.',
        non_acquistabile: 'This piece cannot be bought yet.',
        iva_esente: 'VAT not applied (shipping outside the EU).',
      },
      checkout: {
        passo_n: 'Step {n} of {totale}',
        errori_riepilogo: 'There are {n} fields to fix:',
        carrello_vuoto: 'Your cart is empty: add a work to continue.',
        rate_non_disponibili: 'Installments are available for orders from {min} to {max}.',
        carta_rifiutata_senza_rate: 'Your bank declined the payment. Try another card.',
        carta_prova_suggerimento: 'Test card: 4242 4242 4242 4242 · declined: 4000 0000 0000 0002',
        campi_da_compilare: 'Fields to fill in',
        dati_titolo: 'Details and address',
        riepilogo_dati: 'Deliver to',
      },
      form: {
        facoltativo: 'optional',
        demo_nota: 'Demo: the message is not sent to anyone.',
      },
      lang: {
        scegli: 'Choose your language',
      },
      ar: { ...TESTI_AR.en },
    },
  },
  zh: {
    core: {
      zone: {
        italy: '意大利',
        eu: '欧洲（欧盟）',
        'uk-ch': '英国和瑞士',
        asia: '中国及亚洲',
        world: '世界其他地区',
      },
      cart: {
        conteggio_aria: '购物车：{n} 件',
        diminuisci: '减少一件 {titolo}',
        aumenta: '增加一件 {titolo}',
        rimuovi: '从购物车中移除 {titolo}',
        quantita_aggiornata: '{titolo}：数量 {n}。',
        stampa_dettaglio: '印刷品 {formato} 厘米 · {supporto}',
        originale_dettaglio: '原作',
        assicurazione: '其中保险',
        consegna_giorni: '发货后 {min}–{max} 个工作日',
        totale_aggiornato: '总计已更新：{totale}。',
        non_acquistabile: '此作品暂不可购买。',
        iva_esente: '不含增值税（寄往欧盟以外地区）。',
      },
      checkout: {
        passo_n: '第 {n} 步，共 {totale} 步',
        errori_riepilogo: '有 {n} 个字段需要修改：',
        carrello_vuoto: '购物车是空的：请先添加一件作品。',
        rate_non_disponibili: '分期付款适用于 {min} 至 {max} 的订单。',
        carta_rifiutata_senza_rate: '银行拒绝了这笔付款。请换一张卡。',
        carta_prova_suggerimento: '测试卡：4242 4242 4242 4242 · 拒付：4000 0000 0000 0002',
        campi_da_compilare: '需要填写',
        dati_titolo: '信息和地址',
        riepilogo_dati: '收货信息',
      },
      form: {
        facoltativo: '选填',
        demo_nota: '演示：消息不会发送给任何人。',
      },
      lang: {
        scegli: '选择语言',
      },
      ar: { ...TESTI_AR.zh },
    },
  },
};
