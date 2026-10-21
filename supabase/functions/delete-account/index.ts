// Deploy server-side only. Never expose the service-role key in a VITE_ variable.
import { createClient } from 'npm:@supabase/supabase-js@2';
Deno.serve(async (request: Request) => {
  const origin=request.headers.get('origin')??'';
  const allowed=(Deno.env.get('ALLOWED_ORIGINS')??'').split(',').map((s)=>s.trim()).filter(Boolean);
  if(origin&&!allowed.includes(origin))return new Response('Origin not allowed',{status:403});
  const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
  const reply=(status:number,error:string)=>new Response(JSON.stringify({error}),{status,headers});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply(405,'Method not allowed');
  const authorization=request.headers.get('authorization');
  if(!authorization?.startsWith('Bearer '))return reply(401,'Authentication required');
  const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!anon||!service)return reply(503,'Service unavailable');
  try {
    const client=createClient(url,anon,{auth:{persistSession:false},global:{headers:{Authorization:authorization}}});
    // Verify with Auth; do not trust an unverified JWT payload or a user ID supplied by the client.
    const {data,error}=await client.auth.getUser();if(error||!data.user)return reply(401,'Authentication required');
    if((await request.json()).confirmation!=='DELETE')return reply(400,'Confirmation required');
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const result=await admin.auth.admin.deleteUser(data.user.id);if(result.error)return reply(500,'Deletion failed');
    return new Response(JSON.stringify({deleted:true}),{headers});
  }catch{return reply(400,'Invalid request');}
});
