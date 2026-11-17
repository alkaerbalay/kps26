export const unknownCurrency='غير محددة (سجل سابق)';
export const formatAmount=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(n)||0);
export function entryCurrency(entry,documents){
 return entry.currency||documents.find(d=>d.id===entry.documentId)?.currency||unknownCurrency;
}
export function currentDocument(modal,documents){
 if(!modal?.doc)return modal;
 const doc=documents.find(d=>d.id===modal.doc.id);
 return doc?{...modal,doc}:null;
}
