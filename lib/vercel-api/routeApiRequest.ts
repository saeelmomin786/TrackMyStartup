import type { VercelRequest, VercelResponse } from '@vercel/node';
import inviteHandler from './handlers/invite';
import otpHandler from './handlers/otp';
import configHandler from './handlers/config';
import googleCalendarHandler from './handlers/google-calendar';
import mentorStatsHandler from './handlers/mentor-stats';
import mentorHistoryHandler from './handlers/mentor-history';
import mentorStatusHandler from './handlers/mentor-status';
import prerenderHandler from './handlers/prerender';
import sitemapXmlHandler from './handlers/sitemapXml';
import paymentVerifyHandler from './handlers/paymentVerify';
import billingSubscriptionStatusHandler from './handlers/billingSubscriptionStatus';
import razorpayActionHandler from './handlers/razorpayAction';
import eventsActionHandler from './handlers/eventsAction';
import investorApplicationActionHandler from './handlers/investorApplicationAction';
import autoRenewAdvisorCreditsHandler from './handlers/autoRenewAdvisorCredits';

function getApiPathSegments(req: VercelRequest): string[] {
  // Vercel: file `api/[...path].ts` exposes segments as `req.query.path` (array or string), not `...path`.
  const qPath = req.query.path;
  if (Array.isArray(qPath)) {
    return qPath.map(String).filter(Boolean);
  }
  if (typeof qPath === 'string' && qPath.length > 0) {
    // Crawler rewrites use `?path=/about` — that is a site pathname, not API segments.
    if (qPath.startsWith('/') && qPath !== '/') {
      return [];
    }
    if (qPath === '/') {
      return [];
    }
    if (qPath.includes('/')) {
      return qPath.split('/').filter(Boolean);
    }
    return [qPath];
  }

  const rawLegacy = req.query['...path'];
  if (Array.isArray(rawLegacy)) return rawLegacy.map(String).filter(Boolean);
  if (typeof rawLegacy === 'string' && rawLegacy.length > 0) {
    return rawLegacy.split('/').filter(Boolean);
  }

  const pathOnly = (req.url || '').split('?')[0];
  if (pathOnly.startsWith('/api/')) {
    return pathOnly.slice(5).split('/').filter(Boolean);
  }
  // Internal invocations sometimes omit the `/api` prefix
  const trimmed = pathOnly.replace(/^\//, '');
  if (trimmed.length > 0 && !trimmed.startsWith('api')) {
    return trimmed.split('/').filter(Boolean);
  }
  return [];
}

/**
 * Dispatches `/api/*` requests (except crawler rewrites using `?path=` only).
 * Returns true if a handler was invoked.
 */
export async function routeApiRequest(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  const segments = getApiPathSegments(req);
  if (segments.length === 0) {
    return false;
  }

  const key = segments.join('/');
  const q = req.query as Record<string, string | string[] | undefined>;

  if (key === 'cron/auto-renew-advisor-credits') {
    await autoRenewAdvisorCreditsHandler(req, res);
    return true;
  }

  if (segments[0] === 'razorpay' && segments[1]) {
    q.action = segments[1];
    await razorpayActionHandler(req, res);
    return true;
  }

  if (segments[0] === 'events' && segments[1]) {
    q.action = segments[1];
    await eventsActionHandler(req, res);
    return true;
  }

  if (segments[0] === 'investor-application' && segments[1]) {
    q.action = segments[1];
    await investorApplicationActionHandler(req, res);
    return true;
  }

  if (key === 'payment/verify') {
    await paymentVerifyHandler(req, res);
    return true;
  }

  if (key === 'billing/subscription-status') {
    await billingSubscriptionStatusHandler(req, res);
    return true;
  }

  if (key === 'invite') {
    await inviteHandler(req, res);
    return true;
  }

  if (key === 'otp') {
    await otpHandler(req, res);
    return true;
  }

  if (key === 'config') {
    await configHandler(req, res);
    return true;
  }

  if (key === 'google-calendar') {
    await googleCalendarHandler(req, res);
    return true;
  }

  if (key === 'mentor-stats') {
    await mentorStatsHandler(req, res);
    return true;
  }

  if (key === 'mentor-history') {
    await mentorHistoryHandler(req, res);
    return true;
  }

  if (key === 'mentor-status') {
    await mentorStatusHandler(req, res);
    return true;
  }

  if (key === 'prerender') {
    await prerenderHandler(req, res);
    return true;
  }

  if (key === 'sitemap.xml') {
    await sitemapXmlHandler(req, res);
    return true;
  }

  return false;
}
