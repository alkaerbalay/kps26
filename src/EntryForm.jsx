import React,{useState} from 'react';
import {LoaderCircle,Check} from 'lucide-react';
export default function EntryForm({documents,doc,currency,busy,save}){
 const [kind,setKind]=useState(doc?'income':'expense');
 const [documentId,setDocumentId]=useState(String(doc?.id||''));
 const selected=kind==='income'?documents.find(d=>String(d.id)===documentId):null;
 const remaining=selected?(Math.round(Number(selected.total)*100)-Math.round(Number(selected.paid)*100))/100:undefined;
 return <form onSubmit={e=>{e.preventDefault();save({...Object.fromEntries(new FormData(e.currentTarget)),documentId:selected?documentId:''})}}>
  <label className="field">نوع الحركة<select name="kind" value={kind} onChange={e=>{setKind(e.target.value);setDocumentId('')}}><option value="expense">سند صرف — مصروف</option><option value="income">سند قبض — تحصيل</option></select></label>
  {kind==='income'&&<label className="field">الفاتورة (عند تحصيل مستحق)<select name="documentId" value={documentId} onChange={e=>setDocumentId(e.target.value)}><option value="">حركة مستقلة</option>{documents.filter(d=>Number(d.paid)<Number(d.total)).map(d=><option key={d.id} value={d.id}>{d.number} — {d.customerName} ({d.currency})</option>)}</select></label>}
  <label className="field">الوصف<input key={`description-${documentId}`} name="description" defaultValue={selected?`تحصيل ${selected.number}`:''} required/></label>
  <label className="field">المبلغ ({selected?.currency||currency})<input key={`amount-${documentId}`} name="amount" type="number" step="0.01" min="0.01" max={remaining} defaultValue={remaining??''} required/></label>
  <p className="form-note">{selected?`يُسجّل التحصيل بعملة الفاتورة (${selected.currency}) ولا يتجاوز رصيدها المتبقي.`:`تُحفظ الحركة المستقلة بعملة المؤسسة الحالية (${currency}).`}</p>
  <div className="form-submit"><button className="btn primary" disabled={busy}>{busy?<LoaderCircle size={17}/>:<Check size={17}/>} {busy?'جارٍ الحفظ…':'حفظ ومزامنة'}</button></div>
 </form>;
}
