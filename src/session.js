import {getUser,refreshSession} from '@netlify/identity';
import {authenticatedRequester} from './request-attempts.mjs';

let preparing;
// Share refresh work between polling, focus events, and user actions.
async function prepareSession(){
 if(!preparing){
  preparing=(async()=>{await getUser();await refreshSession()})();
  preparing=preparing.finally(()=>{preparing=null});
 }
 await preparing;
}

const client=authenticatedRequester({prepare:prepareSession});
export const authenticatedFetch=(url,options)=>client.fetch(url,options);
export const clearRequestAttempts=()=>client.clear();
