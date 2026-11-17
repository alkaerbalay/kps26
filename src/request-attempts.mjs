// Transient retry metadata only. Business records and durable deduplication live in Postgres.
export function requestAttempts(uuid=()=>crypto.randomUUID()){
 const pending=new Map();
 return {
  key(signature){if(!pending.has(signature))pending.set(signature,uuid());return pending.get(signature)},
  complete(signature){pending.delete(signature)},
  clear(){pending.clear()}
 };
}

export function authenticatedRequester({prepare,request=fetch,uuid}={}){
 const attempts=requestAttempts(uuid);
 return {
  clear:()=>attempts.clear(),
  async fetch(url,options={}){
   await prepare?.();
   const guarded=options.method==='POST'&&(/^\/api\/(documents|stock|entries)(\/|$)/).test(url);
   const signature=JSON.stringify([url,options.method,options.body]);
   const headers=new Headers(options.headers);
   if(guarded)headers.set('Idempotency-Key',attempts.key(signature));
   const response=await request(url,{...options,headers,credentials:'same-origin',cache:'no-store'});
   // Only a complete success or a definite rejection ends this attempt.
   if(guarded){
    if(response.ok){try{await response.clone().json();attempts.complete(signature)}catch{}}
    else if([400,401,403,404,422].includes(response.status))attempts.complete(signature);
   }
   return response;
  }
 };
}
