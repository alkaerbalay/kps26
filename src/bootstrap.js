// Keep startup recovery independent of React and its dependency graph.
const message = document.getElementById('startup-message');
const retry = document.getElementById('startup-retry');
const slow = setTimeout(() => {
  if (message?.isConnected) {
    message.textContent = 'استغرق فتح التطبيق وقتاً أطول من المعتاد. تحقق من الاتصال ثم أعد المحاولة.';
    retry.hidden = false;
  }
}, 20000);
import('./main.jsx').then(() => clearTimeout(slow)).catch(() => {
  clearTimeout(slow);
  if (message?.isConnected) {
    message.textContent = 'تعذر تحميل ملفات التطبيق. تحقق من اتصال الإنترنت ثم أعد تحميل الصفحة للحصول على النسخة المحدثة.';
    retry.hidden = false;
  }
});
