import { chromium } from 'playwright';
import fs from 'fs';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ userAgent: 'Mozilla/5.0', viewport:{width:1280,height:2000} });
await page.goto('https://yanhh3d.ee/khung-avatar', { waitUntil:'domcontentloaded', timeout:60000 });
await page.waitForTimeout(1800);
await page.evaluate(() => { const el=document.querySelector('.custom-open-login-modal'); if(el) el.click(); });
await page.waitForTimeout(700);
await page.evaluate(() => { const u=document.querySelector('#custom-username'); const p=document.querySelector('#custom-password'); if(u)u.value='lyanan1609'; if(p)p.value='lyanan1609'; });
await page.evaluate(() => { const form=document.querySelector('form.custom-login-form'); const btn=Array.from(form?.querySelectorAll('button')||[]).find(b=>/Đăng nhập/i.test(b.textContent||'')); if(btn)btn.click(); });
await page.waitForTimeout(3500);
// scroll to load lazy images
await page.evaluate(async () => { const h=document.body.scrollHeight; for(let y=0;y<h;y+=600){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,80)); } });
await page.waitForTimeout(1500);
const urls = await page.evaluate(() => {
  const set=new Set();
  Array.from(document.querySelectorAll('img')).forEach(i=>{ const u=i.src||i.getAttribute('data-src')||''; if(/khung-/.test(u)) set.add(u); });
  return Array.from(set);
});
console.log('khung urls:', urls.length);
fs.writeFileSync('/home/user/ubuntu-d4m/gifwork/khung_urls.txt', urls.join('\n'));
await browser.close();
