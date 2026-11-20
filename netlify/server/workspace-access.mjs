// Public workspace access is intentional: every visitor can read and write.
// Keep the common role context used by the existing business-rule handlers.
export async function publicWorkspaceAccess(c, next) {
  c.header('Cache-Control', 'private, no-store');
  if (c.req.method !== 'GET' && c.req.header('Origin') !== new URL(c.req.url).origin) {
    return c.json({ error: 'مصدر الطلب غير مسموح' }, 403);
  }
  c.set('actor', 'وصول مشترك دون حساب');
  c.set('role', 'admin');
  await next();
}
