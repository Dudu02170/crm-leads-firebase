import { scenario, assert, By, until } from './support.js';
async function login(p){
 await p.open();await p.fill('#login-email','qa@example.test');await p.fill('#login-pass','SenhaQA123!');
 await p.click('#auth-login button');await p.waitText('#user-chip','Pessoa QA');await p.waitText('#tbody','Ana QA');
}
scenario('credencial invalida apresenta erro',async p=>{
 await p.open();await p.fill('#login-email','errado@example.test');await p.fill('#login-pass','Invalida');
 await p.click('#auth-login button');await p.waitText('#auth-err','E-mail ou senha incorretos.');
});
scenario('busca filtra leads e apresenta estado vazio',async p=>{
 await login(p);await p.fill('#search','Bruno');
 assert.match(await p.text('#tbody'),/Bruno QA/);assert.doesNotMatch(await p.text('#tbody'),/Ana QA/);
 await p.fill('#search','inexistente-qa');await p.waitText('#tbody','Nenhum lead encontrado.');
});
scenario('status filtra leads fechados',async p=>{
 await login(p);await p.select('#filter-status','Fechado');
 assert.match(await p.text('#tbody'),/Bruno QA/);assert.doesNotMatch(await p.text('#tbody'),/Ana QA/);
});
scenario('novo lead aparece na tabela e na persistencia simulada',async p=>{
 await login(p);await p.click('button[onclick="openModal()"]');
 await p.fill('#f-nome','Carla QA');await p.fill('#f-ig','@carla.qa');
 await p.click('button[onclick="saveLead()"]');await p.waitText('#tbody','Carla QA');
 const leads=await p.driver.executeScript('return Object.values(window.__qaDb.leads)');
 assert.equal(leads.filter(l=>l.nome==='Carla QA').length,1);
});
scenario('instagram duplicado ignora maiusculas e arroba',async p=>{
 await login(p);await p.click('button[onclick="openModal()"]');
 await p.fill('#f-nome','Duplicada QA');await p.fill('#f-ig','ANA.QA');
 await p.click('button[onclick="saveLead()"]');await p.alert(/já cadastrado/);
 assert.equal(await p.driver.executeScript('return Object.keys(window.__qaDb.leads).length'),2);
 assert.equal(await p.driver.executeScript("return window.__qaWrites.filter(x=>x.path.startsWith('leads/')).length"),0);
});
scenario('editar status move lead para coluna correta do funil',async p=>{
 await login(p);await p.click('button[onclick="openModal(\'qa1\')"]');
 await p.select('#f-status','Fechado');await p.click('button[onclick="saveLead()"]');
 await p.click('button[onclick="switchTab(\'kanban\')"]');
 const columns=await p.driver.findElements(By.css('.kol'));
 let found=false;
 for(const col of columns){const text=await col.getText();if(text.toLocaleLowerCase('pt-BR').startsWith('fechado')){assert.match(text,/Ana QA/);found=true;}}
 assert.ok(found,'coluna Fechado existente');
});
scenario('cancelar exclusao preserva lead e confirmar remove',async p=>{
 await login(p);await p.click('button[onclick="deleteLead(\'qa1\')"]');
 await (await p.driver.wait(until.alertIsPresent(),10000)).dismiss();
 assert.equal(await p.driver.executeScript('return Object.keys(window.__qaDb.leads).length'),2);
 await p.click('button[onclick="deleteLead(\'qa1\')"]');await p.alert(/Remover/);
 await p.driver.wait(async()=>!(await p.text('#tbody')).includes('Ana QA'),10000);
 assert.equal(await p.driver.executeScript('return Object.keys(window.__qaDb.leads).length'),1);
});
