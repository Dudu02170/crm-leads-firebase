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
scenario('cadastros consecutivos preservam leads existentes sem sobrescrever chaves',async p=>{
 await login(p);
 const seeded=await p.driver.executeScript('return structuredClone(window.__qaDb.leads)');
 const created=[];
 for(const [nome,ig] of [['Carla QA','@carla.qa'],['Daniel QA','@daniel.qa']]){
  await p.click('button[onclick="openModal()"]');
  await p.fill('#f-nome',nome);await p.fill('#f-ig',ig);
  await p.click('button[onclick="saveLead()"]');await p.waitText('#tbody',nome);
  created.push(nome);
  const persisted=await p.driver.executeScript('return structuredClone(window.__qaDb.leads)');
  assert.equal(Object.keys(persisted).length,Object.keys(seeded).length+created.length,
   'cada cadastro deve acrescentar um registro');
  for(const [id,lead] of Object.entries(seeded)){
   assert.deepEqual(persisted[id],lead,'cadastro alterou o lead preexistente '+id);
   await p.waitText('#tbody',lead.nome);
  }
  for(const createdName of created){
   assert.equal(Object.values(persisted).filter(l=>l.nome===createdName).length,1);
   await p.waitText('#tbody',createdName);
  }
 }
 const writes=await p.driver.executeScript("return window.__qaWrites.filter(x=>x.path.startsWith('leads/'))");
 assert.equal(writes.length,2,'dois cadastros devem gerar duas gravações de lead');
 assert.equal(new Set(writes.map(w=>w.path)).size,2,'cadastros devem usar chaves distintas');
 assert.ok(writes.every(w=>!Object.hasOwn(seeded,w.path.slice('leads/'.length))),
  'cadastros não podem reutilizar chaves dos dados iniciais');
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

const crmState=p=>p.driver.executeScript('return structuredClone({leads:window.__qaDb.leads,activity:window.__qaDb.activity})');
const crmWrites=p=>p.driver.executeScript("return window.__qaWrites.filter(w=>w.path.startsWith('leads/')||w.path.startsWith('activity/'))");
const leadEditPaths=id=>['nome','ig','wa','seg','status','interesse','cidade','data','proximoContato','notas','owner','updatedAt'].map(key=>`leads/${id}/${key}`);
scenario('editar mantendo o proprio instagram atualiza somente o lead escolhido',async p=>{
 await login(p);const original=await crmState(p);
 await p.click('button[onclick="openModal(\'qa1\')"]');
 await p.fill('#f-nome','Ana Atualizada QA');await p.fill('#f-ig','@ANA.QA');
 await p.fill('#f-cidade','Cidade QA');await p.fill('#f-notas','Retorno fictício combinado');
 await p.click('button[onclick="saveLead()"]');await p.waitText('#tbody','Ana Atualizada QA');
 await p.driver.wait(()=>p.driver.executeScript("return !document.getElementById('modal-overlay').classList.contains('open')"),10000);
 const saved=await crmState(p);
 assert.equal(Object.keys(saved.leads).length,2,'editar não deve criar outro lead');
 assert.deepEqual(saved.leads.qa2,original.leads.qa2,'outro lead deve ser preservado');
 assert.equal(saved.leads.qa1.nome,'Ana Atualizada QA');assert.equal(saved.leads.qa1.ig,'@ANA.QA');
 assert.equal(saved.leads.qa1.cidade,'Cidade QA');assert.equal(saved.leads.qa1.notas,'Retorno fictício combinado');
 assert.equal(saved.leads.qa1.status,original.leads.qa1.status);
 const writes=await crmWrites(p);
 assert.deepEqual(writes.filter(w=>w.path.startsWith('leads/')).map(w=>w.path),leadEditPaths('qa1'));
 const activity=Object.values(saved.activity);
 assert.equal(activity.length,1);assert.equal(activity[0].who,'Pessoa QA');
 assert.match(activity[0].action,/editou.*Ana Atualizada QA/);
});
scenario('editar com instagram de outro lead rejeita sem alterar dados ou atividade',async p=>{
 await login(p);const original=await crmState(p);
 await p.click('button[onclick="openModal(\'qa1\')"]');
 await p.fill('#f-nome','Alteracao rejeitada QA');await p.fill('#f-ig','BRUNO.QA');
 await p.click('button[onclick="saveLead()"]');await p.alert(/já cadastrado/);
 assert.deepEqual(await crmState(p),original);
 assert.deepEqual(await crmWrites(p),[],'rejeição não deve gravar lead nem atividade');
 assert.equal(await p.driver.executeScript("return document.getElementById('modal-overlay').classList.contains('open')"),true);
});
scenario('cancelar edicao descarta rascunho e reabre valores persistidos',async p=>{
 await login(p);const original=await crmState(p);
 await p.click('button[onclick="openModal(\'qa1\')"]');
 await p.fill('#f-nome','Rascunho QA');await p.fill('#f-notas','Nota não salva');
 await p.select('#f-status','Perdido');
 await p.click('#modal-overlay button[onclick="closeModal()"]');
 assert.deepEqual(await crmState(p),original);assert.deepEqual(await crmWrites(p),[]);
 await p.click('button[onclick="openModal(\'qa1\')"]');
 assert.equal(await (await p.element('#f-nome')).getAttribute('value'),original.leads.qa1.nome);
 assert.equal(await (await p.element('#f-status')).getAttribute('value'),original.leads.qa1.status);
 assert.equal(await (await p.element('#f-notas')).getAttribute('value'),original.leads.qa1.notas||'');
});

scenario('busca status e segmento combinam filtros sem modificar leads ou atividade',async p=>{
 await login(p);
 const original=await crmState(p);
 const cases=[
  ['@ANA.QA','Prospect','Artesanato/Ateliê',['Ana QA']],
  ['@ANA.QA','Fechado','Artesanato/Ateliê',[]],
  ['QA','Fechado','Cutelaria',['Bruno QA']],
  ['QA','Fechado','Artesanato/Ateliê',[]],
  ['cUtElArIa','','Cutelaria',['Bruno QA']],
  ['','','Artesanato/Ateliê',['Ana QA']],
  ['','','',['Ana QA','Bruno QA']]
 ];
 for(const [query,status,segment,expected] of cases){
  await p.fill('#search',query);
  await p.select('#filter-status',status);
  await p.select('#filter-seg',segment);
  const context=JSON.stringify({query,status,segment});
  await p.driver.wait(async()=>{
   const names=await p.driver.findElements(By.css('#tbody .name-cell > div:last-child > div:first-child'));
   const actual=await Promise.all(names.map(e=>e.getText()));
   return JSON.stringify(actual)===JSON.stringify(expected);
  },10000,'filtros devem retornar exatamente os leads esperados: '+context);
  if(!expected.length)await p.waitText('#tbody','Nenhum lead encontrado.');
  assert.equal(await (await p.element('#search')).getAttribute('value'),query);
  assert.equal(await (await p.element('#filter-status')).getAttribute('value'),status);
  assert.equal(await (await p.element('#filter-seg')).getAttribute('value'),segment);
  assert.deepEqual(await crmState(p),original,'filtros alteraram dados: '+context);
  assert.deepEqual(await crmWrites(p),[],'filtros gravaram dados: '+context);
 }
});

async function contactDates(p){
 return p.driver.executeScript(`return [-1,0,1].map(offset=>{
  const date=new Date();date.setDate(date.getDate()+offset);
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
 })`);
}
async function setNextContact(p,value){
 // ISO no controle nativo; o calendário visual/locale do Chrome não faz parte desta verificação.
 await p.driver.executeScript(`const field=document.getElementById('f-proximo');field.value=arguments[0];
  field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));`,value);
}
async function saveModal(p){
 await p.click('button[onclick="saveLead()"]');
 await p.driver.wait(()=>p.driver.executeScript("return !document.getElementById('modal-overlay').classList.contains('open')"),10000);
}
async function schedule(p,id,value){
 await p.click(`button[onclick="openModal('${id}')"]`);await setNextContact(p,value);await saveModal(p);
}
async function contactCell(p,id){
 const edit=await p.element(`button[onclick="openModal('${id}')"]`);
 return p.driver.executeScript('return arguments[0].closest("tr").querySelector(".next-contact").textContent',edit);
}

scenario('proximo contato salva e atualiza tabela e funil preservando outros leads',async p=>{
 await login(p);const original=await crmState(p),[,today,future]=await contactDates(p);
 await schedule(p,'qa1',today);
 assert.match(await contactCell(p,'qa1'),/Hoje/);
 await p.select('#filter-agenda','pendente');
 assert.equal((await p.driver.findElements(By.css('#tbody .name-cell'))).length,1);
 await p.waitText('#tbody','Ana QA');await p.select('#filter-agenda','');
 let saved=await crmState(p);
 assert.equal(saved.leads.qa1.proximoContato,today);assert.equal(saved.leads.qa1.data,original.leads.qa1.data);
 assert.deepEqual(saved.leads.qa2,original.leads.qa2);
 await p.click('button[onclick="openModal(\'qa1\')"]');
 assert.equal(await (await p.element('#f-proximo')).getAttribute('value'),today);
 await p.click('#modal-overlay button[onclick="closeModal()"]');
 await p.click('button[onclick="switchTab(\'kanban\')"]');
 const cards=await p.driver.findElements(By.css('.kcard'));
 const ana=await (async()=>{for(const card of cards)if((await card.getText()).includes('Ana QA'))return card;})();
 assert.ok(ana);assert.match(await ana.getText(),/Próximo contato: Hoje/);
 await ana.click();await setNextContact(p,future);await saveModal(p);
 await p.waitText('#kanban','Agendado');
 await p.click('button[onclick="switchTab(\'leads\')"]');
 assert.match(await contactCell(p,'qa1'),/Agendado/,'voltar do funil deve mostrar a edição atual');
 saved=await crmState(p);assert.equal(saved.leads.qa1.proximoContato,future);
 assert.deepEqual(saved.leads.qa2,original.leads.qa2);assert.equal(Object.keys(saved.leads).length,2);
 assert.deepEqual((await crmWrites(p)).filter(w=>w.path.startsWith('leads/')).map(w=>w.path),[...leadEditPaths('qa1'),...leadEditPaths('qa1')]);
});

scenario('agenda combina atrasados futuros sem data e filtros existentes sem gravar',async p=>{
 await login(p);const [past,,future]=await contactDates(p);
 await schedule(p,'qa1',past);await schedule(p,'qa2',future);
 assert.equal((await crmState(p)).leads.qa2.seg,'Cutelaria','editar a agenda deve preservar segmento legado fora das opções fixas');
 await p.click('button[onclick="openModal()"]');
 assert.equal(await (await p.element('#f-proximo')).getAttribute('value'),'');
 await p.fill('#f-nome','Carla Sem Agenda QA');await p.fill('#f-ig','@carla.agenda.qa');await saveModal(p);
 const before=await crmState(p),writes=await crmWrites(p);
 const cases=[
  ['pendente','','','',['Ana QA']],
  ['futuro','','','',['Bruno QA']],
  ['sem','','','',['Carla Sem Agenda QA']],
  ['pendente','Fechado','','',[]],
  ['futuro','Fechado','Cutelaria','Bruno',['Bruno QA']],
  ['futuro','','','Ana',[]],
  ['pendente','','Artesanato/Ateliê','Ana',['Ana QA']],
  ['','','','',['Ana QA','Bruno QA','Carla Sem Agenda QA']]
 ];
 for(const [agenda,status,segment,query,expected] of cases){
  await p.fill('#search',query);await p.select('#filter-status',status);
  await p.select('#filter-seg',segment);await p.select('#filter-agenda',agenda);
  const names=await p.driver.findElements(By.css('#tbody .name-cell > div:last-child > div:first-child'));
  assert.deepEqual((await Promise.all(names.map(e=>e.getText()))).sort(),expected.slice().sort());
  if(!expected.length)await p.waitText('#tbody','Nenhum lead encontrado.');
  assert.deepEqual(await crmState(p),before);assert.deepEqual(await crmWrites(p),writes);
 }
});

scenario('cancelar rascunho preserva agenda e limpar campo remove so o agendamento',async p=>{
 await login(p);const [,today,future]=await contactDates(p);await schedule(p,'qa1',today);
 const before=await crmState(p),writes=await crmWrites(p);
 await p.click('button[onclick="openModal(\'qa1\')"]');await setNextContact(p,future);
 await p.click('#modal-overlay button[onclick="closeModal()"]');
 assert.deepEqual(await crmState(p),before);assert.deepEqual(await crmWrites(p),writes);
 await p.click('button[onclick="openModal(\'qa1\')"]');
 assert.equal(await (await p.element('#f-proximo')).getAttribute('value'),today);
 await setNextContact(p,'');await saveModal(p);
 const after=await crmState(p);
 assert.equal(after.leads.qa1.proximoContato,'');assert.equal((await contactCell(p,'qa1')).trim(),'—');
 assert.deepEqual(after.leads.qa2,before.leads.qa2);
 for(const key of ['nome','ig','data','notas','status','interesse','cidade'])assert.equal(after.leads.qa1[key],before.leads.qa1[key]);
 await p.click('button[onclick="openModal(\'qa1\')"]');
 assert.equal(await (await p.element('#f-proximo')).getAttribute('value'),'');
});

scenario('novo lead com agendamento preserva os preexistentes e reabre a data salva',async p=>{
 await login(p);const original=await crmState(p),[,,future]=await contactDates(p);
 await p.click('button[onclick="openModal()"]');
 assert.equal(await (await p.element('#f-proximo')).getAttribute('value'),'');
 await p.fill('#f-nome','Carla Agendada QA');await p.fill('#f-ig','@carla.agendada.qa');
 await setNextContact(p,future);await saveModal(p);
 const saved=await crmState(p),entry=Object.entries(saved.leads).find(([,l])=>l.nome==='Carla Agendada QA');
 assert.ok(entry);assert.equal(entry[1].proximoContato,future);assert.ok(entry[1].createdAt);
 assert.equal(Object.keys(saved.leads).length,3);
 for(const [id,lead] of Object.entries(original.leads))assert.deepEqual(saved.leads[id],lead);
 assert.match(await contactCell(p,entry[0]),/Agendado/);
 await p.click(`button[onclick="openModal('${entry[0]}')"]`);
 assert.equal(await (await p.element('#f-proximo')).getAttribute('value'),future);
 assert.equal(Object.values(saved.activity).length,1);
});

async function addScheduledLead(p,name,handle,date=''){
 await p.click('button[onclick="openModal()"]');await p.fill('#f-nome',name);await p.fill('#f-ig',handle);
 await setNextContact(p,date);await saveModal(p);
 const state=await crmState(p);return Object.keys(state.leads).find(id=>state.leads[id].ig===handle);
}
async function listedNames(p){
 const names=await p.driver.findElements(By.css('#tbody .name-cell > div:last-child > div:first-child'));
 return Promise.all(names.map(e=>e.getText()));
}
async function listedIds(p){
 const buttons=await p.driver.findElements(By.css('#tbody button[onclick^="openModal("]'));
 return Promise.all(buttons.map(async b=>(await b.getAttribute('onclick')).match(/openModal\('([^']+)'\)/)[1]));
}

scenario('fila por proximo contato combina filtros e restaura ordem recente sem gravar',async p=>{
 await login(p);const [past,today,future]=await contactDates(p);
 await schedule(p,'qa1',future);await schedule(p,'qa2',past);
 await addScheduledLead(p,'Carla Hoje QA','@carla.hoje.qa',today);
 await addScheduledLead(p,'Davi Sem Agenda QA','@davi.sem.qa');
 const before=await crmState(p),writes=await crmWrites(p);
 const recent=['Davi Sem Agenda QA','Carla Hoje QA','Bruno QA','Ana QA'];
 assert.equal(await (await p.element('#order-leads')).getAttribute('value'),'updated');
 assert.deepEqual(await listedNames(p),recent);
 await p.select('#order-leads','proximo');
 const queue=['Bruno QA','Carla Hoje QA','Ana QA','Davi Sem Agenda QA'];
 assert.deepEqual(await listedNames(p),queue);
 await p.select('#filter-agenda','pendente');assert.deepEqual(await listedNames(p),['Bruno QA','Carla Hoje QA']);
 await p.select('#filter-status','Prospect');assert.deepEqual(await listedNames(p),['Carla Hoje QA']);
 await p.select('#filter-status','');await p.select('#filter-agenda','futuro');
 assert.deepEqual(await listedNames(p),['Ana QA']);
 await p.select('#filter-agenda','sem');assert.deepEqual(await listedNames(p),['Davi Sem Agenda QA']);
 await p.select('#filter-agenda','');await p.fill('#search','Carla');await p.select('#filter-seg','Artesanato/Ateliê');
 assert.deepEqual(await listedNames(p),['Carla Hoje QA']);
 await p.fill('#search','');await p.select('#filter-seg','');
 assert.deepEqual(await listedNames(p),queue);
 await p.click('button[onclick="switchTab(\'kanban\')"]');await p.click('button[onclick="switchTab(\'leads\')"]');
 assert.equal(await (await p.element('#order-leads')).getAttribute('value'),'proximo');
 assert.deepEqual(await listedNames(p),queue);
 await p.select('#order-leads','updated');assert.deepEqual(await listedNames(p),recent);
 assert.deepEqual(await crmState(p),before);assert.deepEqual(await crmWrites(p),writes);
});

scenario('fila desempata por nome e id e reposiciona somente o lead editado',async p=>{
 await login(p);const [,today,future]=await contactDates(p);
 await schedule(p,'qa1',today);await schedule(p,'qa2',today);
 const anotherAna=await addScheduledLead(p,'Ana QA','@ana.agenda.dupla.qa',today);
 const before=await crmState(p),writes=await crmWrites(p);
 await p.select('#order-leads','proximo');
 assert.deepEqual(await listedIds(p),['qa1',anotherAna,'qa2']);
 assert.deepEqual(await crmState(p),before);assert.deepEqual(await crmWrites(p),writes);
 await schedule(p,'qa1',future);
 assert.equal(await (await p.element('#order-leads')).getAttribute('value'),'proximo');
 assert.deepEqual(await listedIds(p),[anotherAna,'qa2','qa1']);
 const edited=await crmState(p);
 assert.equal(edited.leads.qa1.proximoContato,future);
 assert.deepEqual(edited.leads.qa2,before.leads.qa2);assert.deepEqual(edited.leads[anotherAna],before.leads[anotherAna]);
 await schedule(p,'qa2','');assert.deepEqual(await listedIds(p),[anotherAna,'qa1','qa2']);
 const saved=await crmState(p);
 assert.equal(saved.leads.qa2.proximoContato,'');assert.deepEqual(saved.leads[anotherAna],before.leads[anotherAna]);
 const newWrites=(await crmWrites(p)).slice(writes.length).filter(w=>w.path.startsWith('leads/'));
 assert.deepEqual(newWrites.map(w=>w.path),[...leadEditPaths('qa1'),...leadEditPaths('qa2')]);
});

async function contactButton(p,id='qa1'){return p.element(`[data-contact-id="${id}"]`);}
async function waitContactRecorded(p,id,today){
 await p.driver.wait(()=>p.driver.executeScript('return window.__qaDb.leads[arguments[0]].data===arguments[1]',id,today),10000);
 await p.driver.wait(async()=>!(await (await contactButton(p,id)).isEnabled()),10000);
}

scenario('registrar contato hoje preserva agenda e dados e impede repeticao durante envio',async p=>{
 await login(p);const [,today,future]=await contactDates(p);await schedule(p,'qa1',future);
 await p.select('#order-leads','proximo');
 const before=await crmState(p),writes=await crmWrites(p),batches=await p.driver.executeScript('return window.__qaAtomicUpdates.length');
 await p.driver.executeScript('window.__qaHoldNextLeadWrite=true');
 await (await contactButton(p)).click();await p.alert(/próximo agendamento será mantido/);
 await p.waitText('[data-contact-id="qa1"]','Registrando...');
 assert.equal(await (await contactButton(p)).isEnabled(),false);
 assert.deepEqual(await crmState(p),before);assert.deepEqual(await crmWrites(p),writes);
 await (await contactButton(p)).click();
 assert.deepEqual(await crmWrites(p),writes,'botão bloqueado não pode iniciar uma segunda gravação');
 await p.driver.executeScript('window.__qaReleaseLeadWrite()');
 await waitContactRecorded(p,'qa1',today);
 const saved=await crmState(p),expected={...before.leads.qa1,data:today,updatedAt:saved.leads.qa1.updatedAt};
 assert.deepEqual(saved.leads.qa1,expected);assert.deepEqual(saved.leads.qa2,before.leads.qa2);
 assert.equal(saved.leads.qa1.proximoContato,future);
 assert.ok(saved.leads.qa1.updatedAt>=before.leads.qa1.updatedAt);
 assert.equal(await (await p.element('#order-leads')).getAttribute('value'),'proximo');
 const button=await contactButton(p);
 const displayed=await p.driver.executeScript('const row=arguments[0].closest("tr");return {date:row.querySelector(".last-contact").textContent,idle:row.querySelector(".days-idle").textContent}',button);
 assert.equal(displayed.date,today.slice(8,10)+'/'+today.slice(5,7));assert.equal(displayed.idle,'0d');
 const activity=Object.values(saved.activity);
 assert.equal(activity.length,Object.values(before.activity).length+1);
 assert.match(activity.at(-1).action,/registrou contato realizado hoje.*Ana QA/);
 assert.equal(activity.at(-1).who,'Pessoa QA');
 const newWrites=(await crmWrites(p)).slice(writes.length);
 assert.deepEqual(newWrites.filter(w=>w.path.startsWith('leads/')).map(w=>w.path),['leads/qa1/data','leads/qa1/updatedAt']);
 assert.equal(await p.driver.executeScript('return window.__qaAtomicUpdates.length'),batches+1,'contato e atividade acrescentam uma única atualização multipath');
});

scenario('cancelar contato preserva lead e confirmar nao inventa proximo agendamento',async p=>{
 await login(p);const [,today]=await contactDates(p),before=await crmState(p);
 await (await contactButton(p)).click();
 const dialog=await p.driver.wait(until.alertIsPresent(),10000);assert.match(await dialog.getText(),/foi realizado hoje/);await dialog.dismiss();
 assert.deepEqual(await crmState(p),before);assert.deepEqual(await crmWrites(p),[]);
 assert.equal(await (await contactButton(p)).isEnabled(),true);
 await (await contactButton(p)).click();await p.alert(/foi realizado hoje/);await waitContactRecorded(p,'qa1',today);
 const saved=await crmState(p);
 assert.equal(Object.hasOwn(saved.leads.qa1,'proximoContato'),false);
 assert.deepEqual(saved.leads.qa1,{...before.leads.qa1,data:today,updatedAt:saved.leads.qa1.updatedAt});
 assert.deepEqual(saved.leads.qa2,before.leads.qa2);
 assert.equal(Object.values(saved.activity).length,1);
 assert.equal(await (await contactButton(p)).isEnabled(),false);
});

scenario('falha ao registrar contato preserva dados e libera uma nova tentativa',async p=>{
 await login(p);const [,today]=await contactDates(p),before=await crmState(p);
 await p.driver.executeScript('window.__qaFailNextLeadWrite=true');
 await (await contactButton(p)).click();await p.alert(/foi realizado hoje/);
 await p.alert(/Não foi possível registrar o contato/);
 await p.driver.wait(async()=>(await contactButton(p)).isEnabled(),10000);
 assert.deepEqual(await crmState(p),before);assert.deepEqual(await crmWrites(p),[]);
 await (await contactButton(p)).click();await p.alert(/foi realizado hoje/);await waitContactRecorded(p,'qa1',today);
 const saved=await crmState(p);assert.equal(saved.leads.qa1.data,today);
 assert.deepEqual(saved.leads.qa2,before.leads.qa2);assert.equal(Object.values(saved.activity).length,1);
 assert.deepEqual((await crmWrites(p)).filter(w=>w.path.startsWith('leads/')).map(w=>w.path),['leads/qa1/data','leads/qa1/updatedAt']);
});

scenario('falha na atividade rejeita o contato inteiro e permite tentar novamente',async p=>{
 await login(p);const [,today]=await contactDates(p),before=await crmState(p);
 await p.driver.executeScript('window.__qaFailNextActivityWrite=true');
 await (await contactButton(p)).click();await p.alert(/foi realizado hoje/);
 await p.alert(/Não foi possível registrar o contato/);
 await p.driver.wait(async()=>(await contactButton(p)).isEnabled(),10000);
 assert.deepEqual(await crmState(p),before,'rejeição da atividade deve preservar também a data do contato');
 assert.deepEqual(await crmWrites(p),[]);
 assert.deepEqual(await p.driver.executeScript('return window.__qaAtomicUpdates'),[]);
 await (await contactButton(p)).click();await p.alert(/foi realizado hoje/);await waitContactRecorded(p,'qa1',today);
 const saved=await crmState(p),updates=await p.driver.executeScript('return window.__qaAtomicUpdates');
 assert.equal(updates.length,1);assert.equal(updates[0]['leads/qa1/data'],today);
 assert.equal(updates[0]['leads/qa1/updatedAt'],saved.leads.qa1.updatedAt);
 const activityPath=Object.keys(updates[0]).find(path=>path.startsWith('activity/'));
 assert.ok(activityPath);assert.equal(Object.keys(updates[0]).length,3);
 assert.deepEqual(updates[0][activityPath],saved.activity[activityPath.slice('activity/'.length)]);
 assert.equal(Object.values(saved.activity).length,1);
 assert.deepEqual(saved.leads.qa1,{...before.leads.qa1,data:today,updatedAt:saved.leads.qa1.updatedAt});
 assert.deepEqual(saved.leads.qa2,before.leads.qa2);
});

async function completionButton(p){return p.element('[data-complete-schedule-id="qa1"]');}
async function recordDueContact(p,date){
 await schedule(p,'qa1',date);
 await (await contactButton(p)).click();await p.alert(/foi realizado hoje/);
 const [,today]=await contactDates(p);await waitContactRecorded(p,'qa1',today);
}
async function waitScheduleCompleted(p){
 await p.driver.wait(()=>p.driver.executeScript('return window.__qaDb.leads.qa1.proximoContato===""'),10000);
 await p.driver.wait(()=>p.driver.executeScript('return !document.querySelector("[data-complete-schedule-id=qa1]")'),10000);
}
scenario('concluir agendamento vencido exige confirmacao e preserva contato e outros leads',async p=>{
 await login(p);const [past,today]=await contactDates(p);await recordDueContact(p,past);
 const before=await crmState(p),writes=await crmWrites(p),batches=await p.driver.executeScript('return window.__qaAtomicUpdates.length');
 await (await completionButton(p)).click();
 const cancel=await p.driver.wait(until.alertIsPresent(),10000);assert.match(await cancel.getText(),/data de próximo contato será removida/);await cancel.dismiss();
 assert.deepEqual(await crmState(p),before);assert.deepEqual(await crmWrites(p),writes);
 await p.driver.executeScript('window.__qaHoldNextLeadWrite=true');
 await (await completionButton(p)).click();await p.alert(/contato realizado hoje será preservado/);
 await p.waitText('[data-complete-schedule-id="qa1"]','Concluindo...');
 assert.equal(await (await completionButton(p)).isEnabled(),false);
 await (await completionButton(p)).click();assert.deepEqual(await crmWrites(p),writes);
 await p.driver.executeScript('window.__qaReleaseLeadWrite()');await waitScheduleCompleted(p);
 const saved=await crmState(p);
 assert.deepEqual(saved.leads.qa1,{...before.leads.qa1,proximoContato:'',updatedAt:saved.leads.qa1.updatedAt});
 assert.equal(saved.leads.qa1.data,today);assert.deepEqual(saved.leads.qa2,before.leads.qa2);
 assert.equal(Object.keys(saved.activity).length,Object.keys(before.activity).length+1);
 assert.match(Object.values(saved.activity).at(-1).action,/concluiu o agendamento.*Ana QA/);
 const updates=await p.driver.executeScript('return window.__qaAtomicUpdates');
 assert.equal(updates.length,batches+1);
 assert.deepEqual(Object.keys(updates.at(-1)).sort(),['leads/qa1/proximoContato','leads/qa1/updatedAt',Object.keys(updates.at(-1)).find(k=>k.startsWith('activity/'))].sort());
 assert.equal((await contactCell(p,'qa1')).trim(),'—');
 await p.select('#filter-agenda','sem');await p.waitText('#tbody','Ana QA');
});
scenario('falhas de lead ou atividade preservam agenda e permitem concluir novamente',async p=>{
 await login(p);const [past]=await contactDates(p);await recordDueContact(p,past);
 const before=await crmState(p),writes=await crmWrites(p),batches=await p.driver.executeScript('return window.__qaAtomicUpdates.length');
 for(const hook of ['__qaFailNextLeadWrite','__qaFailNextActivityWrite']){
  await p.driver.executeScript('window[arguments[0]]=true',hook);
  await (await completionButton(p)).click();await p.alert(/data de próximo contato será removida/);
  await p.alert(/Não foi possível concluir o agendamento/);
  await p.driver.wait(async()=>(await completionButton(p)).isEnabled(),10000);
  assert.deepEqual(await crmState(p),before);assert.deepEqual(await crmWrites(p),writes);
  assert.equal(await p.driver.executeScript('return window.__qaAtomicUpdates.length'),batches);
 }
 await (await completionButton(p)).click();await p.alert(/data de próximo contato será removida/);await waitScheduleCompleted(p);
 assert.deepEqual((await crmState(p)).leads.qa2,before.leads.qa2);
});
scenario('conclusao aparece somente com contato hoje e agenda de hoje ou atrasada',async p=>{
 await login(p);const [past,today,future]=await contactDates(p);
 const absent=()=>p.driver.executeScript('return document.querySelectorAll("[data-complete-schedule-id]").length===0');
 assert.equal(await absent(),true);
 await schedule(p,'qa1',past);assert.equal(await absent(),true,'agenda vencida sem contato hoje não pode ser concluída');
 await schedule(p,'qa1',future);await (await contactButton(p)).click();await p.alert(/foi realizado hoje/);await waitContactRecorded(p,'qa1',today);
 assert.equal(await absent(),true,'agenda futura deve ser preservada');
 await schedule(p,'qa1',today);assert.equal(await (await completionButton(p)).isEnabled(),true);
 await (await completionButton(p)).click();await p.alert(/data de próximo contato será removida/);await waitScheduleCompleted(p);
 assert.equal(await absent(),true);assert.equal((await crmState(p)).leads.qa1.data,today);
});

scenario('textos com marcacao permanecem literais na tabela funil filtro e atividade',async p=>{
 await login(p);const original=await crmState(p);
 const name='<span id="qa-name-mark">Ana & QA</span>',notes='<em id="qa-note-mark">Retorno & QA</em>';
 const interest='<img id="qa-interest-mark" src="qa-invalid">',segment='Linha "QA" <Especial> & Resina';
 const instagram='@qa" data-qa-mark="unexpected';
 await p.click('button[onclick="openModal(\'qa1\')"]');
 await p.fill('#f-nome',name);await p.fill('#f-notas',notes);await p.fill('#f-interesse',interest);await p.fill('#f-ig',instagram);
 // A legacy segment is prepared as a selectable value in the real editor, not as rendered HTML.
 await p.driver.executeScript('document.getElementById("f-seg").add(new Option(arguments[0],arguments[0],false,true))',segment);
 await saveModal(p);
 const saved=await crmState(p),writes=await crmWrites(p);
 assert.equal(saved.leads.qa1.nome,name);assert.equal(saved.leads.qa1.notas,notes);
 assert.equal(saved.leads.qa1.seg,segment);assert.equal(saved.leads.qa1.interesse,interest);
 assert.deepEqual(saved.leads.qa2,original.leads.qa2);
 assert.match(await p.text('#tbody'),new RegExp('Ana & QA'));
 const edit=await p.element('button[onclick="openModal(\'qa1\')"]');
 const row=await p.driver.executeScript('return arguments[0].closest("tr").textContent',edit);
 assert.ok(row.includes(name));assert.ok(row.includes(interest));assert.ok(row.includes(segment));assert.ok(row.includes(instagram));
 const clean=()=>p.driver.executeScript('return document.querySelectorAll("#qa-name-mark,#qa-note-mark,#qa-interest-mark,[data-qa-mark]").length===0');
 assert.equal(await clean(),true,'campos não podem criar elementos ou atributos');
 await p.select('#filter-seg',segment);assert.equal(await (await p.element('#filter-seg')).getAttribute('value'),segment);
 await p.click('button[onclick="switchTab(\'kanban\')"]');
 assert.equal(await p.text('.kcard-name'),name);assert.equal(await p.text('.kcard-nota'),notes);
 assert.equal(await clean(),true);
 await p.click('button[onclick="switchTab(\'atividade\')"]');
 assert.equal(await p.text('#activity-list strong'),name);assert.equal(await clean(),true);
 await p.click('button[onclick="switchTab(\'leads\')"]');
 await p.click('button[onclick="openModal(\'qa1\')"]');
 assert.equal(await (await p.element('#f-nome')).getAttribute('value'),name);
 assert.equal(await (await p.element('#f-notas')).getAttribute('value'),notes);
 assert.equal(await (await p.element('#f-seg')).getAttribute('value'),segment);
 await p.click('button[onclick="closeModal()"]');
 assert.deepEqual(await crmState(p),saved);assert.deepEqual(await crmWrites(p),writes,'consultar não regrava valores escapados');
});

scenario('atividade legada conserva negrito sem inserir outros elementos ou atributos',async p=>{
 await login(p);
 const who='<span id="qa-who-mark">Pessoa & QA</span>';
 const action='editou <strong data-qa-unsafe="yes">Nome &amp; QA</strong> <span id="qa-legacy-mark">literal</span>';
 await p.driver.executeScript('firebase.database().ref("activity").push({who:arguments[0],action:arguments[1],ts:Date.now()})',who,action);
 const before=await crmState(p),writes=await crmWrites(p);
 await p.click('button[onclick="switchTab(\'atividade\')"]');
 assert.equal(await p.text('.activity-who'),who);assert.equal(await p.text('#activity-list strong'),'Nome & QA');
 assert.ok((await p.text('#activity-list')).includes('<span id="qa-legacy-mark">literal</span>'));
 assert.equal(await p.driver.executeScript('return document.querySelectorAll("#qa-who-mark,#qa-legacy-mark,[data-qa-unsafe]").length'),0);
 assert.deepEqual(await crmState(p),before);assert.deepEqual(await crmWrites(p),writes);
});

scenario('cadastro rejeitado preserva rascunho e repetir durante envio nao duplica lead',async p=>{
 await login(p);const before=await crmState(p);
 await p.click('button[onclick="openModal()"]');await p.fill('#f-nome','Cadastro atômico QA');await p.fill('#f-ig','@atomic.qa');
 await p.driver.executeScript('window.__qaFailNextActivityWrite=true');
 await p.click('#save-lead-btn');await p.alert(/Não foi possível salvar o lead/);
 assert.deepEqual(await crmState(p),before);assert.deepEqual(await crmWrites(p),[]);
 assert.equal(await (await p.element('#f-nome')).getAttribute('value'),'Cadastro atômico QA');
 assert.equal(await (await p.element('#save-lead-btn')).isEnabled(),true);
 await p.driver.executeScript('window.__qaHoldNextLeadWrite=true');
 await p.click('#save-lead-btn');await p.waitText('#save-lead-btn','Salvando...');
 assert.equal(await (await p.element('#f-nome')).isEnabled(),false);
 assert.equal(await (await p.element('#save-lead-btn')).isEnabled(),false);
 await p.click('#save-lead-btn');await p.click('#modal-overlay button[onclick="closeModal()"]');
 assert.equal(await p.driver.executeScript('return document.getElementById("modal-overlay").classList.contains("open")'),true);
 assert.deepEqual(await crmState(p),before);assert.deepEqual(await crmWrites(p),[]);
 await p.driver.executeScript('window.__qaReleaseLeadWrite()');
 await p.driver.wait(()=>p.driver.executeScript('return !document.getElementById("modal-overlay").classList.contains("open")'),10000);
 const saved=await crmState(p),created=Object.entries(saved.leads).filter(([id])=>!Object.hasOwn(before.leads,id));
 assert.equal(created.length,1);assert.equal(created[0][1].nome,'Cadastro atômico QA');
 assert.deepEqual(saved.leads.qa1,before.leads.qa1);assert.deepEqual(saved.leads.qa2,before.leads.qa2);
 assert.equal(Object.keys(saved.activity).length,1);
 const updates=await p.driver.executeScript('return window.__qaAtomicUpdates');assert.equal(updates.length,1);
 assert.deepEqual(Object.keys(updates[0]).sort(),[`leads/${created[0][0]}`,`activity/${Object.keys(saved.activity)[0]}`].sort());
});
scenario('editar com falha de lead ou atividade conserva rascunho e campos desconhecidos',async p=>{
 await login(p);
 await p.driver.executeScript('firebase.database().ref("leads/qa1").update({campoLegado:"Preservar QA",createdAt:123})');
 const before=await crmState(p),writes=await crmWrites(p),batches=await p.driver.executeScript('return window.__qaAtomicUpdates.length');
 await p.click('button[onclick="openModal(\'qa1\')"]');await p.fill('#f-nome','Edição atômica QA');await p.fill('#f-notas','Rascunho preservado QA');
 for(const hook of ['__qaFailNextLeadWrite','__qaFailNextActivityWrite']){
  await p.driver.executeScript('window[arguments[0]]=true',hook);await p.click('#save-lead-btn');await p.alert(/Não foi possível salvar o lead/);
  assert.equal(await (await p.element('#save-lead-btn')).isEnabled(),true);
  assert.equal(await (await p.element('#f-nome')).getAttribute('value'),'Edição atômica QA');
  assert.equal(await (await p.element('#f-notas')).getAttribute('value'),'Rascunho preservado QA');
  assert.deepEqual(await crmState(p),before);assert.deepEqual(await crmWrites(p),writes);
 }
 await saveModal(p);const saved=await crmState(p);
 assert.equal(saved.leads.qa1.nome,'Edição atômica QA');assert.equal(saved.leads.qa1.notas,'Rascunho preservado QA');
 assert.equal(saved.leads.qa1.campoLegado,'Preservar QA');assert.equal(saved.leads.qa1.createdAt,123);
 assert.deepEqual(saved.leads.qa2,before.leads.qa2);assert.equal(Object.keys(saved.activity).length,Object.keys(before.activity).length+1);
 const updates=await p.driver.executeScript('return window.__qaAtomicUpdates');assert.equal(updates.length,batches+1);
 const keys=Object.keys(updates.at(-1));
 assert.deepEqual(keys.filter(k=>k.startsWith('leads/')).sort(),leadEditPaths('qa1').sort());
 assert.equal(keys.filter(k=>k.startsWith('activity/')).length,1);assert.equal(keys.length,13);
});

scenario('exclusao rejeitada por lead ou atividade preserva registros e permite tentar novamente',async p=>{
 await login(p);const before=await crmState(p),writes=await crmWrites(p);
 for(const hook of ['__qaFailNextLeadWrite','__qaFailNextActivityWrite']){
  await p.driver.executeScript('window[arguments[0]]=true',hook);
  await p.click('[data-delete-id="qa1"]');await p.alert(/Remover/);await p.alert(/Não foi possível remover o lead/);
  await p.driver.wait(async()=>(await p.element('[data-delete-id="qa1"]')).isEnabled(),10000);
  assert.deepEqual(await crmState(p),before);assert.deepEqual(await crmWrites(p),writes);
  assert.equal(await p.driver.executeScript('return window.__qaAtomicUpdates.length'),0);
 }
 await p.click('[data-delete-id="qa1"]');await p.alert(/Remover/);
 await p.driver.wait(()=>p.driver.executeScript('return !Object.hasOwn(window.__qaDb.leads,"qa1")'),10000);
 const saved=await crmState(p);assert.deepEqual(saved.leads,{qa2:before.leads.qa2});
 assert.equal(Object.keys(saved.activity).length,1);assert.match(Object.values(saved.activity)[0].action,/removeu.*Ana QA/);
});
scenario('exclusao em espera bloqueia repeticao e edicao e grava remocao com atividade juntas',async p=>{
 await login(p);const [past]=await contactDates(p);await recordDueContact(p,past);
 const before=await crmState(p),writes=await crmWrites(p),batches=await p.driver.executeScript('return window.__qaAtomicUpdates.length');
 await p.driver.executeScript('window.__qaHoldNextLeadWrite=true');
 await p.click('[data-delete-id="qa1"]');await p.alert(/Remover/);await p.waitText('[data-delete-id="qa1"]','Removendo...');
 for(const selector of ['[data-delete-id="qa1"]','button[onclick="openModal(\'qa1\')"]','[data-contact-id="qa1"]','[data-complete-schedule-id="qa1"]'])
  assert.equal(await (await p.element(selector)).isEnabled(),false);
 await p.click('[data-delete-id="qa1"]');assert.deepEqual(await crmWrites(p),writes);
 await p.click('button[onclick="switchTab(\'kanban\')"]');
 await p.click('.kcard');
 assert.equal(await p.driver.executeScript('return document.getElementById("modal-overlay").classList.contains("open")'),false);
 assert.deepEqual(await crmState(p),before);
 await p.click('button[onclick="switchTab(\'leads\')"]');
 await p.driver.executeScript('window.__qaReleaseLeadWrite()');
 await p.driver.wait(()=>p.driver.executeScript('return !Object.hasOwn(window.__qaDb.leads,"qa1")'),10000);
 const saved=await crmState(p);assert.deepEqual(saved.leads,{qa2:before.leads.qa2});
 for(const [id,activity] of Object.entries(before.activity))assert.deepEqual(saved.activity[id],activity);
 assert.equal(Object.keys(saved.activity).length,Object.keys(before.activity).length+1);
 const updates=await p.driver.executeScript('return window.__qaAtomicUpdates');assert.equal(updates.length,batches+1);
 const last=updates.at(-1),keys=Object.keys(last).sort();
 assert.equal(last['leads/qa1'],null);assert.equal(keys.length,2);
 assert.equal(keys.filter(k=>k.startsWith('activity/')).length,1);
 assert.match(Object.values(saved.activity).at(-1).action,/removeu.*Ana QA/);
});
