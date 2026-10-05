import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const files={'/':'index.html','/index.html':'index.html','/script.js':'script.js','/style.css':'style.css'};
test('task workflow, reload persistence, safe rendering and mobile', async()=>{
 const server=createServer(async(req,res)=>{const file=files[req.url];if(!file){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(new URL('../'+file,import.meta.url)));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined});
 const page=await browser.newPage({viewport:{width:1360,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url='http://127.0.0.1:'+server.address().port;
 try{
 await page.goto(url);const input=page.getByLabel('O que você precisa fazer?');
 async function add(text){await input.fill(text);await input.press('Enter');}
 await add('Revisar proposta comercial');await add('Publicar apresentação do DeskFlow');
 await page.reload();await page.getByText('Revisar proposta comercial',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Editar: Revisar proposta comercial',exact:true}).click();await input.fill('Revisar proposta e prazo');await input.press('Enter');
 await page.getByRole('checkbox',{name:'Concluir: Revisar proposta e prazo',exact:true}).check();
 await page.getByRole('button',{name:'Pendentes',exact:true}).click();assert.equal(await page.locator('li').count(),1);
 await page.getByRole('button',{name:'Concluídas',exact:true}).click();assert.equal(await page.locator('li').count(),1);
 await page.getByRole('button',{name:'Todas',exact:true}).click();
 await page.getByRole('button',{name:'Excluir: Publicar apresentação do DeskFlow',exact:true}).click();assert.equal(await page.locator('li').count(),1);
 await page.getByRole('button',{name:'Desfazer última exclusão'}).click();assert.equal(await page.locator('li').count(),2);
 const attack='<img src=x onerror="window.injected=true">';await add(attack);assert.equal(await page.locator('#taskList img').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);
 await page.reload();assert.equal(await page.locator('#taskList img').count(),0);await page.getByRole('button',{name:'Excluir: '+attack,exact:true}).click();
 await add('Organizar as entregas da semana');
 await page.screenshot({path:'docs/media/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'docs/media/mobile.png',fullPage:true});
 // A failed write must not falsely report success or discard the current list.
 await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('quota')};});await add('Não deve ser salva');assert.equal(await page.locator('li').count(),3);await page.getByRole('alert').filter({hasText:'Não foi possível salvar'}).waitFor();
 await page.reload();assert.equal(await page.locator('li').count(),3);
 await page.evaluate(()=>localStorage.setItem('marcos-tasks-v1','invalid'));await page.reload();await page.getByRole('alert').filter({hasText:'Não foi possível ler'}).waitFor();await add('Não substituir');assert.equal(await page.evaluate(()=>localStorage.getItem('marcos-tasks-v1')),'invalid');
 assert.deepEqual(errors,[]);
 }finally{await browser.close();server.close();}
});
