import { chromium } from 'playwright-core';
const EXEC='/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const BASE='http://localhost:8410';
const b=await chromium.launch({executablePath:EXEC,args:['--no-sandbox']});
const errs=[]; const p=await (await b.newContext({viewport:{width:360,height:820}})).newPage();
p.on('pageerror',e=>errs.push('P:'+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('C:'+m.text());});
await p.goto(BASE+'/index.html',{waitUntil:'networkidle'});
await p.evaluate(()=>{
  const c={id:'t1',identity:{name:'Test Roller'},skills:{battle:6,communicate:4,discipline:4,move:4,understand:4},
    drives:{duty:8,faith:7,justice:6,power:5,truth:4},driveStatements:{duty:{text:'I serve.',challenged:false}},
    focuses:[{skill:'battle',name:'Dueling'}],determination:1};
  localStorage.setItem('imperium.characters',JSON.stringify([c]));
  localStorage.setItem('imperium.currentCharacterId','t1');
  localStorage.setItem('imperium.pools',JSON.stringify({momentum:3,threat:0}));
});
await p.goto(BASE+'/index.html#/sheet',{waitUntil:'networkidle'});await p.waitForTimeout(300);
const ov=()=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
console.log('Roll button present:', await p.getByRole('button',{name:/Roll a test/}).count());
console.log('sheet overflow:', await ov());
await p.getByRole('button',{name:/Roll a test/}).click();await p.waitForTimeout(200);
console.log('dialog title:', await p.locator('.modal h2').first().textContent());
console.log('TN pill:', await p.locator('.modal .pill').first().textContent());
// duty has statement → auto-1 checkbox enabled
const det=p.locator('#roll-auto1');
console.log('Determination checkbox disabled? (expect false, duty has statement):', await det.isDisabled());
// switch drive to truth (no statement) → det disabled
await p.locator('.modal select[aria-label=Drive]').selectOption('truth');await p.waitForTimeout(150);
console.log('after switching to truth (no statement), det disabled? (expect true):', await p.locator('#roll-auto1').isDisabled());
// switch back to duty, set difficulty 1, roll
await p.locator('.modal select[aria-label=Drive]').selectOption('duty');await p.waitForTimeout(150);
await p.getByRole('button',{name:/^Roll$/}).click();await p.waitForTimeout(250);
console.log('result shows dice:', await p.locator('.modal .die').count());
console.log('result summary pills:', (await p.locator('.modal p[aria-live] .pill').allTextContents()).join(' | '));
console.log('Apply button:', await p.getByRole('button',{name:'Apply result'}).count());
await p.getByRole('button',{name:'Apply result'}).click();await p.waitForTimeout(300);
// dialog closed, roll log updated on sheet
console.log('modal closed:', await p.locator('.modal').count()===0);
const logItems=await p.locator('.roll-log li').count();
console.log('roll-log entries (expect >=1):', logItems);
console.log('roll-log first entry:', (await p.locator('.roll-log li').first().textContent()||'').slice(0,80));
console.log('sheet overflow after:', await ov());
console.log('ERRORS:',errs.length);errs.forEach(e=>console.log('  ',e));
await b.close();
