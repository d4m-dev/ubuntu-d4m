import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileP = promisify(execFile);

// Tải khung vào avatar_frames/yanhh3d
const FRAME_DIR='/home/user/ubuntu-d4m/frontend/public/avatar_frames/yanhh3d';
fs.mkdirSync(FRAME_DIR,{recursive:true});
// Tải linh thú vào tu-luyen
const ASSET_DIR='/home/user/ubuntu-d4m/frontend/public/tu-luyen';
fs.mkdirSync(ASSET_DIR,{recursive:true});

async function dl(url, dir){
  const name=url.split('/').pop();
  try{ await execFileP('curl',['-s','-A','Mozilla/5.0','-o',`${dir}/${name}`,url],{timeout:40000}); return true; }
  catch(e){ return false; }
}
async function run(list, dir, label){
  const CONC=12; let ok=0;
  for(let i=0;i<list.length;i+=CONC){
    const batch=list.slice(i,i+CONC);
    const rs=await Promise.all(batch.map(u=>dl(u,dir)));
    ok+=rs.filter(Boolean).length;
    if(i%120===0) console.log(`  ${label} ${i+CONC}/${list.length} ok=${ok}`);
  }
  return ok;
}

// 1. Khung
const frames=fs.readFileSync('/home/user/ubuntu-d4m/gifwork/khung_urls.txt','utf8').split('\n').filter(Boolean);
const fex=new Set(fs.readdirSync(FRAME_DIR));
const fmiss=frames.filter(u=>!fex.has(u.split('/').pop()));
console.log('frames: total',frames.length,'missing',fmiss.length);
const fok=await run(fmiss, FRAME_DIR, 'frames');
console.log('frames done, total:', fs.readdirSync(FRAME_DIR).length);

// 2. Linh thú
const assets=fs.readFileSync('/home/user/ubuntu-d4m/gifwork/shop_images.txt','utf8').split('\n').filter(Boolean);
const aex=new Set(fs.readdirSync(ASSET_DIR));
const amiss=assets.filter(u=>!aex.has(u.split('/').pop()));
console.log('assets: total',assets.length,'missing',amiss.length);
const aok=await run(amiss, ASSET_DIR, 'assets');
console.log('assets done, total:', fs.readdirSync(ASSET_DIR).length);
