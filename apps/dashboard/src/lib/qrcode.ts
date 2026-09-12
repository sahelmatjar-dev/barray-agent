import QRCode from "qrcode";

/** Generates a QR code (PNG data URL) that opens the given part's dashboard
 * page. Used on donor truck part labels — physically printed and stuck on
 * the part/package so scanning it in the warehouse opens /parts/[id]. */
export async function generatePartQrCode(partUrl: string): Promise<string> {
  return QRCode.toDataURL(partUrl, { margin: 1, width: 240 });
}
