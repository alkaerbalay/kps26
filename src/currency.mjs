export function entryCurrency(entry,data){
 if(entry.currency&&entry.currency!=='غير محددة')return entry.currency;
 const document=data.documents.find(d=>d.id===entry.documentId);
 return document?.currency||entry.currency||data.settings.currency;
}
export function currencyTotals(rows,amount,currency){
 const totals=new Map();
 for(const row of rows){const key=currency(row);totals.set(key,(totals.get(key)||0)+Number(amount(row)))}
 return [...totals].map(([key,value])=>`${value.toLocaleString('en-US',{maximumFractionDigits:2})} ${key}`).join(' / ')||'—';
}
