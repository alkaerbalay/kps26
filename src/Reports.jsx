import React, {useState} from 'react';
import {Printer, Download, FileText, SlidersHorizontal} from 'lucide-react';
import {entryCurrency} from './currency.mjs';
import {availableReports, makeReport, reportTypes} from './report-data.mjs';
export default function Reports({data,isDemo,savedAt,exportCSV,onView}) {
 const types=availableReports(data.role);
 const [f,setF]=useState({type:types[0],from:'',to:'',customer:'',product:'',status:'',currency:data.settings.currency});
 const change=(key,value)=>setF(s=>({...s,[key]:value}));
 const type=types.includes(f.type)?f.type:types[0];
 const invalid=type!=='inventory'&&f.from&&f.to&&f.from>f.to;
 const report=makeReport(data,{...f,type});
 const currencies=[...new Set([data.settings.currency,...data.documents.map(d=>d.currency),...data.entries.map(e=>entryCurrency(e,data))])];
 const financial=['admin','finance'].includes(data.role);
 const exportReport=()=>exportCSV(report.sections.flatMap(s=>s.rows.map(row=>Object.fromEntries([['القسم',s.title],...Array.from({length:Math.max(...report.sections.map(x=>x.columns.length))},(_,i)=>[`حقل ${i+1}`,s.columns[i]?`${s.columns[i]}: ${row[i]??''}`:''])]))),'تقرير-الكفيل');
 return <div className="report-workspace">
 <section className="panel report-controls no-print"><div className="panel-title"><div><h3><SlidersHorizontal size={18}/> مركز التقارير</h3><p>اختر التقرير وحدد نطاقه، ثم اطبعه أو صدّره.</p></div><div className="heading-actions"><button className="btn" disabled={!!invalid} onClick={exportReport}><Download size={16}/>تصدير CSV</button><button className="btn primary" disabled={!!invalid} onClick={()=>window.print()}><Printer size={16}/>طباعة / PDF</button></div></div>
 <div className="report-filters">
 <label className="field">نوع التقرير<select value={type} onChange={e=>change('type',e.target.value)}>{types.map(t=><option value={t} key={t}>{reportTypes[t]}</option>)}</select></label>
 {type!=='inventory'&&<><label className="field">من تاريخ<input type="date" value={f.from} onChange={e=>change('from',e.target.value)}/></label><label className="field">إلى تاريخ<input type="date" min={f.from} value={f.to} onChange={e=>change('to',e.target.value)}/></label></>}
 {!['movements','audit','cash','inventory'].includes(type)&&<><label className="field">العميل<select value={f.customer} onChange={e=>change('customer',e.target.value)}><option value="">كل العملاء</option>{data.customers.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label className="field">حالة المستند<select value={f.status} onChange={e=>change('status',e.target.value)}><option value="">كل الحالات</option>{Object.entries({paid:'مدفوعة',partial:'جزئية',unpaid:'غير مدفوعة',active:'عرض نشط',converted:'عرض محوّل'}).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></>}
 {!['audit','cash'].includes(type)&&<label className="field">المادة<select value={f.product} onChange={e=>change('product',e.target.value)}><option value="">كل المواد</option>{data.products.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>}
 {!['audit','movements','inventory'].includes(type)&&<label className="field">عملة المستند<select value={f.currency} onChange={e=>change('currency',e.target.value)}>{currencies.map(c=><option key={c}>{c}</option>)}</select></label>}
 <button className="text-btn" onClick={()=>setF({type,from:'',to:'',customer:'',product:'',status:'',currency:data.settings.currency})}>مسح المرشحات</button></div>
 {invalid&&<p className="form-message" role="alert">تاريخ البداية يجب أن يسبق تاريخ النهاية.</p>}
 </section>
 {!invalid&&<article className="report-sheet panel">
 <header className="report-letterhead"><div className="report-brand">{data.settings.logo?<img src={data.settings.logo} alt="شعار المؤسسة"/>:<FileText size={38}/>}<div><small>العتبة العباسية المقدسة</small><h2>{data.settings.name}</h2><p>{data.settings.address} {data.settings.phone}</p></div></div><div className="report-stamp"><b>تقرير إداري</b><span>{new Date().toLocaleDateString('ar-IQ')}</span><small>{savedAt?`بيانات ${savedAt.toLocaleString('ar-IQ')}`:'معاينة توضيحية'}</small></div></header>
 <div className="report-title"><span>قسم الكفيل لحلول الطاقة / التقارير التشغيلية</span><h2>{reportTypes[type]}</h2><p>{type==='inventory'?'الأرصدة الحالية حتى آخر مزامنة':`الفترة: ${f.from||'من بداية السجل'} — ${f.to||'حتى الآن'}`}</p><p>{!['audit','movements'].includes(type)&&`العملة: ${type==='inventory'?data.settings.currency:f.currency} · `}{!['movements','audit','cash','inventory'].includes(type)&&f.customer&&`العميل: ${data.customers.find(c=>String(c.id)===f.customer)?.name} · `}{!['audit','cash'].includes(type)&&f.product&&`المادة: ${data.products.find(p=>String(p.id)===f.product)?.name}`}{!['movements','audit','cash','inventory'].includes(type)&&f.status&&` · الحالة: ${{paid:'مدفوعة',partial:'جزئية',unpaid:'غير مدفوعة',active:'نشط',converted:'محوّل'}[f.status]}`}</p></div>
 {isDemo&&<p className="demo-print">بيانات توضيحية — غير صالح للاعتماد المالي</p>}
 {report.sections.map((section,index)=><section className="report-section" key={index}><h3><span>{String(index+1).padStart(2,'0')}</span>{section.title}</h3><div className="table-scroll"><table><thead><tr>{section.columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{section.rows.map((row,i)=><tr key={i}>{row.map((value,j)=><td key={j}>{j===0&&['sales','quotes','customers'].includes(type)&&index===0?<button className="report-doc-link" onClick={()=>{const d=data.documents.find(d=>d.number===value);if(d)onView(d)}}>{value}</button>:value}</td>)}</tr>)}</tbody></table>{!section.rows.length&&<p className="empty">لا توجد سجلات تطابق المرشحات المحددة.</p>}</div></section>)}
 <div className="report-notes"><p>المبالغ المحصلة والمتبقية تمثل حالة الفواتير عند آخر مزامنة. عمر المستحق يبدأ من تاريخ الإصدار، ولا يمثل تاريخ استحقاق تعاقدي.</p>{financial&&['summary','cash'].includes(type)&&<p>سندات القبض والصرف تخص العملة المختارة ({f.currency}) والفترة فقط؛ لا تخضع لمرشح العميل أو المادة أو حالة الفاتورة. السندات القديمة المستقلة ذات العملة غير الموثقة تظهر تحت «غير محددة». مجمل الربح يختلف عن التدفق النقدي، وهذا التقرير ليس ميزانية محاسبية بقيد مزدوج.</p>}</div>
 <footer className="report-signatures"><span>إعداد / {data.email||'عرض توضيحي'}</span><span>تدقيق الحسابات</span><span>اعتماد مسؤول القسم</span></footer>
 </article>}
 </div>;
}
