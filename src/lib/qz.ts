'use client';

let qz: any = null;

async function load() {
  if (!qz) {
    const mod = await import('qz-tray');
    qz = (mod as any).default ?? mod;

    // Certificat servi comme fichier statique (texte brut, sans auth)
    qz.security.setCertificatePromise(function (resolve: any, reject: any) {
      fetch('/qz/certificate.txt', { cache: 'no-store', headers: { 'Content-Type': 'text/plain' } })
        .then(function (res) {
          res.ok ? resolve(res.text()) : reject(new Error('Certificate fetch failed: ' + res.status));
        })
        .catch(reject);
    });

    // Signature côté serveur Next.js (clé privée jamais exposée au navigateur)
    qz.security.setSignaturePromise(function (toSign: string) {
      return function (resolve: any, reject: any) {
        fetch('/api/qz/sign', {
          method: 'POST',
          body: toSign,
          headers: { 'Content-Type': 'text/plain' },
          cache: 'no-store',
        })
          .then(function (res) {
            res.ok ? resolve(res.text()) : reject(new Error('Sign failed: ' + res.status));
          })
          .catch(reject);
      };
    });
  }
  return qz;
}

export async function qzConnect(): Promise<void> {
  const lib = await load();
  if (!lib.websocket.isActive()) {
    await lib.websocket.connect({ retries: 3, delay: 1 });
  }
}

export async function qzDisconnect(): Promise<void> {
  if (qz?.websocket.isActive()) {
    await qz.websocket.disconnect();
  }
}

export function qzIsActive(): boolean {
  return qz?.websocket?.isActive() ?? false;
}

export async function qzGetPrinters(): Promise<string[]> {
  const lib = await load();
  const result = await lib.printers.find('');
  return Array.isArray(result) ? result : result ? [result] : [];
}

export async function qzGetDefault(): Promise<string> {
  const lib = await load();
  return lib.printers.getDefault();
}

export async function qzPrintHTML(html: string, printer: string, widthIn = 3.1496): Promise<void> {
  const lib = await load();
  const config = lib.configs.create(printer, {
    size: { width: widthIn },
    units: 'in',
    colorType: 'blackwhite',
  });
  await lib.print(config, [{ type: 'pixel', format: 'html', flavor: 'plain', data: html }]);
}
