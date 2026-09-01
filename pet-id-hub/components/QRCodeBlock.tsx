"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useState } from "react";
import { siteUrl } from "@/lib/firebase";

export default function QRCodeBlock({
  petId,
  petName,
}: {
  petId: string;
  petName: string;
}) {
  const [copied, setCopied] = useState(false);
  const publicUrl = `${siteUrl}/pets/${petId}`;

  async function copyUrl() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadQr() {
    const canvas = document.getElementById(`qr-${petId}`) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${petName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-pawid-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function printTag() {
    const printWindow = window.open("", "_blank", "width=400,height=500");
    if (!printWindow) return;
    const canvas = document.getElementById(
      `qr-${petId}`
    ) as HTMLCanvasElement | null;
    const dataUrl = canvas?.toDataURL("image/png") ?? "";

    printWindow.document.write(`
      <html>
        <head><title>${petName} — QR Tag</title></head>
        <body style="text-align:center; font-family: sans-serif; padding: 24px;">
          <div style="border: 2px dashed #999; border-radius: 16px; padding: 24px; display: inline-block;">
            <img src="${dataUrl}" width="180" height="180" />
            <h2 style="margin: 8px 0 0;">${petName}</h2>
            <p style="color:#666; font-size: 12px;">Scan if found — PawID</p>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="card flex flex-col items-center gap-3">
      <QRCodeCanvas
        id={`qr-${petId}`}
        value={publicUrl}
        size={160}
        level="M"
        includeMargin
      />
      <p className="text-xs text-gray-500 break-all text-center">{publicUrl}</p>
      <div className="grid grid-cols-2 gap-2 w-full">
        <button onClick={copyUrl} className="btn-secondary text-sm">
          {copied ? "Copied" : "Copy link"}
        </button>
        <button onClick={downloadQr} className="btn-secondary text-sm">
          Download QR
        </button>
      </div>
      <button onClick={printTag} className="btn-primary text-sm w-full">
        Print QR collar tag
      </button>
    </div>
  );
}
