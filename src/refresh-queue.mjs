// A post-save read must start after any pre-save snapshot has finished.
export function createRefreshQueue(run){
 let pending;
 return async function refresh(silent=false,fresh=false){
  if(pending){
   if(!fresh)return pending;
   await pending;
   return refresh(silent,true);
  }
  const request=Promise.resolve().then(()=>run(silent));
  pending=request;
  try{return await request}finally{if(pending===request)pending=null}
 };
}
