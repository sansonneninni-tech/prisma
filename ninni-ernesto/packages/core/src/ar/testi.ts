// Testi predefiniti del componente ArViewer (IT / EN / ZH). Sono anche in CORE_MESSAGES sotto `core.ar.*`,
// cosi' un sito puo' sovrascriverli nei suoi testi e passare `t` al componente. Cinese con 您 (19/10/2026).
export type LinguaAr = 'it' | 'en' | 'zh';

export interface TestiAr {
  /** Testo del bottone che apre la realta' aumentata */
  bottone: string;
  /** Titolo del riquadro con il QR code (desktop) */
  qrTitolo: string;
  /** Spiegazione sotto il QR code */
  qrTesto: string;
  /** Telefono/browser senza realta' aumentata */
  nonSupportato: string;
  /** La realta' aumentata si e' aperta ma non e' riuscita */
  errore: string;
  /** Il modello 3D non si e' caricato */
  erroreModello: string;
  /** Etichetta accessibile dell'anteprima 3D (seguita dal titolo dell'opera) */
  etichetta3d: string;
}

export const TESTI_AR: Record<LinguaAr, TestiAr> = {
  it: {
    bottone: 'Visualizza nella stanza',
    qrTitolo: 'Guardala sulla tua parete',
    qrTesto:
      'Inquadra il codice con la fotocamera del telefono: si apre questa pagina, poi tocca “Visualizza nella stanza” e punta il telefono verso una parete. Il quadro appare alla sua misura reale.',
    nonSupportato:
      'Questo dispositivo o browser non supporta la realtà aumentata. Su iPhone e iPad apri la pagina con Safari; su Android serve Chrome con i Servizi Google Play per AR.',
    errore: 'Non è stato possibile avviare la realtà aumentata. Riprova; su Android controlla che siano installati i Servizi Google Play per AR, su iPhone usa Safari.',
    erroreModello: 'Il modello 3D non si è caricato. Ricarica la pagina per riprovare.',
    etichetta3d: 'Anteprima 3D in scala reale',
  },
  en: {
    bottone: 'View in your room',
    qrTitolo: 'See it on your wall',
    qrTesto:
      'Scan the code with your phone camera to open this page, then tap “View in your room” and point the phone at a wall. The painting appears at its real size.',
    nonSupportato:
      'This device or browser does not support augmented reality. On iPhone and iPad open the page in Safari; on Android you need Chrome with Google Play Services for AR.',
    errore: 'Augmented reality could not be started. Please try again; on Android make sure Google Play Services for AR is installed, on iPhone use Safari.',
    erroreModello: 'The 3D model could not be loaded. Reload the page to try again.',
    etichetta3d: 'Life-size 3D preview',
  },
  zh: {
    bottone: '在您的空间中查看',
    qrTitolo: '在您的墙上看看效果',
    qrTesto: '用手机相机扫描二维码打开此页面，点击“在您的空间中查看”，然后将手机对准墙面。画作将以真实尺寸显示。',
    nonSupportato:
      '此设备或浏览器不支持增强现实。在 iPhone 和 iPad 上请用 Safari 打开本页；在 Android 上需要 Chrome 和 Google Play 增强现实服务。',
    errore: '无法启动增强现实。请重试；在 Android 上请确认已安装 Google Play 增强现实服务，在 iPhone 上请使用 Safari。',
    erroreModello: '3D 模型加载失败，请刷新页面重试。',
    etichetta3d: '真实尺寸 3D 预览',
  },
};

export function testiAr(lingua: LinguaAr = 'it', personalizzati: Partial<TestiAr> = {}): TestiAr {
  return { ...(TESTI_AR[lingua] ?? TESTI_AR.it), ...personalizzati };
}
