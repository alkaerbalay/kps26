import React,{useState,useRef} from 'react';
import {Upload, Check} from 'lucide-react';
import {authenticatedFetch} from './auth-fetch.mjs';
export default function LogoUpload({isDemo,onSaved,notify}) {
 const uploading=useRef(false);
 const [file,setFile]=useState(null),[busy,setBusy]=useState(false);
 return <form className="logo-upload" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;if(uploading.current)return;if(isDemo){notify('سجّل الدخول بحساب المدير لحفظ الشعار');return}if(!file)return;if(file.size>524288){notify('الحد الأقصى لحجم الشعار ٥١٢ كيلوبايت');return}uploading.current=true;setBusy(true);try{const body=new FormData();body.set('logo',file);const r=await authenticatedFetch('/api/logo',{method:'POST',body});const result=await r.json();if(!r.ok)throw Error(result.error);const refreshed=await onSaved();setFile(null);form.reset();notify(refreshed?'تم حفظ شعار القسم ومزامنته مع الأجهزة':'تم حفظ الشعار. تعذر تحديث العرض؛ أعد المزامنة عند عودة الاتصال.')}catch(err){notify(err.message||'تعذر رفع الشعار')}finally{uploading.current=false;setBusy(false)}}}>
 <b><Upload size={16}/> رفع شعار من الجهاز</b><input aria-label="صورة شعار المؤسسة" type="file" accept="image/png,image/jpeg,image/webp" required onChange={e=>setFile(e.target.files[0]||null)}/><p>صورة PNG أو JPEG أو WebP بحجم لا يتجاوز ٥١٢ كيلوبايت. تُحفظ مركزياً وتظهر على المستندات والتقارير.</p><button className="btn small" disabled={busy||!file}><Check size={15}/>{busy?'جارٍ رفع الشعار…':'اعتماد الشعار'}</button></form>;
}
