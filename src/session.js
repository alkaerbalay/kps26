import {getUser,refreshSession} from '@netlify/identity';

let preparing;
// Share refresh work between polling, focus events, and user actions.
async function prepareSession(){
 if(!preparing){
  preparing=(async()=>{await getUser();await refreshSession()})();
  preparing=preparing.finally(()=>{preparing=null});
 }
 await preparing;
}

export async function authenticatedFetch(url,options={}){
 await prepareSession();
 return fetch(url,{...options,credentials:'same-origin',cache:'no-store'});
}
