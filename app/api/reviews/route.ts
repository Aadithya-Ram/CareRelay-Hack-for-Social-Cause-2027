import { db,requireAccount,publicAccount,Account } from '@/lib/accounts';
import { DomainError } from '@/lib/commands';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{await requireAccount(req,true);const r=await db().prepare("SELECT * FROM accounts WHERE role IN ('facility','transport') AND status IN ('pending','rejected') ORDER BY created DESC").all<Account>();return Response.json({applications:r.results.map(publicAccount)},{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:'Care-team access required.'},{status:e instanceof DomainError?e.status:500});}}
