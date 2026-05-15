/**
 * Vite/non-Next deployments: `api/[...path]` only matches ONE segment after `/api/`.
 * This file restores `/api/investor-application/:action` (e.g. create-order).
 */
export { default } from '../../lib/vercel-api/handlers/investorApplicationAction';
