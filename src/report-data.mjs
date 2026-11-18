import {entryCurrency} from './currency.mjs';
export const reportTypes = {
 summary: 'التقرير الشامل', sales: 'تفاصيل المبيعات', quotes: 'عروض الأسعار', items: 'مبيعات المواد', customers: 'كشف حساب عميل', aging: 'أعمار المستحقات', inventory: 'جرد المخزن الحالي', movements: 'حركات مادة', cash: 'القبض والصرف', audit: 'سجل الإجراءات'
};
export function availableReports(role) {
 return role === 'admin' ? Object.keys(reportTypes) : role === 'warehouse' ? ['inventory','movements'] : role === 'sales' ? ['sales','quotes','items','customers','aging'] : ['summary','sales','quotes','items','customers','aging','inventory','cash'];
}
const number = v => Number(v) || 0;
const sum = (rows, fn) => rows.reduce((s, r) => s + fn(r), 0);
export function makeReport(data, f, now = new Date()) {
 const end=f.to?new Date(`${f.to}T00:00:00`):null;if(end)end.setDate(end.getDate()+1);
 const inDate = row => { const d = new Date(row.createdAt); return (!f.from || d >= new Date(`${f.from}T00:00:00`)) && (!end || d < end); };
 const docs = data.documents.filter(d => d.currency === f.currency && inDate(d) && (!f.customer || String(d.customerId) === f.customer) && (!f.status || d.status === f.status) && (!f.product || d.items.some(i => String(i.productId) === f.product)));
 const invoices = docs.filter(d => d.kind === 'invoice');
 const financial = ['admin','finance'].includes(data.role);
 const entries = data.entries.filter(e=>inDate(e)&&entryCurrency(e,data)===f.currency);
 const products = data.products.filter(p => !f.product || String(p.id) === f.product);
 const amount = n => number(n).toLocaleString('en-US', {maximumFractionDigits:2});
 const date = d => new Date(d).toLocaleDateString('ar-IQ');
 const statuses = {paid:'مدفوعة',partial:'جزئية',unpaid:'غير مدفوعة',active:'نشط',converted:'محوّل'};
 const invoiceRows = rows => rows.map(d => [d.number,date(d.createdAt),d.customerName,amount(d.total),amount(d.paid),amount(number(d.total)-number(d.paid)),statuses[d.status] || d.status]);
 const sections = [];
 const add = (title,columns,rows) => sections.push({title,columns,rows});
 const sales = sum(invoices,d=>number(d.total)), due = sum(invoices,d=>number(d.total)-number(d.paid));
 const profit = sum(invoices,d=>sum(d.items,i=>(number(i.price)-number(i.cost))*number(i.quantity)));
 if (f.type === 'summary') {
  add('مؤشرات الفترة والعملة المختارة',['المؤشر','القيمة'],[['إجمالي الفواتير',invoices.length],['قيمة المبيعات',amount(sales)],['المحصل الحالي لفواتير الفترة',amount(sum(invoices,d=>number(d.paid)))],['الرصيد المتبقي الآن لفواتير الفترة',amount(due)],...(financial ? [['مجمل الربح قبل المصروفات',amount(profit)]] : [])]);
 }
 if (['summary','sales','quotes','customers'].includes(f.type)) {
  const rows = f.type === 'quotes' ? docs.filter(d=>d.kind==='quote') : invoices;
  add(f.type==='quotes'?'سجل عروض الأسعار':'سجل الفواتير — المدفوع والمتبقي حتى آخر مزامنة',['المستند','التاريخ','العميل','الإجمالي','المحصل','المتبقي','الحالة'],invoiceRows(rows));
  if(f.type==='customers' && financial) {
   const accountDocs=data.documents.filter(d=>d.kind==='invoice'&&d.currency===f.currency&&(!f.customer||String(d.customerId)===f.customer)&&(!f.product||d.items.some(i=>String(i.productId)===f.product))&&(!f.status||d.status===f.status));
   const ids=new Set(accountDocs.map(d=>d.id));
   const ledger=[...accountDocs.map(d=>({createdAt:d.createdAt,reference:d.number,customer:d.customerName,description:'فاتورة مبيعات',debit:number(d.total),credit:0})),...data.entries.filter(e=>e.kind==='income'&&ids.has(e.documentId)).map(e=>{const d=accountDocs.find(d=>d.id===e.documentId);return {createdAt:e.createdAt,reference:d.number,customer:d.customerName,description:e.description,debit:0,credit:number(e.amount)}})].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)||b.debit-a.debit);
   let balance=f.from?sum(ledger.filter(r=>new Date(r.createdAt)<new Date(`${f.from}T00:00:00`)),r=>r.debit-r.credit):0;
   const opening=balance;
   const rows=ledger.filter(inDate).map(r=>{balance+=r.debit-r.credit;return [date(r.createdAt),r.reference,r.customer,r.description,amount(r.debit),amount(r.credit),amount(balance)]});
   add('كشف حركة الحساب — فواتير ومدفوعات بحسب تاريخ الحركة',['التاريخ','المرجع','العميل','البيان','مدين','دائن','الرصيد'],[['—','—','—','رصيد افتتاح الفترة','—','—',amount(opening)],...rows,['—','—','—','رصيد نهاية الفترة','—','—',amount(balance)]]);
  }
 }
 if(['summary','items'].includes(f.type)) {
  // Group by captured name and price to preserve historical document snapshots.
  const grouped = new Map();
  for(const d of invoices) for(const i of d.items) {
   if(f.product && String(i.productId)!==f.product)continue;
   const key=JSON.stringify([i.productId,i.name,i.unit,i.price,i.cost]);
   const r=grouped.get(key)||{...i,quantity:0};r.quantity+=number(i.quantity);grouped.set(key,r);
  }
  add('المواد المباعة حسب بيانات الفواتير المحفوظة',['المادة','الوحدة','الكمية','سعر الوحدة','قيمة المبيعات',...(financial?['مجمل الربح']:[])],[...grouped.values()].map(i=>[i.name,i.unit,i.quantity,amount(i.price),amount(i.quantity*number(i.price)),...(financial?[amount(i.quantity*(number(i.price)-number(i.cost)))]:[])]));
 }
 if(['summary','aging'].includes(f.type)) {
  add('المستحقات الحالية حسب عمر الفاتورة (الأيام)',['المستند','العميل','العمر','٠–٣٠','٣١–٦٠','٦١–٩٠','أكثر من ٩٠'],invoices.filter(d=>number(d.total)>number(d.paid)).map(d=>{const age=Math.max(0,Math.floor((now-new Date(d.createdAt))/86400000)),balance=number(d.total)-number(d.paid);return [d.number,d.customerName,age,...[age<=30,age>30&&age<=60,age>60&&age<=90,age>90].map(b=>b?amount(balance):'—')]}));
 }
 if(f.type==='inventory') add('الرصيد الحالي — لا يمثل جرداً تاريخياً',['الرمز','المادة','الفئة','الرصيد','الوحدة','حد الطلب','سعر البيع',...(financial?['قيمة الكلفة']:[])],products.map(p=>[p.sku,p.name,p.category,p.stock,p.unit,p.minimum,amount(p.price),...(financial?[amount(p.stock*number(p.cost))]:[])]));
 if(f.type==='movements') add('حركات المخزن خلال الفترة',['التاريخ','المادة','الوارد','الصادر','السبب','المنفذ'],data.movements.filter(m=>inDate(m)&&(!f.product||String(m.productId)===f.product)).map(m=>[date(m.createdAt),data.products.find(p=>p.id===m.productId)?.name||m.productId,m.quantity>0?m.quantity:'—',m.quantity<0?-m.quantity:'—',m.reason,m.createdBy||'—']));
 if(['summary','cash'].includes(f.type)&&financial) {
  add('التدفق النقدي التشغيلي خلال الفترة',['المؤشر','القيمة'],[['المقبوضات',amount(sum(entries.filter(e=>e.kind==='income'),e=>number(e.amount)))],['المصروفات',amount(sum(entries.filter(e=>e.kind==='expense'),e=>number(e.amount)))],['صافي التدفق النقدي',amount(sum(entries,e=>(e.kind==='income'?1:-1)*number(e.amount)))]]);
  if(f.type==='cash')add('تفاصيل السندات',['التاريخ','النوع','الوصف','المبلغ','المرجع'],entries.map(e=>[date(e.createdAt),e.kind==='income'?'قبض':'صرف',e.description,amount(e.amount),data.documents.find(d=>d.id===e.documentId)?.number||'مستقل']));
 }
 if(f.type==='audit')add('سجل الإجراءات خلال الفترة',['التاريخ','المنفذ','الإجراء'],data.audit.filter(inDate).map(a=>[new Date(a.createdAt).toLocaleString('ar-IQ'),a.actor,a.action]));
 return {sections,sales,due,profit,count:invoices.length};
}
