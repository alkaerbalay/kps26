export function requestError(error) {
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 600) {
    return { status: error.status, message: error.message };
  }
  // Drizzle wraps database errors; never return SQL, parameters, or driver details.
  const code = error.cause?.code || error.code;
  if (code === '23505') return { status: 409, message: 'الرمز أو البيانات الفريدة مستخدمة بالفعل. اختر قيمة أخرى.' };
  if (code === '23503') return { status: 409, message: 'السجل المرتبط غير موجود أو مستخدم في معاملات أخرى. حدّث البيانات ثم أعد المحاولة.' };
  if (code === '22003') return { status: 400, message: 'القيمة أو الإجمالي أكبر من الحد المسموح. تحقق من المبالغ والكميات.' };
  return { status: 500, message: 'تعذر إكمال العملية. حاول مرة أخرى.' };
}

export async function validateJsonBody(c, next) {
  if (['POST', 'PUT'].includes(c.req.method) && c.req.path !== '/api/logo') {
    let body;
    try { body = await c.req.json(); } catch {
      return c.json({ error: 'بيانات الطلب غير صالحة. أعد فتح النموذج وحاول مرة أخرى.' }, 400);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return c.json({ error: 'يجب إرسال بيانات النموذج ككائن صالح.' }, 400);
    }
  }
  await next();
}
