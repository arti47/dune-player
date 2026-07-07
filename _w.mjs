import { chromium } from 'playwright-core';
const EXEC='/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const BASE='http://localhost:8411';
const b=await chromium.launch({executablePath:EXEC,args:['--no-sandbox']});
const errs=[]; const p=await (await b.newContext({viewport:{width:360,height:900}})).newPage();
p.on('pageerror',e=>errs.push('P:'+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('C:'+m.text());});
const next=async()=>{await p.locator('.wizard-nav .btn').last().click();await p.waitForTimeout(150);};
const title=()=>p.locator('.wizard h2').textContent();
await p.goto(BASE+'/index.html#/home',{waitUntil:'networkidle'});await p.evaluate(()=>localStorage.clear());
await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(150);
await p.getByRole('button',{name:'+ New character'}).first().click();await p.waitForTimeout(150);
await next(); await p.locator('.option-grid .option-card').first().click();await p.waitForTimeout(150);
await next(); const plus=p.locator('.stepper button[aria-label^="Increase"]');
for(const i of [0,0,1,2,3]){await plus.nth(i).click();await p.waitForTimeout(15);}
await next(); const r=p.locator('.wizard-body .focus-row');
for(const i of [0,1]){await r.nth(i).locator('select').first().selectOption({index:1});await p.waitForTimeout(40);}
for(const i of [2,3]){await r.nth(i).locator('select').first().selectOption({index:1});await p.waitForTimeout(60);await r.nth(i).locator('select').nth(1).selectOption({index:1});await p.waitForTimeout(40);}
await next(); console.log('at:',await title());
// talents: check 3 (no faction → all archetype-related? pick archetype-suggested + 2 others)
const boxes=p.locator('.check-list input[type=checkbox]'); let added=0;
for(let i=0;i<await boxes.count() && added<3;i++){const bx=boxes.nth(i); if(!(await bx.isChecked())){await bx.check().catch(()=>{});added++;await p.waitForTimeout(40);}}
await next(); console.log('at:',await title());
// drives: assign remaining, statements
const dsel=p.locator('.wizard-body .stat-row select');
for(let i=0;i<await dsel.count();i++){ if(!(await dsel.nth(i).inputValue())){ if(await dsel.nth(i).locator('option').count()>1) await dsel.nth(i).selectOption({index:1}); await p.waitForTimeout(150);} }
const tas=p.locator('.stmt-area textarea'); for(let i=0;i<await tas.count();i++){ await tas.nth(i).fill('Statement '+i);}
await next(); console.log('at:',await title());
// Assets: read Crysknife row tags
await p.locator('input[type=search]').fill('Crysknife'); await p.waitForTimeout(150);
const cry=await p.locator('.check-item',{hasText:'Crysknife'}).first().innerText();
console.log('Crysknife row:', JSON.stringify(cry.replace(/\n+/g,' | ')));
await p.locator('input[type=search]').fill('Residual'); await p.waitForTimeout(150);
const res=await p.locator('.check-item',{hasText:'Residual'}).first().innerText().catch(()=>'(none)');
console.log('Residual Poison row:', JSON.stringify(res.replace(/\n+/g,' | ')));
console.log('ERRORS:',errs.length);errs.forEach(e=>console.log('  ',e));
await b.close();
