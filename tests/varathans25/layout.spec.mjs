import {test as base,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {appendFileSync} from 'node:fs';
const test=base.extend({page:async({page},use,info)=>{
 const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('request',r=>{if(!['GET','HEAD'].includes(r.method())||/supabase|stripe|paypal|\/api\/|\/adminpage\//.test(r.url()))writes.push(r.url())});
 await use(page);appendFileSync(new URL('./diagnostics.jsonl',import.meta.url),JSON.stringify({name:info.title,device:info.project.name,errors,writes})+'\n');expect(errors).toEqual([]);expect(writes).toEqual([]);
}});
const announcements={en:'Free delivery across Switzerland from CHF 100',de:'Kostenlose Lieferung in der Schweiz ab CHF 100',fr:'Livraison gratuite en Suisse dès CHF 100'};
const unlocked={en:'You’ve unlocked free delivery.',de:'Ihre Lieferung ist kostenlos.',fr:'Vous bénéficiez de la livraison gratuite.'};
async function accessibility(page){expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}
async function logo(page){const positions=await page.locator('.site-header').evaluate(h=>{const r=h.getBoundingClientRect(),i=h.querySelector('img').getBoundingClientRect();return {top:i.top-r.top,bottom:r.bottom-i.bottom,left:i.left,right:i.right,width:innerWidth}});expect(positions.top).toBeGreaterThanOrEqual(13);expect(positions.bottom).toBeGreaterThanOrEqual(13);expect(positions.left).toBeGreaterThanOrEqual(20);expect(positions.right).toBeLessThan(positions.width-20)}
for(const locale of ['de','fr','en']){
 test(`${locale}: header, product layout, language navigation and keyboard at every viewport`,async({page},info)=>{
  await page.goto(`/varathans25/${locale}/product/gelber-curry-kokos/`);await expect(page.locator('#main .v25-product-delivery:visible')).toBeVisible();await expect(page.locator('.v25-delivery-announcement')).toContainText(announcements[locale]);
  await logo(page);await accessibility(page);await page.screenshot({path:new URL(`./screenshots/${info.project.name}-${locale}-product.png`,import.meta.url).pathname});
  await page.evaluate(()=>scrollTo(0,500));await expect(page.locator('.site-header')).toHaveClass(/is-scrolled/);await logo(page);
  await page.locator('.bag-toggle').focus();await page.keyboard.press('Enter');await expect(page.locator('dialog[open] .v25-delivery-estimate')).toBeVisible();
  await page.locator('#v25-delivery-country').focus();await page.keyboard.press({en:'o',de:'a',fr:'h'}[locale]);await page.keyboard.press('Tab');await expect(page.locator('[data-delivery-status="INTERNATIONAL_UNAVAILABLE"]')).toBeVisible();
  await page.reload();await page.locator('.bag-toggle').click();await expect(page.locator('#v25-delivery-country')).toHaveValue('INTERNATIONAL');
  await page.locator('#v25-delivery-country').selectOption('CH');await expect(page.locator('[data-delivery-status="STANDARD_RATE_APPLIES"]')).toContainText('100.00');await accessibility(page);
  await page.screenshot({path:new URL(`./screenshots/${info.project.name}-${locale}-bag.png`,import.meta.url).pathname});await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);await page.locator('.logo-link').click();await expect(page.locator('.v25-delivery-announcement')).toContainText(announcements[locale]);
  const next={de:'fr',fr:'en',en:'de'}[locale];
  if(page.viewportSize().width<600){await page.locator('.mobile-menu').click();await page.locator('.mobile-nav-drawer select').selectOption(next);await expect(page.locator('.mobile-nav-drawer')).not.toBeVisible()}else await page.locator('.site-header select').selectOption(next);
  await expect(page.locator('.v25-delivery-announcement')).toContainText(announcements[next]);await expect(page.locator('.v25-delivery-announcement')).toHaveCount(1);await accessibility(page);
 });
 test(`${locale}: existing tea review bag updates delivery when quantity changes`,async({page})=>{
  await page.goto(`/varathans25/${locale}/product/premium-black-tea-powder/`);
  await page.locator('#main .product-purchase input:visible').fill('8001');await page.locator('#main .product-purchase button[type="submit"]:visible').click();
  const quantity=page.locator('.purchase-row .quantity');
  for(let i=1;i<6;i++)await quantity.locator('button').last().click();
  await page.locator('.purchase-row .add-button').click();
  await expect(page.locator('dialog[open] .cart-line')).toHaveCount(1);
  await expect(page.locator('dialog[open] [data-v25-subtotal]')).toHaveAttribute('data-v25-subtotal','10140');
  await expect(page.locator('dialog[open] [data-delivery-status]')).toHaveAttribute('data-delivery-status','FREE');
  await expect(page.locator('.cart-bottom .button.full')).toBeDisabled();await accessibility(page);
  await page.locator('dialog[open] .cart-line .quantity button').first().click();
  await expect(page.locator('dialog[open] [data-v25-subtotal]')).toHaveAttribute('data-v25-subtotal','8450');
  await expect(page.locator('dialog[open] [data-delivery-status]')).toContainText('15.50');
  await page.reload();await page.locator('.bag-toggle').click();await expect(page.locator('[data-v25-subtotal]')).toHaveAttribute('data-v25-subtotal','8450');
  await page.locator('.cart-line .text-button').click();await expect(page.locator('[data-delivery-status]')).toContainText('100.00');
 });
 test(`${locale}: delivery rendering fixture responds to discounted subtotal and country`,async({page},info)=>{
  await page.goto(`/varathans25/${locale}/product/masala-tea-powder/`);await expect(page.locator('#main .v25-product-delivery:visible')).toBeVisible();await page.locator('.bag-toggle').click();
  // Controlled DOM contract fixture: no prices or cart items are added to the public catalogue.
  await page.locator('dialog[open]').evaluate(d=>{const row=document.createElement('div');row.dataset.v25Subtotal='9999';row.dataset.v25StandardOnly='true';row.textContent='LOCAL DELIVERY TEST — NO PRODUCT PRICES';d.append(row)});
  for(const [subtotal,free,amount] of [[9999,false,'0.01'],[10000,true,''],[10001,true,''],[9500,false,'5.00'],[10500,true,''],[6500,false,'35.00']]){
   await page.locator('[data-v25-subtotal]').evaluate((r,value)=>r.dataset.v25Subtotal=String(value),subtotal);
   const status=page.locator('[data-delivery-status]');await expect(status).toHaveAttribute('data-delivery-status',free?'FREE':'STANDARD_RATE_APPLIES');await expect(status).toContainText(free?unlocked[locale]:amount);
   if(subtotal===10000){await accessibility(page);await page.screenshot({path:new URL(`./screenshots/${info.project.name}-${locale}-delivery-TEST-DATA.png`,import.meta.url).pathname})}
  }
  await page.locator('[data-v25-subtotal]').evaluate(r=>r.dataset.v25Subtotal='15000');await page.locator('#v25-delivery-country').selectOption('INTERNATIONAL');await expect(page.locator('[data-delivery-status]')).toHaveAttribute('data-delivery-status','INTERNATIONAL_UNAVAILABLE');
  await page.locator('[data-v25-subtotal]').evaluate(r=>r.dataset.v25StandardOnly='false');await expect(page.locator('.v25-delivery-estimate')).toBeHidden();
 });
}
