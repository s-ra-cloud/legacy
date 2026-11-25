import { Storage } from "@google-cloud/storage";
import { ExternalAccountClient } from "google-auth-library";
import { sourceFor, KTImportError } from "./kt-browser-import.js";
import { KT_SNAPSHOT } from "@repo/shared/kt-import";

// Same private archive and sidecar identity as the existing archival script.
// No production database credentials, public bucket ACLs, or arbitrary paths.
export async function ktSourceDownload(name:string) {
  const source=sourceFor(name);
  const bucket=process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if(!bucket) throw new KTImportError("Private archive storage is not configured.",503);
  const authClient=ExternalAccountClient.fromJSON({
    type:"external_account",audience:"replit",
    subject_token_type:"urn:ietf:params:oauth:token-type:access_token",
    token_url:"http://127.0.0.1:1106/token",
    credential_source:{url:"http://127.0.0.1:1106/credential",format:{type:"json",subject_token_field_name:"access_token"}},
    universe_domain:"googleapis.com",
  });
  if(!authClient) throw new KTImportError("Private archive storage is unavailable.",503);
  const objectName=`private/knowledge-tree/${KT_SNAPSHOT}/${source.name}`;
  const file=new Storage({authClient,projectId:""}).bucket(bucket).file(objectName);
  const [exists]=await file.exists();
  if(!exists) throw new KTImportError("This original archive is not available in private storage.",503);
  const [metadata]=await file.getMetadata();
  if(Number(metadata.size)!==source.bytes) throw new KTImportError("Archive size differs from the pinned snapshot. Download refused.",409);
  const response=await fetch("http://127.0.0.1:1106/object-storage/signed-object-url",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({bucket_name:bucket,object_name:objectName,method:"GET",expires_at:new Date(Date.now()+300000).toISOString()}),
    signal:AbortSignal.timeout(15000),
  });
  if(!response.ok) throw new KTImportError("The private archive download could not be authorized.",503);
  const value=await response.json() as {signed_url?:string};
  if(!value.signed_url || !value.signed_url.startsWith("https://")) throw new KTImportError("Invalid archive download response.",503);
  return value.signed_url;
}
