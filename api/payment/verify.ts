/** `/api/payment/verify` is two segments after `/api/` — not served by root catch-all on Vite+Vercel. */
export { default } from '../../lib/vercel-api/handlers/paymentVerify';
