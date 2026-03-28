import { useEffect, useRef } from 'react';
import { api } from '../api';

interface Props {
  code: string;
  name: string;
}

export default function CustomWidgetRenderer({ code, name }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const token = api.getToken();

    // Create a full HTML document for the iframe
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            margin: 0; padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #18181b; color: #fafafa; font-size: 14px;
          }
          * { box-sizing: border-box; }
          h1, h2, h3, h4 { margin-top: 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #27272a; }
          th { color: #a1a1aa; font-size: 12px; text-transform: uppercase; }
          .card { background: #27272a; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
          .stat { font-size: 24px; font-weight: 600; }
          .label { font-size: 12px; color: #71717a; text-transform: uppercase; }
          .green { color: #34d399; }
          .red { color: #f87171; }
          .violet { color: #8b5cf6; }
          .amber { color: #fbbf24; }
        </style>
        <script>
          window.__DRIVELEDGER_TOKEN__ = ${JSON.stringify(token || '')};
          window.__DRIVELEDGER_API__ = '/api';

          // Helper function for API calls
          window.dlFetch = function(path) {
            return fetch('/api' + path, {
              headers: {
                'Authorization': 'Bearer ' + window.__DRIVELEDGER_TOKEN__,
                'Content-Type': 'application/json'
              }
            }).then(r => r.json());
          };
        </script>
      </head>
      <body>
        ${code}
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframeRef.current.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [code]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">{name}</span>
        <span className="text-[10px] text-zinc-600 uppercase">Custom Widget</span>
      </div>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts allow-same-origin"
        className="w-full border-0"
        style={{ minHeight: 200 }}
        title={name}
      />
    </div>
  );
}
