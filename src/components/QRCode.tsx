import { useState, useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';
import { Download, Printer } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

interface QRCodeProps {
  data: string;
  size?: number;
  label?: string;
}

export default function QRCode({ data, size = 200, label }: QRCodeProps) {
  const { t } = useI18n();
  const [svgString, setSvgString] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    QRCodeLib.toString(data, {
      type: 'svg',
      width: size,
      margin: 2,
      color: {
        dark: '#e4e4e7',  // zinc-200
        light: '#00000000', // transparent
      },
    }).then(svg => {
      setSvgString(svg);
    }).catch(err => {
      console.error('QR code generation failed:', err);
    });
  }, [data, size]);

  const handleDownload = () => {
    // Create a canvas from the SVG to export as PNG
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // White background
      ctx.fillStyle = '#18181b'; // zinc-900
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);

      const link = document.createElement('a');
      link.download = `qr-code-${label || 'vehicle'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${label || 'Vehicle'}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .label {
              margin-top: 16px;
              font-size: 18px;
              font-weight: 600;
            }
            .url {
              margin-top: 8px;
              font-size: 12px;
              color: #666;
              word-break: break-all;
              max-width: 300px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          ${svgString}
          ${label ? `<div class="label">${label}</div>` : ''}
          <div class="url">${data}</div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!svgString) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <p className="text-sm text-zinc-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={containerRef}
        className="bg-zinc-900 rounded-xl p-4 border border-zinc-800"
        dangerouslySetInnerHTML={{ __html: svgString }}
      />
      {label && (
        <p className="text-sm font-medium text-zinc-300">{label}</p>
      )}
      <p className="text-xs text-zinc-500 max-w-[280px] text-center break-all">{data}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={handleDownload}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-9 px-4 text-sm inline-flex items-center gap-2 transition-colors"
        >
          <Download size={14} />
          {t('qr_code.download')}
        </button>
        <button
          onClick={handlePrint}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-9 px-4 text-sm inline-flex items-center gap-2 transition-colors"
        >
          <Printer size={14} />
          {t('qr_code.print')}
        </button>
      </div>
    </div>
  );
}
