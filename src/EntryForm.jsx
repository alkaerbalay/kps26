import React,{useState} from 'react';

export default function EntryForm({data,doc,busy,save}){
 const [documentId,setDocumentId]=useState(doc?String(doc.id):'');
 const [amount,setAmount]=useState(doc?String(Math.round((Number(doc.total)-Number(doc.paid))*100)/100):'');
 const invoice=data.documents.find(d=>String(d.id)===documentId);
 const currency=invoice?.currency||data.settings.currency;
 const remaining=invoice?Math.round((Number(invoice.total)-Number(invoice.paid))*100)/100:undefined;
 return <><h2>تسجيل حركة مالية</h2><p className="modal-subtitle">تُحفظ العملة مع السند. تحصيل الفاتورة يكون بعملتها الأصلية.</p>
 <form onSubmit={e=>{e.preventDefault();save({...Object.fromEntries(new FormData(e.currentTarget)),documentId,amount,currency})}}>
 <label className="field">نوع الحركة<select name="kind" key={documentId} defaultValue={invoice?'income':'expense'}><option value="income">سند قبض — تحصيل</option>{!invoice&&<option value="expense">سند صرف — مصروف</option>}</select></label>
 <label className="field">الفاتورة (عند تحصيل مستحق)<select value={documentId} onChange={e=>{setDocumentId(e.target.value);setAmount('')}}><option value="">حركة مستقلة</option>{data.documents.filter(d=>d.kind==='invoice'&&(Number(d.paid)<Number(d.total)||String(d.id)===documentId)).map(d=><option key={d.id} value={d.id}>{d.number} — {d.customerName} ({d.currency})</option>)}</select></label>
 <label className="field">الوصف<input name="description" required defaultValue={doc?`تحصيل ${doc.number}`:''}/></label>
 <label className="field">المبلغ ({currency})<input name="amount" type="number" required min="0.01" max={remaining} step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
 {invoice&&<p className="form-note">المتبقي: {remaining} {currency}</p>}
 <button className="btn primary" disabled={busy}>{busy?'جارٍ الحفظ…':'حفظ ومزامنة'}</button>
 </form></>;
}
