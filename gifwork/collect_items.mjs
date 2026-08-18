import { chromium } from 'playwright';
import fs from 'fs';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ userAgent: 'Mozilla/5.0' });
await page.goto('https://yanhh3d.ee/bach-bao-cac', { waitUntil:'domcontentloaded', timeout:60000 });
await page.waitForTimeout(1500);
await page.evaluate(() => { const el=document.querySelector('.custom-open-login-modal'); if(el) el.click(); });
await page.waitForTimeout(700);
await page.evaluate(() => { const u=document.querySelector('#custom-username'); const p=document.querySelector('#custom-password'); if(u)u.value='lyanan1609'; if(p)p.value='lyanan1609'; });
await page.evaluate(() => { const form=document.querySelector('form.custom-login-form'); const btn=Array.from(form?.querySelectorAll('button')||[]).find(b=>/Đăng nhập/i.test(b.textContent||'')); if(btn)btn.click(); });
await page.waitForTimeout(3000);

async function fetchItems(action, paged, per=20){
  return await page.evaluate(async ({action,paged,per}) => {
    const res = await fetch('https://yanhh3d.ee/wp-admin/admin-ajax.php', { method:'POST', credentials:'include', headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'}, body:`action=${action}&paged=${paged}&per_page=${per}` });
    return await res.json();
  }, {action,paged,per});
}

const items = {};
for (const action of ['yan_get_shop_badges','yan_get_shop_badges_plus']){
  console.log('===', action, '===');
  for (let paged=1; paged<=100; paged++){
    try{
      const r = await fetchItems(action, paged, 20);
      const list = r?.data?.items || r?.data || [];
      if(!Array.isArray(list) || !list.length) break;
      list.forEach(it=>{ if(it.id && it.image) items[it.id]={title:it.title, image:it.image.replace(/\\/g,'')}; });
      if(paged<=3) console.log(`  p${paged}: +${list.length} total=${Object.keys(items).length}`);
      if(list.length<20) break;
    }catch(e){ console.log('  err',e.message); break; }
  }
}
const imgs=[...new Set(Object.values(items).map(i=>i.image))];
console.log('TOTAL ITEMS:', Object.keys(items).length, 'IMAGES:', imgs.length);
fs.writeFileSync('/home/user/ubuntu-d4m/gifwork/items.json', JSON.stringify(items, null, 2));
fs.writeFileSync('/home/user/ubuntu-d4m/gifwork/shop_images.txt', imgs.join('\n'));
await browser.close();
