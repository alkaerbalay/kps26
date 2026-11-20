// Business requests no longer depend on an Identity session. Never replay writes.
export async function apiFetch(url, options = {}) {
  const timeout = AbortSignal.timeout(15000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  try {
    return await globalThis.fetch(url, { ...options, signal, credentials: 'same-origin', cache: 'no-store' });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    const message = timeout.aborted || error.name === 'TimeoutError'
      ? 'انتهت مهلة الاتصال. تحقق من حالة العملية قبل إعادة الحفظ؛ ربما وصلت إلى الخادم.'
      : 'تعذر الاتصال بالخادم. تحقق من الاتصال وحالة العملية قبل إعادة الحفظ.';
    throw new Error(message, { cause: error });
  }
}
