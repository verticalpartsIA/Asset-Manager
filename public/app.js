
const SK = {
assets: 'am_assets',
employees: 'am_employees',
allocations: 'am_allocations',
departamentos: 'am_departamentos',
cargos: 'am_cargos',
usuarios: 'am_usuarios',
tema: 'am_tema',
sessao: 'am_sessao',
systemLog: 'am_system_log',
sequenciaAtivos: 'am_sequencia_ativos',
tickets: 'am_tickets',
ticketsTrash: 'am_tickets_trash',
comments: 'am_comments',
articles: 'am_articles',
assetHistory: 'am_asset_history',
checklists: 'am_checklists',
supplies: 'am_supplies'
};
const USUARIOS_PADRAO = [
{ username: 'supporte', password: 'Sup@2024!VP', role: 'admin', name: 'Suporte Técnico' },
{ username: 'fernanda.freires', password: 'Fern@nda#2024', role: 'user', name: 'Fernanda Freires' },
{ username: 'giovanna.maeno', password: 'G1ov@nna!Maeno', role: 'user', name: 'Giovanna Maeno' },
{ username: 'tecnico.suporte', password: 'Tec@2024!VP', role: 'tecnico', name: 'Técnico de Suporte' }
];
let charts = {};
let currentFilters = { search: '', tipo: 'todos', status: 'todos', depto: 'todos', colab: 'todos' };
let assetParaAlterarStatus = null;
let assetParaDescartar = null;
let allocParaDesalocar = null; // NOVO
let currentUser = null;
let colabParaEditar = null;
let filtroMeusChamados = 'todos';
let filtroChamadosAdmin = 'todos';
let filtroMeusAtendimentos = 'pendentes';
let filtrosHistorico = {
dataIni: '',
dataFim: '',
colab: 'todos',
tipoDispositivo: 'todos',
tipoRegistro: 'todos'
};
const DEPT_COLORS = [
'#FFCE05', '#6ba3a3', '#da8a67', '#8b7355', '#C9A200',
'#a0522d', '#cd853f', '#deb887', '#bc8f8f', '#f4a460',
'#d2691e', '#8b4513', '#b8860b', '#daa520', '#d2b48c',
'#f08080', '#e9967a', '#ffa07a', '#ff7f50', '#ff6347',
'#9e8e7e', '#a8a8a8', '#b89b7a', '#c0a080'
];
const STATUS_LABELS = {
available: 'Disponível',
assigned: 'Alocado',
maintenance: 'Manutenção',
inactive: 'Inativo',
discarded: 'Descartado'
};
const CATEGORIAS_CHAMADO = {
perifericos: 'Periféricos',
impressoras: 'Impressoras',
rede: 'Ativos de Rede',
email: 'E-mail',
office: 'Office/Apps',
pabx: 'PABX Virtual',
smartphones: 'Smartphones',
outros: 'Outros'
};
const PRIORIDADES_CHAMADO = {
baixa: { label: 'Baixa', sla: 72 },
media: { label: 'Média', sla: 48 },
alta: { label: 'Alta', sla: 24 },
critica: { label: 'Crítica', sla: 4 }
};
const STATUS_CHAMADO = {
novo: { label: 'Novo', class: 'status-new' },
analise: { label: 'Em Análise', class: 'status-analysis' },
andamento: { label: 'Em Andamento', class: 'status-progress' },
aguardando: { label: 'Aguardando Usuário', class: 'status-waiting' },
resolvido: { label: 'Resolvido', class: 'status-resolved' },
fechado: { label: 'Fechado', class: 'status-closed' }
};
function gerarSenhaAleatoria() {
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
let senha = '';
for (let i = 0; i < 10; i++) { senha += chars.charAt(Math.floor(Math.random() * chars.length)); }
return senha;
}
function roleLabel(role) {
if (role === 'admin') return 'Administrador';
if (role === 'tecnico') return 'Técnico';
return 'Usuário';
}
function addLog(action, details, type) {
type = type || 'alteracao';
const logs = JSON.parse(localStorage.getItem(SK.systemLog) || '[]');
const logEntry = {
id: Date.now(),
timestamp: new Date().toISOString(),
user: currentUser ? currentUser.name : 'Sistema',
action: action,
details: details,
type: type
};
logs.unshift(logEntry);
if (logs.length > 100) logs.pop();
localStorage.setItem(SK.systemLog, JSON.stringify(logs));
}
function gerarNumeroSequencial(tipo) {
let sequencia = JSON.parse(localStorage.getItem(SK.sequenciaAtivos) || '{}');
if (!sequencia[tipo]) { sequencia[tipo] = 0; }
sequencia[tipo]++;
localStorage.setItem(SK.sequenciaAtivos, JSON.stringify(sequencia));
return String(sequencia[tipo]).padStart(3, '0');
}
function initApp() {
if (!localStorage.getItem(SK.usuarios)) {
localStorage.setItem(SK.usuarios, JSON.stringify(USUARIOS_PADRAO));
}
const sessao = localStorage.getItem(SK.sessao);
if (sessao) {
const userData = JSON.parse(sessao);
currentUser = userData;
mostrarApp(userData);
} else {
document.getElementById('login-screen').style.display = 'flex';
document.getElementById('main-app').style.display = 'none';
}
const tema = localStorage.getItem(SK.tema) || 'light';
document.documentElement.setAttribute('data-theme', tema);
atualizarIconeTema(tema);
}
function handleLogin(event) {
event.preventDefault();
const username = document.getElementById('login-username').value.trim();
const password = document.getElementById('login-password').value;
const usuarios = JSON.parse(localStorage.getItem(SK.usuarios) || '[]');
const usuario = usuarios.find(u => u.username === username && u.password === password);
if (usuario) {
const sessao = { username: usuario.username, name: usuario.name, role: usuario.role, employee_id: usuario.employee_id || null };
localStorage.setItem(SK.sessao, JSON.stringify(sessao));
document.getElementById('login-error').classList.remove('show');
addLog('Login', 'Usuário ' + usuario.name + ' fez login no sistema', 'login');
mostrarApp(sessao);
} else {
document.getElementById('login-error').classList.add('show');
}
}
function mostrarApp(userData) {
currentUser = userData;
document.getElementById('login-screen').style.display = 'none';
document.getElementById('main-app').style.display = 'block';
document.getElementById('user-name').textContent = userData.name;
document.getElementById('user-avatar').textContent = userData.name.charAt(0).toUpperCase();
const isAdmin = userData.role === 'admin';
const isTecnico = userData.role === 'tecnico';
const isUser = userData.role === 'user';
if (isAdmin) {
document.getElementById('nav-config').style.display = 'block';
document.getElementById('nav-log').style.display = 'block';
document.getElementById('btn-painel-tecnico').style.display = 'inline-block';
} else {
document.getElementById('nav-config').style.display = 'none';
document.getElementById('nav-log').style.display = 'none';
document.getElementById('btn-painel-tecnico').style.display = 'none';
}
document.getElementById('nav-dashboard').style.display = (isTecnico || isUser) ? 'none' : 'block';
document.getElementById('nav-meus-dispositivos').style.display = isUser ? 'block' : 'none';
document.getElementById('nav-relatorios').style.display = (isTecnico || isUser) ? 'none' : 'block';
document.getElementById('nav-ativos').style.display = (isTecnico || isUser) ? 'none' : 'block';
document.getElementById('nav-estoque').style.display = isUser ? 'none' : 'block';
document.getElementById('nav-colaboradores').style.display = (isTecnico || isUser) ? 'none' : 'block';
document.getElementById('nav-alocacoes').style.display = (isTecnico || isUser) ? 'none' : 'block';
document.getElementById('nav-historico').style.display = isUser ? 'none' : 'block';
document.getElementById('nav-checklists').style.display = isUser ? 'none' : 'block';
document.getElementById('btn-tab-meus-chamados').style.display = isTecnico ? 'none' : 'inline-block';
document.getElementById('btn-tab-novo-chamado').style.display = 'inline-block';
document.getElementById('btn-tab-base-conhecimento').style.display = 'inline-block';
document.getElementById('btn-tab-dashboard-suporte').style.display = isUser ? 'none' : (isTecnico ? 'none' : 'inline-block');
document.getElementById('btn-tab-meus-atendimentos').style.display = isTecnico ? 'inline-block' : 'none';
document.getElementById('btn-tab-lixeira').style.display = (isAdmin || isTecnico) ? 'inline-block' : 'none';
initData();
purgeTrashAntiga();
if (isTecnico) {
showPage('suporte', document.getElementById('nav-suporte'));
} else if (isUser) {
showPage('meus-dispositivos', document.getElementById('nav-meus-dispositivos'));
} else {
renderDashboard();
}
}
function logout() {
if (currentUser) {
addLog('Logout', 'Usuário ' + currentUser.name + ' fez logout', 'logout');
}
localStorage.removeItem(SK.sessao);
currentUser = null;
location.reload();
}
function toggleTheme() {
const currentTheme = document.documentElement.getAttribute('data-theme');
const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
document.documentElement.setAttribute('data-theme', newTheme);
localStorage.setItem(SK.tema, newTheme);
atualizarIconeTema(newTheme);
}
function atualizarIconeTema(tema) {
const iconContainer = document.getElementById('theme-icon');
if (iconContainer) {
if (tema === 'dark') {
iconContainer.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
} else {
iconContainer.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
}
}
}
function toggleMobileMenu() {
const navBar = document.getElementById('nav-bar');
navBar.classList.toggle('show');
}
function showPage(pageName, btn) {
if (currentUser && currentUser.role === 'tecnico' && pageName !== 'suporte' && pageName !== 'historico' && pageName !== 'checklists' && pageName !== 'estoque') {
showToast('Acesso restrito para o perfil Técnico');
pageName = 'suporte';
btn = document.getElementById('nav-suporte');
}
if (currentUser && currentUser.role === 'user' && pageName !== 'meus-dispositivos' && pageName !== 'suporte') {
showToast('Acesso restrito. Usuários comuns podem ver apenas seus dispositivos e abrir chamados de suporte.');
pageName = 'meus-dispositivos';
btn = document.getElementById('nav-meus-dispositivos');
}
document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
document.getElementById('page-' + pageName).classList.add('active');
document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
if (btn) btn.classList.add('active');
if (pageName === 'dashboard') renderDashboard();
if (pageName === 'meus-dispositivos') renderMeusDispositivos();
if (pageName === 'relatorios') renderRelatorios();
if (pageName === 'ativos') renderAtivos();
if (pageName === 'estoque') { showEstoqueView('peliculas', document.querySelector('#page-estoque .suporte-tab')); }
if (pageName === 'colaboradores') renderColaboradores();
if (pageName === 'alocacoes') renderAlocacoes();
if (pageName === 'suporte') renderSuporte();
if (pageName === 'historico') renderHistorico();
if (pageName === 'checklists') renderChecklists();
if (pageName === 'configuracoes') renderConfiguracoes();
if (pageName === 'log') renderLog();
document.getElementById('nav-bar').classList.remove('show');
}
function refreshData() {
const activePage = document.querySelector('.page.active').id.replace('page-', '');
const activeNav = document.querySelector('.nav-item.active');
showPage(activePage, activeNav);
showToast('Dados atualizados com sucesso');
}
function renderConfiguracoes() {
renderConfigList();
renderUsuarioList();
renderColabConfigList();
}
function renderColabConfigList() {
const employees = getData(SK.employees).filter(function(e) { return e.status === 'active'; });
const container = document.getElementById('config-colab-list');
if (!container) return;
container.innerHTML = employees.map(function(e) {
return '<div class="config-item"><span class="config-item-text">' + e.name + ' (' + e.email + ') — ' + e.depto + ' / ' + e.cargo + '</span><div class="config-item-actions"><button class="btn-icon" onclick="abrirModalEditarColab(' + e.id + ')" title="Editar">✏️</button></div></div>';
}).join('') || '<div style="padding: 12px; color: var(--text-muted); font-size: 13px;">Nenhum colaborador ativo encontrado</div>';
}
function renderConfigList() {
const deptos = getData(SK.departamentos);
const cargos = getData(SK.cargos);
document.getElementById('depto-list').innerHTML = deptos.map(function(d, i) {
return '<div class="config-item"><span class="config-item-text">' + d + '</span><div class="config-item-actions"><button class="btn-icon delete" onclick="removerDepartamento(' + i + ')">🗑️</button></div></div>';
}).join('');
document.getElementById('cargo-list').innerHTML = cargos.map(function(c, i) {
return '<div class="config-item"><span class="config-item-text">' + c + '</span><div class="config-item-actions"><button class="btn-icon delete" onclick="removerCargo(' + i + ')">🗑️</button></div></div>';
}).join('');
atualizarDropdownsColaborador();
}
function renderUsuarioList() {
const usuarios = getData(SK.usuarios);
document.getElementById('usuario-list').innerHTML = usuarios.map(function(u, i) { return { u: u, i: i }; })
.filter(function(item) { return item.u.role !== 'user'; })
.map(function(item) {
return '<div class="config-item"><span class="config-item-text">' + item.u.name + ' (' + item.u.username + ') - ' + roleLabel(item.u.role) + '</span><div class="config-item-actions"><button class="btn-icon" onclick="abrirModalEditarUsuario(' + item.i + ')" title="Editar">✏️</button><button class="btn-icon delete" onclick="removerUsuario(' + item.i + ')" title="Remover">🗑️</button></div></div>';
}).join('') || '<div style="padding: 12px; color: var(--text-muted); font-size: 13px;">Nenhum Técnico ou Administrador cadastrado</div>';
}
function adicionarDepartamento() {
const input = document.getElementById('novo-depto');
const novoDepto = input.value.trim().toUpperCase();
if (!novoDepto) return;
const deptos = getData(SK.departamentos);
if (deptos.includes(novoDepto)) { showToast('Departamento já existe!'); return; }
deptos.push(novoDepto);
saveData(SK.departamentos, deptos);
input.value = '';
renderConfigList();
addLog('Departamento Adicionado', 'Departamento "' + novoDepto + '" foi adicionado ao sistema', 'cadastro');
showToast('Departamento adicionado!');
}
function removerDepartamento(index) {
if (!confirm('Remover este departamento?')) return;
const deptos = getData(SK.departamentos);
const deptoRemovido = deptos[index];
deptos.splice(index, 1);
saveData(SK.departamentos, deptos);
renderConfigList();
addLog('Departamento Removido', 'Departamento "' + deptoRemovido + '" foi removido do sistema', 'exclusao');
showToast('Departamento removido!');
}
function adicionarCargo() {
const input = document.getElementById('novo-cargo');
const novoCargo = input.value.trim();
if (!novoCargo) return;
const cargos = getData(SK.cargos);
if (cargos.includes(novoCargo)) { showToast('Cargo já existe!'); return; }
cargos.push(novoCargo);
saveData(SK.cargos, cargos);
input.value = '';
renderConfigList();
addLog('Cargo Adicionado', 'Cargo "' + novoCargo + '" foi adicionado ao sistema', 'cadastro');
showToast('Cargo adicionado!');
}
function removerCargo(index) {
if (!confirm('Remover este cargo?')) return;
const cargos = getData(SK.cargos);
const cargoRemovido = cargos[index];
cargos.splice(index, 1);
saveData(SK.cargos, cargos);
renderConfigList();
addLog('Cargo Removido', 'Cargo "' + cargoRemovido + '" foi removido do sistema', 'exclusao');
showToast('Cargo removido!');
}
function adicionarUsuario() {
const username = document.getElementById('novo-usuario-username').value.trim();
const password = document.getElementById('novo-usuario-password').value.trim();
const role = document.getElementById('novo-usuario-role').value;
if (!username || !password) { showToast('Por favor, preencha nome de usuário e senha'); return; }
if (role === 'user') { showToast('Usuários Comuns são criados automaticamente ao cadastrar um Colaborador.'); return; }
const usuarios = getData(SK.usuarios);
if (usuarios.find(function(u) { return u.username === username; })) { showToast('Nome de usuário já existe!'); return; }
const employees = getData(SK.employees);
if (employees.find(function(emp) { return emp.email.toLowerCase() === username.toLowerCase(); })) { showToast('Este e-mail já pertence a um Colaborador. Use a seção de Colaboradores.'); return; }
usuarios.push({ username: username, password: password, role: role, name: username });
saveData(SK.usuarios, usuarios);
document.getElementById('novo-usuario-username').value = '';
document.getElementById('novo-usuario-password').value = '';
renderUsuarioList();
addLog('Usuário Cadastrado', 'Novo usuário "' + username + '" foi cadastrado com perfil ' + roleLabel(role), 'cadastro');
showToast('Usuário cadastrado com sucesso!');
}
function removerUsuario(index) {
if (!confirm('Remover este usuário?')) return;
const usuarios = getData(SK.usuarios);
const usuarioRemovido = usuarios[index];
if (usuarioRemovido.role === 'user') { showToast('Usuários Comuns só podem ser removidos pela seção de Colaboradores.'); return; }
if (usuarioRemovido.username === currentUser.username) { showToast('Você não pode remover seu próprio usuário!'); return; }
usuarios.splice(index, 1);
saveData(SK.usuarios, usuarios);
renderUsuarioList();
addLog('Usuário Removido', 'Usuário "' + usuarioRemovido.username + '" foi removido do sistema', 'exclusao');
showToast('Usuário removido!');
}
function abrirModalEditarUsuario(index) {
const usuarios = getData(SK.usuarios);
const usuario = usuarios[index];
if (usuario && usuario.role === 'user') { showToast('Usuários Comuns só podem ser editados pela seção de Colaboradores.'); return; }
if (usuario) {
document.getElementById('editar-usuario-username').value = usuario.username;
document.getElementById('editar-usuario-name').value = usuario.name;
document.getElementById('editar-usuario-password').value = '';
document.getElementById('editar-usuario-role').value = usuario.role;
document.getElementById('modal-editar-usuario').dataset.usuarioIndex = index;
document.getElementById('modal-editar-usuario').classList.add('active');
}
}
function salvarEdicaoUsuario() {
const index = parseInt(document.getElementById('modal-editar-usuario').dataset.usuarioIndex);
const usuarios = getData(SK.usuarios);
const usuario = usuarios[index];
if (!usuario) return;
const novoName = document.getElementById('editar-usuario-name').value.trim();
const novaSenha = document.getElementById('editar-usuario-password').value.trim();
const novoRole = document.getElementById('editar-usuario-role').value;
if (!novoName) { showToast('Por favor, preencha o nome'); return; }
if (usuario.employee_id) { showToast('Usuários Comuns só podem ser editados pela seção de Colaboradores.'); return; }
const nomeAntigo = usuario.name;
const roleAntigo = usuario.role;
usuario.name = novoName;
usuario.role = novoRole;
if (novaSenha) { usuario.password = novaSenha; }
if (usuario.username === currentUser.username) {
currentUser.name = novoName;
currentUser.role = novoRole;
localStorage.setItem(SK.sessao, JSON.stringify(currentUser));
document.getElementById('user-name').textContent = novoName;
document.getElementById('user-avatar').textContent = novoName.charAt(0).toUpperCase();
}
saveData(SK.usuarios, usuarios);
const detalhesSenha = novaSenha ? ' (senha alterada)' : '';
addLog('Usuário Editado', 'Usuário "' + usuario.username + '" (' + nomeAntigo + ') foi editado. Perfil alterado de ' + roleLabel(roleAntigo) + ' para ' + roleLabel(novoRole) + detalhesSenha, 'alteracao');
showToast('Usuário atualizado com sucesso!');
fecharModal('modal-editar-usuario');
renderUsuarioList();
}
function renderLog() { filtrarLog(); }
function filtrarLog() {
const search = document.getElementById('log-search').value.toLowerCase();
const tipo = document.getElementById('log-tipo').value;
const logs = JSON.parse(localStorage.getItem(SK.systemLog) || '[]');
const container = document.getElementById('log-list');
let filteredLogs = logs;
if (tipo !== 'todos') { filteredLogs = filteredLogs.filter(function(log) { return log.type === tipo; }); }
if (search) {
filteredLogs = filteredLogs.filter(function(log) {
return log.action.toLowerCase().includes(search) || log.details.toLowerCase().includes(search) || log.user.toLowerCase().includes(search);
});
}
if (filteredLogs.length === 0) {
container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">Nenhum registro encontrado</div>';
return;
}
container.innerHTML = filteredLogs.map(function(log) {
return '<div class="log-entry"><div class="log-timestamp">' + new Date(log.timestamp).toLocaleString('pt-BR') + '</div><div class="log-action"><strong>' + log.action + '</strong>: ' + log.details + '</div><div class="log-user">Por: ' + log.user + ' | Tipo: ' + log.type + '</div></div>';
}).join('');
}
function exportarLog() {
const logs = JSON.parse(localStorage.getItem(SK.systemLog) || '[]');
const csv = [['Data/Hora', 'Usuário', 'Ação', 'Detalhes', 'Tipo']];
logs.forEach(function(log) {
csv.push([new Date(log.timestamp).toLocaleString('pt-BR'), log.user, log.action, log.details, log.type]);
});
const csvText = csv.map(function(row) { return row.join(';'); }).join('\n');
const blob = new Blob(['\ufeff' + csvText], { type: 'text/csv;charset=utf-8;' });
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = 'log_sistema_' + new Date().toISOString().split('T')[0] + '.csv';
link.click();
showToast('Log exportado com sucesso!');
}
function limparLog() {
if (!confirm('Deseja limpar todo o log do sistema?')) return;
localStorage.setItem(SK.systemLog, JSON.stringify([]));
renderLog();
addLog('Log Limpo', 'Log do sistema foi limpo', 'limpeza');
showToast('Log limpo com sucesso!');
}
function initData() {
if (!localStorage.getItem(SK.departamentos)) {
localStorage.setItem(SK.departamentos, JSON.stringify(['ADMINISTRAÇÃO', 'ALMOXERIFADO', 'ASSEIO E CONSERVAÇÃO', 'AUTOMAÇÃO', 'COMERCIAL', 'COMPRAS', 'COPA', 'DIRETORIA', 'ENGENHARIA', 'EXPEDIÇÃO', 'FINANCEIRO', 'GENTE E GESTÃO', 'INSTALAÇÃO E MANUTENÇÃO', 'LOGISTICA', 'MARKETING', 'MONTAGEM', 'MOTORISTA', 'OPERAÇÕES', 'PCP', 'PÓS VENDA', 'PRODUÇÃO', 'QUALIDADE', 'SERRALHEIRO', 'TI']));
}
if (!localStorage.getItem(SK.cargos)) {
localStorage.setItem(SK.cargos, JSON.stringify(['Analista', 'Gerente', 'Coordenador', 'Supervisor', 'Técnico', 'Assistente', 'Diretor', 'Operador', 'Auxiliar', 'Engenheiro', 'Inspetor', 'Comprador', 'Almoxarife', 'Conferente', 'Motorista', 'Atendente', 'Serralheiro', 'Vendedor', 'Desenvolvedor']));
}
if (!localStorage.getItem(SK.employees)) {
localStorage.setItem(SK.employees, JSON.stringify([
{id: 1, name: "Ana Silva", email: "ana@empresa.com", depto: "TI", cargo: "Analista de TI", status: "active", created_at: new Date().toISOString()},
{id: 2, name: "Carlos Santos", email: "carlos@empresa.com", depto: "RH", cargo: "Gerente de RH", status: "active", created_at: new Date().toISOString()},
{id: 3, name: "Marina Costa", email: "marina@empresa.com", depto: "FINANCEIRO", cargo: "Analista Financeiro", status: "active", created_at: new Date().toISOString()},
{id: 4, name: "Pedro Alves", email: "pedro@empresa.com", depto: "TI", cargo: "Desenvolvedor", status: "inactive", created_at: new Date().toISOString()},
{id: 5, name: "Juliana Lima", email: "juliana@empresa.com", depto: "COMERCIAL", cargo: "Vendedora", status: "active", created_at: new Date().toISOString()}
]));
}
if (!localStorage.getItem(SK.assets)) {
const now = new Date().toISOString();
localStorage.setItem(SK.assets, JSON.stringify([
{id: "a1", uid: "VP-NB-2026-00001", type: "NB", brand: "Dell", model: "Latitude 5440", serial: "NB-001", status: "assigned", valor: 8500, serviceTag: "ABC1234", so: "Windows 11 Pro", winupdate: "Atualizado", antivirus: "Defender", hd: "512GB NVMe", processador: "i7 11th Gen", ram: "16GB", bitlockerId: "BL-001", bitlockerPass: "123456-7890", anydesk: "123456789", intune: "Sim", created_at: now},
{id: "a2", uid: "VP-CL-2026-00001", type: "CL", brand: "Apple", model: "iPhone 13", serial: "IMEI-001", status: "assigned", valor: 5000, telefone: "(11) 99999-9999", imei: "353456789012345", armazenamento: "128GB", ram: "4GB", sistema: "iOS", versao: "15", atualizado: "Sim", intune: "Sim", created_at: now}
]));
}
if (!localStorage.getItem(SK.allocations)) {
localStorage.setItem(SK.allocations, JSON.stringify([
{id: "al1", employee_id: 1, asset_uid: "VP-NB-2026-00001", date: new Date(Date.now() - 86400000*30).toISOString(), status: "active"},
{id: "al2", employee_id: 2, asset_uid: "VP-CL-2026-00001", date: new Date(Date.now() - 86400000*28).toISOString(), status: "active"}
]));
}
if (!localStorage.getItem(SK.systemLog)) localStorage.setItem(SK.systemLog, JSON.stringify([]));
if (!localStorage.getItem(SK.sequenciaAtivos)) localStorage.setItem(SK.sequenciaAtivos, JSON.stringify({}));
if (!localStorage.getItem(SK.tickets)) localStorage.setItem(SK.tickets, JSON.stringify([]));
if (!localStorage.getItem(SK.ticketsTrash)) localStorage.setItem(SK.ticketsTrash, JSON.stringify([]));
if (!localStorage.getItem(SK.comments)) localStorage.setItem(SK.comments, JSON.stringify([]));
if (!localStorage.getItem(SK.assetHistory)) localStorage.setItem(SK.assetHistory, JSON.stringify([]));
if (!localStorage.getItem(SK.checklists)) localStorage.setItem(SK.checklists, JSON.stringify({}));
if (!localStorage.getItem(SK.supplies)) {
const suppliesExemplo = [
{ id: 'SUP-1', type: 'pelicula', model: 'iPhone 13', specifics: 'Vidro Temperado', quantity: 15, status: 'Disponível', created_at: new Date().toISOString() },
{ id: 'SUP-2', type: 'pelicula', model: 'Galaxy S21', specifics: 'Hidrogel', quantity: 3, status: 'Baixo', created_at: new Date().toISOString() },
{ id: 'SUP-3', type: 'tinta', model: 'HP DeskJet 2700', specifics: 'Preto', quantity: 8, status: 'Disponível', created_at: new Date().toISOString() },
{ id: 'SUP-4', type: 'tinta', model: 'Epson L3250', specifics: 'CMYK Kit', quantity: 0, status: 'Esgotado', created_at: new Date().toISOString() }
];
localStorage.setItem(SK.supplies, JSON.stringify(suppliesExemplo));
}
if (!localStorage.getItem(SK.articles)) {
const artigosExemplo = [
{id: 'ART-001', title: 'Como configurar a impressora de rede', content: 'Para configurar a impressora de rede no Windows:\n1. Acesse Painel de Controle\n2. Clique em Adicionar impressora\n3. Selecione a impressora de rede\n4. Instale os drivers\n5. Teste a impressão', category: 'impressoras', tags: ['impressora', 'rede', 'windows'], views: 45, created_by: 'supporte', created_at: new Date(Date.now() - 30*24*60*60*1000).toISOString(), updated_at: new Date().toISOString()},
{id: 'ART-002', title: 'Reset de senha do e-mail corporativo', content: 'Para resetar sua senha:\n1. Acesse o portal\n2. Clique em Esqueci minha senha\n3. Insira seu e-mail\n4. Verifique o link de reset\n5. Crie uma nova senha', category: 'email', tags: ['email', 'senha', 'reset'], views: 128, created_by: 'supporte', created_at: new Date(Date.now() - 15*24*60*60*1000).toISOString(), updated_at: new Date().toISOString()}
];
localStorage.setItem(SK.articles, JSON.stringify(artigosExemplo));
}
}
function getData(key) { return JSON.parse(localStorage.getItem(key) || '[]'); }
function saveData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function renderDashboard() {
const assets = getData(SK.assets);
const employees = getData(SK.employees);
const allocations = getData(SK.allocations).filter(function(a) { return a.status === 'active'; });
document.getElementById('kpi-colab-ativos').textContent = employees.filter(function(e) { return e.status === 'active'; }).length;
document.getElementById('kpi-colab-inativos').textContent = employees.filter(function(e) { return e.status === 'inactive'; }).length;
document.getElementById('kpi-total-ativos').textContent = assets.length;
document.getElementById('kpi-ativos-alocados').textContent = assets.filter(function(a) { return a.status === 'assigned'; }).length;
document.getElementById('kpi-ativos-disp').textContent = assets.filter(function(a) { return a.status === 'available'; }).length;
const dispData = {
available: assets.filter(function(a) { return a.status === 'available'; }).length,
assigned: assets.filter(function(a) { return a.status === 'assigned'; }).length,
maintenance: assets.filter(function(a) { return a.status === 'maintenance'; }).length,
inactive: assets.filter(function(a) { return a.status === 'inactive'; }).length,
discarded: assets.filter(function(a) { return a.status === 'discarded'; }).length
};
document.getElementById('dash-disp-total').textContent = assets.length;
renderDonut('dash-disp-chart', [dispData.available, dispData.assigned, dispData.maintenance, dispData.inactive, dispData.discarded], ['#10b981', '#3b82f6', '#f59e0b', '#6b7280', '#dc2626']);
renderLegend('dash-disp-legend', [{label: 'Disponível', color: '#10b981', value: dispData.available}, {label: 'Alocado', color: '#3b82f6', value: dispData.assigned}, {label: 'Manutenção', color: '#f59e0b', value: dispData.maintenance}, {label: 'Inativo', color: '#6b7280', value: dispData.inactive}, {label: 'Descartado', color: '#dc2626', value: dispData.discarded}]);
const allocAtivas = allocations.length;
const allocInativas = getData(SK.allocations).filter(function(a) { return a.status === 'inactive'; }).length;
document.getElementById('dash-alloc-total').textContent = allocAtivas + allocInativas;
renderDonut('dash-alloc-chart', [allocAtivas, allocInativas], ['#FFCE05', '#9e8e7e']);
renderLegend('dash-alloc-legend', [{label: 'Ativas', color: '#FFCE05', value: allocAtivas}, {label: 'Inativas', color: '#9e8e7e', value: allocInativas}]);
const deptoCount = {};
allocations.forEach(function(al) {
const emp = employees.find(function(e) { return e.id == al.employee_id; });
if (emp) deptoCount[emp.depto] = (deptoCount[emp.depto] || 0) + 1;
});
if (charts['dash-dept']) charts['dash-dept'].destroy();
charts['dash-dept'] = new Chart(document.getElementById('dash-dept-chart').getContext('2d'), {
type: 'bar',
data: { labels: Object.keys(deptoCount), datasets: [{ label: 'Ativos Alocados', data: Object.values(deptoCount), backgroundColor: Object.keys(deptoCount).map(function(_, i) { return DEPT_COLORS[i % DEPT_COLORS.length]; }), borderColor: '#FFCE05', borderWidth: 1, borderRadius: 6 }] },
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#666', stepSize: 1 }, grid: { color: 'rgba(255,206,5,0.06)' } }, x: { ticks: { color: '#a0a0a0', maxRotation: 45, minRotation: 45 }, grid: { display: false } } } }
});
const tbody = document.getElementById('recent-assets-body');
tbody.innerHTML = assets.slice(-5).reverse().map(function(a) {
return '<tr><td class="uid-cell">' + a.uid + '</td><td>' + typeLabel(a.type) + '</td><td>' + a.brand + ' ' + a.model + '</td><td style="font-family: monospace; font-size: 12px;">' + a.serial + '</td><td><span class="badge badge-' + a.status + '">' + STATUS_LABELS[a.status] + '</span></td></tr>';
}).join('');
}
function renderDonut(canvasId, data, colors) {
if (charts[canvasId]) charts[canvasId].destroy();
charts[canvasId] = new Chart(document.getElementById(canvasId).getContext('2d'), {
type: 'doughnut',
data: { labels: ['A', 'B', 'C', 'D', 'E'], datasets: [{ data: data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] },
options: { responsive: true, maintainAspectRatio: true, cutout: '72%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
});
}
function renderLegend(containerId, items) {
document.getElementById(containerId).innerHTML = items.map(function(i) {
return '<div class="legend-item"><span class="legend-dot" style="background: ' + i.color + ';"></span><span>' + i.label + '</span><span class="legend-value">' + i.value + '</span></div>';
}).join('');
}
function renderRelatorios() {
atualizarFiltrosRelatorio();
const assets = getData(SK.assets);
const filtered = aplicarFiltrosRelatorioLogic(assets);
document.getElementById('rel-count').textContent = filtered.length;
document.getElementById('rel-total').textContent = assets.length;
const tbody = document.getElementById('rel-table-body');
tbody.innerHTML = filtered.map(function(a) {
const alloc = getData(SK.allocations).find(function(al) { return al.asset_uid === a.uid && al.status === 'active'; });
const emp = alloc ? getData(SK.employees).find(function(e) { return e.id == alloc.employee_id; }) : null;
return '<tr><td class="uid-cell">' + a.uid + '</td><td>' + typeLabel(a.type) + '</td><td>' + a.brand + ' ' + a.model + '</td><td style="font-family: monospace; font-size: 12px;">' + a.serial + '</td><td>' + (emp ? emp.name : '—') + '</td><td>' + (emp ? emp.depto : '—') + '</td><td><span class="badge badge-' + a.status + '">' + STATUS_LABELS[a.status] + '</span></td><td><button class="btn btn-outline btn-sm" onclick="mostrarQR(\'' + a.uid + '\')">QR</button></td></tr>';
}).join('') || '<tr><td colspan="8" style="text-align:center; padding:30px; color: var(--text-muted);">Nenhum registro encontrado</td></tr>';
renderRelCharts(filtered);
}
function atualizarFiltrosRelatorio() {
const employees = getData(SK.employees).filter(function(e) { return e.status === 'active'; });
const deptos = Array.from(new Set(employees.map(function(e) { return e.depto; }))).sort();
document.getElementById('f-depto').innerHTML = '<option value="todos">Todos</option>' + deptos.map(function(d) { return '<option value="' + d + '">' + d + '</option>'; }).join('');
document.getElementById('f-colab').innerHTML = '<option value="todos">Todos</option>' + employees.map(function(e) { return '<option value="' + e.id + '">' + e.name + '</option>'; }).join('');
}
function aplicarFiltrosRelatorioLogic(assets) {
const search = currentFilters.search.toLowerCase();
const tipo = currentFilters.tipo;
const status = currentFilters.status;
const depto = currentFilters.depto;
const colab = currentFilters.colab;
return assets.filter(function(a) {
if (search && !a.uid.toLowerCase().includes(search) && !a.serial.toLowerCase().includes(search) && !a.model.toLowerCase().includes(search) && !a.brand.toLowerCase().includes(search)) return false;
if (tipo !== 'todos' && a.type !== tipo) return false;
if (status !== 'todos' && a.status !== status) return false;
if (depto !== 'todos' || colab !== 'todos') {
const alloc = getData(SK.allocations).find(function(al) { return al.asset_uid === a.uid && al.status === 'active'; });
const emp = alloc ? getData(SK.employees).find(function(e) { return e.id == alloc.employee_id; }) : null;
if (depto !== 'todos' && (!emp || emp.depto !== depto)) return false;
if (colab !== 'todos' && (!alloc || alloc.employee_id != colab)) return false;
}
return true;
});
}
function aplicarFiltrosRelatorio() {
currentFilters.search = document.getElementById('f-search').value;
currentFilters.tipo = document.getElementById('f-tipo').value;
currentFilters.status = document.getElementById('f-status').value;
currentFilters.depto = document.getElementById('f-depto').value;
currentFilters.colab = document.getElementById('f-colab').value;
renderRelatorios();
showToast('Filtros aplicados');
}
function limparFiltrosRelatorio() {
document.getElementById('f-search').value = '';
document.getElementById('f-tipo').value = 'todos';
document.getElementById('f-status').value = 'todos';
document.getElementById('f-depto').value = 'todos';
document.getElementById('f-colab').value = 'todos';
currentFilters = { search: '', tipo: 'todos', status: 'todos', depto: 'todos', colab: 'todos' };
renderRelatorios();
}
function renderRelCharts(assets) {
const months = {};
assets.forEach(function(a) {
const m = new Date(a.created_at).toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
months[m] = (months[m] || 0) + 1;
});
if (charts['rel-evolucao']) charts['rel-evolucao'].destroy();
charts['rel-evolucao'] = new Chart(document.getElementById('rel-evolucao-chart').getContext('2d'), {
type: 'line',
data: { labels: Object.keys(months), datasets: [{ label: 'Aquisições', data: Object.values(months), borderColor: '#FFCE05', backgroundColor: 'rgba(255, 206, 5, 0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#FFCE05', pointBorderColor: '#0a0a0a', pointBorderWidth: 2, pointRadius: 5 }] },
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#666', stepSize: 1 }, grid: { color: 'rgba(255,206,5,0.06)' } }, x: { ticks: { color: '#a0a0a0' }, grid: { display: false } } } }
});
const filteredUids = assets.map(function(a) { return a.uid; });
const allocations = getData(SK.allocations).filter(function(al) { return al.status === 'active' && filteredUids.includes(al.asset_uid); });
const deptoCount = {};
allocations.forEach(function(al) {
const emp = getData(SK.employees).find(function(e) { return e.id == al.employee_id; });
if (emp) deptoCount[emp.depto] = (deptoCount[emp.depto] || 0) + 1;
});
if (charts['rel-depto']) charts['rel-depto'].destroy();
charts['rel-depto'] = new Chart(document.getElementById('rel-depto-chart').getContext('2d'), {
type: 'doughnut',
data: { labels: Object.keys(deptoCount), datasets: [{ data: Object.values(deptoCount), backgroundColor: Object.keys(deptoCount).map(function(_, i) { return DEPT_COLORS[i % DEPT_COLORS.length]; }), borderWidth: 0, hoverOffset: 10 }] },
options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#a0a0a0', font: { family: 'Poppins', size: 11 }, padding: 15, usePointStyle: true } } } }
});
}
let ativoFiltro = 'todos';
function renderAtivos() {
const assets = getData(SK.assets);
let filtered = assets;
if (ativoFiltro !== 'todos') filtered = assets.filter(function(a) { return a.status === ativoFiltro; });
const tbody = document.getElementById('ativos-table-body');
tbody.innerHTML = filtered.map(function(a) {
const observacao = a.observacao || '—';
let infoExtra = '—';
if (a.type === 'CL') {
infoExtra = `<span style="font-size: 11px;">Tel: ${a.telefone || '—'}<br>IMEI: ${a.imei || a.serial || '—'}</span>`;
} else if (a.type === 'NB') {
infoExtra = `<span style="font-size: 11px; font-family: monospace;">ST: ${a.serviceTag || '—'}</span>`;
}
let actions = `<button class="btn btn-outline btn-sm" onclick="mostrarDetalhesAtivo('${a.uid}')">Detalhes</button> <button class="btn btn-outline btn-sm" onclick="mostrarQR('${a.uid}')">QR</button>`;
if (a.status !== 'discarded') { actions += ' <button class="btn btn-status btn-sm" onclick="abrirModalStatus(\'' + a.id + '\')">⚙️ Status</button>'; }
if (a.status !== 'discarded') { actions += ' <button class="btn btn-discarded btn-sm" onclick="abrirModalDescartar(\'' + a.id + '\')">🗑️ Descartar</button>'; }
return '<tr><td class="uid-cell">' + a.uid + '</td><td>' + typeLabel(a.type) + '</td><td>' + a.brand + ' ' + a.model + '</td><td style="font-family: monospace; font-size: 12px;">' + a.serial + '</td><td>' + infoExtra + '</td><td><span class="badge badge-' + a.status + '">' + STATUS_LABELS[a.status] + '</span></td><td style="font-size: 11px; color: var(--text-secondary);">' + observacao + '</td><td><div class="btn-group">' + actions + '</div></td></tr>';
}).join('') || '<tr><td colspan="8" style="text-align:center; padding:30px; color: var(--text-muted);">Nenhum ativo encontrado</td></tr>';
}
function filtrarAtivos(filtro) { ativoFiltro = filtro; renderAtivos(); }
function abrirModalStatus(assetId) {
assetParaAlterarStatus = assetId;
const assets = getData(SK.assets);
const asset = assets.find(function(a) { return a.id === assetId; });
document.getElementById('modal-status-uid').textContent = asset.uid;
document.getElementById('novo-status').value = asset.status;
document.getElementById('modal-status').classList.add('active');
}
function confirmarAlteracaoStatus() {
const novoStatus = document.getElementById('novo-status').value;
const assets = getData(SK.assets);
const asset = assets.find(function(a) { return a.id === assetParaAlterarStatus; });
if (asset) {
const statusAntigo = asset.status;
asset.status = novoStatus;
saveData(SK.assets, assets);
addLog('Status Alterado', 'Ativo ' + asset.uid + ' teve status alterado de ' + STATUS_LABELS[statusAntigo] + ' para ' + STATUS_LABELS[novoStatus], 'alteracao');
showToast('Status alterado para ' + STATUS_LABELS[novoStatus] + '!');
fecharModal('modal-status');
renderAtivos();
}
}
function abrirModalDescartar(assetId) {
assetParaDescartar = assetId;
const assets = getData(SK.assets);
const asset = assets.find(function(a) { return a.id === assetId; });
document.getElementById('descartar-ativo-uid').value = asset.uid + ' - ' + asset.brand + ' ' + asset.model;
document.getElementById('descartar-motivo').value = '';
document.getElementById('modal-descartar').classList.add('active');
}
function confirmarDescartarAtivo() {
const motivo = document.getElementById('descartar-motivo').value.trim();
if (!motivo) { alert('Por favor, informe o motivo do descarte.'); return; }
const assets = getData(SK.assets);
const asset = assets.find(function(a) { return a.id === assetParaDescartar; });
if (asset) {
asset.status = 'discarded';
asset.observacao = motivo;
saveData(SK.assets, assets);
addLog('Ativo Descartado', 'Ativo ' + asset.uid + ' (' + asset.brand + ' ' + asset.model + ') foi descartado. Motivo: ' + motivo, 'descarte');
showToast('Ativo descartado com sucesso!');
fecharModal('modal-descartar');
renderAtivos();
}
}
function cadastrarAtivo(e) {
e.preventDefault();
try {
const tipo = document.getElementById('cad-tipo').value;
const marca = document.getElementById('cad-marca').value.trim();
const modelo = document.getElementById('cad-modelo').value.trim();
const serial = document.getElementById('cad-serial').value.trim();
const valor = 0;
if (!tipo || !marca || !modelo || !serial) { showToast('Por favor, preencha todos os campos obrigatórios'); return; }
const year = new Date().getFullYear();
const assets = getData(SK.assets);
const numeroSequencial = gerarNumeroSequencial(tipo);
const uid = 'VP-' + tipo + '-' + year + '-' + numeroSequencial;
assets.push({ id: 'a' + Date.now(), uid: uid, type: tipo, brand: marca, model: modelo, serial: serial, status: 'available', valor: valor, observacao: '', created_at: new Date().toISOString() });
saveData(SK.assets, assets);
addLog('Ativo Cadastrado', 'Novo ativo cadastrado: ' + uid + ' - ' + marca + ' ' + modelo, 'cadastro');
showToast('Ativo ' + uid + ' cadastrado com sucesso!');
document.getElementById('form-ativo').reset();
renderAtivos();
} catch (error) { console.error('Erro ao cadastrar ativo:', error); showToast('Erro ao cadastrar ativo. Tente novamente.'); }
}
function atualizarDropdownsColaborador() {
const deptos = getData(SK.departamentos);
const cargos = getData(SK.cargos);
const deptoSelect = document.getElementById('col-depto');
deptoSelect.innerHTML = '<option value="">Selecione...</option>' + deptos.map(function(d) { return '<option value="' + d + '">' + d + '</option>'; }).join('');
const cargoSelect = document.getElementById('col-cargo');
cargoSelect.innerHTML = '<option value="">Selecione...</option>' + cargos.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
const editarDeptoSelect = document.getElementById('editar-colab-depto');
editarDeptoSelect.innerHTML = '<option value="">Selecione...</option>' + deptos.map(function(d) { return '<option value="' + d + '">' + d + '</option>'; }).join('');
const editarCargoSelect = document.getElementById('editar-colab-cargo');
editarCargoSelect.innerHTML = '<option value="">Selecione...</option>' + cargos.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
}
let colabFiltro = 'todos';
function renderColaboradores() {
atualizarDropdownsColaborador();
const employees = getData(SK.employees);
let filtered = employees;
if (colabFiltro === 'active') filtered = employees.filter(function(e) { return e.status === 'active'; });
if (colabFiltro === 'inactive') filtered = employees.filter(function(e) { return e.status === 'inactive'; });
const tbody = document.getElementById('colab-table-body');
tbody.innerHTML = filtered.map(function(e) {
const badgeClass = e.status === 'active' ? 'active' : 'inactive';
const badgeLabel = e.status === 'active' ? 'Ativo' : 'Inativo';
let actions = '';
if (e.status === 'active') { actions += '<button class="btn btn-warning-outline btn-sm" onclick="abrirModalInativarColab(' + e.id + ', \'' + e.name + '\')">Inativar</button>'; }
else { actions += '<button class="btn btn-success-outline btn-sm" onclick="reativarColaborador(' + e.id + ')">Ativar</button>'; }
actions += ' <button class="btn btn-danger-outline btn-sm" onclick="excluirColaborador(' + e.id + ')">Excluir</button>';
return '<tr><td><strong>' + e.name + '</strong></td><td>' + e.email + '</td><td>' + e.depto + '</td><td>' + e.cargo + '</td><td><span class="badge badge-' + badgeClass + '">' + badgeLabel + '</span></td><td><div class="btn-group">' + actions + '</div></td></tr>';
}).join('') || '<tr><td colspan="6" style="text-align:center; padding:30px; color: var(--text-muted);">Nenhum colaborador encontrado</td></tr>';
}
function filtrarColaboradores(filtro) { colabFiltro = filtro; renderColaboradores(); }
function renderMeusDispositivos() {
const tbody = document.getElementById('meus-dispositivos-table-body');
if (!tbody) return;
if (!currentUser || !currentUser.employee_id) {
tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color: var(--text-muted);">Nenhum colaborador vinculado a este usuário. Contate o administrador.</td></tr>';
return;
}
const allocations = getData(SK.allocations).filter(function(al) { return al.employee_id == currentUser.employee_id && al.status === 'active'; });
if (allocations.length === 0) {
tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color: var(--text-muted);">Nenhum dispositivo alocado para você no momento</td></tr>';
return;
}
const assets = getData(SK.assets);
tbody.innerHTML = allocations.map(function(al) {
const asset = assets.find(function(a) { return a.uid === al.asset_uid; });
if (!asset) return '';
return '<tr><td>' + typeLabel(asset.type) + '</td><td>' + asset.brand + ' ' + asset.model + '</td><td>' + asset.serial + '</td><td class="uid-cell">' + asset.uid + '</td><td>' + new Date(al.date).toLocaleDateString('pt-BR') + '</td><td>' + '<span class="badge badge-' + asset.status + '">' + (STATUS_LABELS[asset.status] || asset.status) + '</span>' + '</td></tr>';
}).join('') || '<tr><td colspan="6" style="text-align:center; padding:30px; color: var(--text-muted);">Nenhum dispositivo alocado para você no momento</td></tr>';
}
function cadastrarColaborador(e) {
e.preventDefault();
try {
const name = document.getElementById('col-nome').value.trim();
const email = document.getElementById('col-email').value.trim().toLowerCase();
const depto = document.getElementById('col-depto').value;
const cargo = document.getElementById('col-cargo').value;
if (!name || !email || !depto || !cargo) { showToast('Por favor, preencha todos os campos obrigatórios'); return; }
const employees = getData(SK.employees);
if (employees.some(function(emp) { return emp.email.toLowerCase() === email; })) { showToast('Já existe um colaborador cadastrado com este e-mail.'); return; }
const usuarios = getData(SK.usuarios);
if (usuarios.some(function(u) { return u.username.toLowerCase() === email; })) { showToast('Já existe um usuário cadastrado com este e-mail.'); return; }
const novoId = Date.now();
employees.push({ id: novoId, name: name, email: email, depto: depto, cargo: cargo, status: 'active', created_at: new Date().toISOString() });
saveData(SK.employees, employees);
addLog('Colaborador Cadastrado', 'Novo colaborador cadastrado: ' + name + ' (' + depto + ' - ' + cargo + ')', 'cadastro');
// Cria automaticamente o acesso de usuário (Usuário Comum) vinculado a este colaborador
const senhaGerada = gerarSenhaAleatoria();
usuarios.push({ username: email, password: senhaGerada, role: 'user', name: name, employee_id: novoId });
saveData(SK.usuarios, usuarios);
addLog('Usuário Cadastrado', 'Acesso ao sistema criado automaticamente para o colaborador "' + name + '" (login: ' + email + ')', 'cadastro');
showToast('Colaborador cadastrado com sucesso!');
document.getElementById('form-colab').reset();
renderColaboradores();
alert('Colaborador cadastrado e acesso ao sistema criado automaticamente!\n\nLogin: ' + email + '\nSenha provisória: ' + senhaGerada + '\n\nAnote e repasse essa senha ao colaborador. Ela não será exibida novamente.');
} catch (error) { console.error('Erro ao cadastrar colaborador:', error); showToast('Erro ao cadastrar colaborador. Tente novamente.'); }
}
function abrirModalEditarColab(id) {
if (!currentUser || currentUser.role !== 'admin') { showToast('Apenas administradores podem editar colaboradores, pela seção de Configurações.'); return; }
const employees = getData(SK.employees);
const emp = employees.find(function(e) { return e.id === id; });
if (emp) {
colabParaEditar = id;
document.getElementById('editar-colab-nome').value = emp.name;
document.getElementById('editar-colab-email').value = emp.email;
document.getElementById('editar-colab-depto').value = emp.depto;
document.getElementById('editar-colab-cargo').value = emp.cargo;
document.getElementById('modal-editar-colab').classList.add('active');
}
}
function confirmarEditarColaborador() {
if (!currentUser || currentUser.role !== 'admin') { showToast('Apenas administradores podem editar colaboradores.'); return; }
if (!colabParaEditar) return;
const novoDepto = document.getElementById('editar-colab-depto').value;
const novoCargo = document.getElementById('editar-colab-cargo').value;
if (!novoDepto || !novoCargo) { showToast('Por favor, selecione departamento e cargo'); return; }
const employees = getData(SK.employees);
const emp = employees.find(function(e) { return e.id === colabParaEditar; });
if (emp) {
const deptoAntigo = emp.depto;
const cargoAntigo = emp.cargo;
emp.depto = novoDepto;
emp.cargo = novoCargo;
saveData(SK.employees, employees);
addLog('Colaborador Editado', 'Colaborador ' + emp.name + ' teve departamento alterado de ' + deptoAntigo + ' para ' + novoDepto + ' e cargo de ' + cargoAntigo + ' para ' + novoCargo, 'alteracao');
showToast('Colaborador atualizado com sucesso!');
fecharModal('modal-editar-colab');
renderColaboradores();
}
}
function abrirModalInativarColab(id, nome) {
document.getElementById('inativar-colab-nome').value = nome;
document.getElementById('inativar-colab-motivo').value = '';
document.getElementById('modal-inativar-colab').classList.add('active');
document.getElementById('modal-inativar-colab').dataset.colabId = id;
}
function confirmarInativarColab() {
const motivo = document.getElementById('inativar-colab-motivo').value.trim();
if (!motivo) { alert('Por favor, informe o motivo da inativação.'); return; }
const id = parseInt(document.getElementById('modal-inativar-colab').dataset.colabId);
const employees = getData(SK.employees);
const emp = employees.find(function(e) { return e.id === id; });
if (emp) {
emp.status = 'inactive';
emp.observacao = motivo;
saveData(SK.employees, employees);
const usuarios = getData(SK.usuarios);
const usuariosRestantes = usuarios.filter(function(u) { return u.employee_id !== id; });
if (usuariosRestantes.length !== usuarios.length) { saveData(SK.usuarios, usuariosRestantes); addLog('Acesso Revogado', 'Acesso ao sistema do colaborador ' + emp.name + ' foi revogado devido à inativação', 'inativacao'); }
addLog('Colaborador Inativado', 'Colaborador ' + emp.name + ' foi inativado. Motivo: ' + motivo, 'inativacao');
showToast('Colaborador inativado com sucesso');
fecharModal('modal-inativar-colab');
renderColaboradores();
}
}
function reativarColaborador(id) {
if (!confirm('Deseja reativar este colaborador?')) return;
const employees = getData(SK.employees);
const emp = employees.find(function(e) { return e.id === id; });
if (emp) {
emp.status = 'active';
delete emp.observacao;
saveData(SK.employees, employees);
addLog('Colaborador Reativado', 'Colaborador ' + emp.name + ' foi reativado', 'alteracao');
showToast('Colaborador reativado com sucesso. Caso o acesso ao sistema tenha sido revogado, cadastre um novo usuário em Configurações.');
renderColaboradores();
}
}
function excluirColaborador(id) {
if (!confirm('Confirmar exclusão do colaborador?')) return;
const allocations = getData(SK.allocations).filter(function(al) { return al.employee_id === id && al.status === 'active'; });
if (allocations.length > 0) { alert('Este colaborador possui alocações ativas. Desaloque os ativos antes de excluir.'); return; }
const employees = getData(SK.employees);
const emp = employees.find(function(e) { return e.id === id; });
saveData(SK.employees, employees.filter(function(e) { return e.id !== id; }));
const usuarios = getData(SK.usuarios);
saveData(SK.usuarios, usuarios.filter(function(u) { return u.employee_id !== id; }));
addLog('Colaborador Excluído', 'Colaborador ' + emp.name + ' foi excluído do sistema, junto com seu acesso ao sistema', 'exclusao');
showToast('Colaborador excluído');
renderColaboradores();
}
function renderAlocacoes() {
const employees = getData(SK.employees).filter(function(e) { return e.status === 'active'; });
const assets = getData(SK.assets).filter(function(a) { return a.status === 'available'; });
const allocations = getData(SK.allocations).filter(function(al) { return al.status === 'active'; });
document.getElementById('alloc-emp').innerHTML = '<option value="">Selecione...</option>' + employees.map(function(e) { return '<option value="' + e.id + '">' + e.name + ' - ' + e.depto + '</option>'; }).join('');
document.getElementById('alloc-asset').innerHTML = '<option value="">Selecione...</option>' + assets.map(function(a) { return '<option value="' + a.uid + '">' + a.uid + ' - ' + a.brand + ' ' + a.model + '</option>'; }).join('');
const tbody = document.getElementById('alloc-table-body');
tbody.innerHTML = allocations.map(function(al) {
const emp = employees.find(function(e) { return e.id == al.employee_id; });
return '<tr><td><strong>' + (emp ? emp.name : 'N/A') + '</strong></td><td>' + (emp ? emp.depto : 'N/A') + '</td><td class="uid-cell">' + al.asset_uid + '</td><td>' + new Date(al.date).toLocaleDateString('pt-BR') + '</td><td><span class="badge badge-assigned">Alocado</span></td><td><button class="btn btn-revert-outline btn-sm" onclick="desalocarAtivo(\'' + al.id + '\')">Desalocar</button></td></tr>';
}).join('') || '<tr><td colspan="6" style="text-align:center; padding:30px; color: var(--text-muted);">Nenhuma alocação ativa</td></tr>';
}
function alocarAtivo() {
const empId = document.getElementById('alloc-emp').value;
const assetUid = document.getElementById('alloc-asset').value;
if (!empId || !assetUid) { showToast('Selecione colaborador e ativo'); return; }
let assets = getData(SK.assets);
const asset = assets.find(function(a) { return a.uid === assetUid; });
if (asset) { asset.status = 'assigned'; saveData(SK.assets, assets); }
const allocations = getData(SK.allocations);
allocations.push({ id: 'al' + Date.now(), employee_id: parseInt(empId), asset_uid: assetUid, date: new Date().toISOString(), status: 'active' });
saveData(SK.allocations, allocations);
addLog('Ativo Alocado', 'Ativo ' + assetUid + ' foi alocado para colaborador ID ' + empId, 'cadastro');
showToast('Alocação realizada com sucesso!');
renderAlocacoes();
}
// FUNÇÃO ALTERADA: abre o modal de devolução
function desalocarAtivo(allocationId) {
const allocations = getData(SK.allocations);
const alloc = allocations.find(function(a) { return a.id === allocationId; });
if (!alloc) return;

const assets = getData(SK.assets);
const asset = assets.find(function(a) { return a.uid === alloc.asset_uid; });

document.getElementById('devolucao-ativo-uid').value = alloc.asset_uid + (asset ? ' - ' + asset.brand + ' ' + asset.model : '');
document.getElementById('devolucao-condicao').value = 'integro';
document.getElementById('devolucao-obs').value = '';

allocParaDesalocar = allocationId;
document.getElementById('modal-devolucao').classList.add('active');
}

// NOVA FUNÇÃO: confirma a devolução e registra no histórico
function confirmarDevolucao() {
if (!allocParaDesalocar) return;

const condicao = document.getElementById('devolucao-condicao').value;
const obs = document.getElementById('devolucao-obs').value.trim();

const allocations = getData(SK.allocations);
const alloc = allocations.find(function(a) { return a.id === allocParaDesalocar; });

if (alloc) {
alloc.status = 'inactive';
saveData(SK.allocations, allocations);
let assets = getData(SK.assets);
const asset = assets.find(function(a) { return a.uid === alloc.asset_uid; });
if (asset) {
asset.status = (condicao === 'avariado') ? 'maintenance' : 'available';
if (obs) asset.observacao = obs;
saveData(SK.assets, assets);

// Registra automaticamente no histórico de ativos
const historico = getData(SK.assetHistory);
const employees = getData(SK.employees);
const emp = employees.find(function(e) { return e.id == alloc.employee_id; });

historico.push({
id: 'H' + Date.now(),
asset_uid: asset.uid,
asset_desc: asset.brand + ' ' + asset.model,
usuario_anterior: emp ? emp.name : 'Desconhecido',
condicao: condicao,
tipo: 'desalocacao',
parecer: 'Equipamento devolvido e desalocado. Condição: ' + (condicao === 'avariado' ? 'Avariado' : 'Íntegro') + '. ' + (obs ? 'Obs: ' + obs : ''),
foto: null,
autor: currentUser.name,
autor_role: currentUser.role,
origem: 'manual',
created_at: new Date().toISOString()
});
saveData(SK.assetHistory, historico);

addLog('Ativo Desalocado', 'Ativo ' + alloc.asset_uid + ' foi desalocado. Condição: ' + condicao, 'alteracao');
showToast('Devolução registrada com sucesso!');
}

fecharModal('modal-devolucao');
allocParaDesalocar = null;
renderAlocacoes();
}
}
function mostrarQR(uid) {
document.getElementById('modal-qr-uid').textContent = uid;
const container = document.getElementById('qr-container');
container.innerHTML = '';
new QRCode(container, { text: window.location.origin + '?uid=' + uid, width: 200, height: 200, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
document.getElementById('modal-qr').classList.add('active');
}
function fecharModal(id) { document.getElementById(id).classList.remove('active'); }
function copiarQR() {
const container = document.getElementById('qr-container');
const canvas = container.querySelector('canvas');
const img = container.querySelector('img');
if (!canvas && !img) { showToast('QR Code não encontrado'); return; }
let imageSource;
if (canvas) { imageSource = canvas.toDataURL('image/png'); }
else { imageSource = img.src; }
fetch(imageSource).then(function(res) { return res.blob(); }).then(function(blob) {
navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function() { showToast('✅ QR Code copiado!'); }).catch(function(err) { console.error('Erro ao copiar:', err); showToast('❌ Não foi possível copiar.'); });
}).catch(function(err) { console.error('Erro:', err); showToast('❌ Erro ao processar imagem'); });
}
function imprimirQR() {
const uid = document.getElementById('modal-qr-uid').textContent;
const container = document.getElementById('qr-container');
const canvas = container.querySelector('canvas');
const img = container.querySelector('img');
const imgData = canvas ? canvas.toDataURL() : (img ? img.src : '');
const printWindow = window.open('', '', 'width=400,height=500');
printWindow.document.write('<html><head><title>Etiqueta ' + uid + '</title><style>body { font-family: Arial; text-align: center; padding: 20px; background: #ffffff; color: #000000; } .label { border: 2px solid #000000; padding: 20px; display: inline-block; background: #ffffff; } .uid { font-family: monospace; font-size: 16px; font-weight: bold; margin-top: 15px; color: #000000; }</style></head><body><div class="label">' + (imgData ? '<img src="' + imgData + '" width="200" height="200">' : '') + '<div class="uid">' + uid + '</div></div><script>setTimeout(function(){window.print();},300)<\/script></body></html>');
printWindow.document.close();
}
function exportarPDF(tipo) {
const jsPDF = window.jspdf.jsPDF;
const doc = new jsPDF();
const assets = getData(SK.assets);
const filtered = aplicarFiltrosRelatorioLogic(assets);
doc.setFillColor(10, 10, 10); doc.rect(0, 0, 210, 40, 'F');
doc.setFillColor(255, 206, 5); doc.rect(0, 40, 210, 3, 'F');
doc.setTextColor(255, 206, 5); doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
doc.text('ASSET MANAGER - RELATÓRIO', 15, 22);
doc.setTextColor(160, 160, 160); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
doc.text('Emitido em: ' + new Date().toLocaleString('pt-BR'), 15, 32);
doc.text('Registros: ' + filtered.length + ' de ' + assets.length, 15, 38);
doc.autoTable({
startY: 50,
head: [['UID', 'Tipo', 'Marca/Modelo', 'Serial', 'Colaborador', 'Depto', 'Status']],
body: filtered.map(function(a) { const alloc = getData(SK.allocations).find(function(al) { return al.asset_uid === a.uid && al.status === 'active'; }); const emp = alloc ? getData(SK.employees).find(function(e) { return e.id == alloc.employee_id; }) : null; return [a.uid, typeLabel(a.type), a.brand + ' ' + a.model, a.serial, emp ? emp.name : '—', emp ? emp.depto : '—', STATUS_LABELS[a.status]]; }),
theme: 'striped', headStyles: { fillColor: [10, 10, 10], textColor: [255, 206, 5], fontStyle: 'bold' }, styles: { font: 'helvetica', fontSize: 8 }
});
doc.save('asset_manager_' + tipo + '_' + new Date().toISOString().split('T')[0] + '.pdf');
showToast('PDF exportado com sucesso!');
}
function exportarExcel() {
const assets = getData(SK.assets);
const filtered = aplicarFiltrosRelatorioLogic(assets);
const csv = [['UID', 'Tipo', 'Marca', 'Modelo', 'Serial', 'Colaborador', 'Departamento', 'Status', 'Valor']];
filtered.forEach(function(a) {
const alloc = getData(SK.allocations).find(function(al) { return al.asset_uid === a.uid && al.status === 'active'; });
const emp = alloc ? getData(SK.employees).find(function(e) { return e.id == alloc.employee_id; }) : null;
csv.push([a.uid, typeLabel(a.type), a.brand, a.model, a.serial, emp ? emp.name : '', emp ? emp.depto : '', STATUS_LABELS[a.status], a.valor || 0]);
});
const csvText = csv.map(function(row) { return row.join(';'); }).join('\n');
const blob = new Blob(['\ufeff' + csvText], { type: 'text/csv;charset=utf-8;' });
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = 'asset_manager_' + new Date().toISOString().split('T')[0] + '.csv';
link.click();
showToast('Excel exportado com sucesso!');
}
function typeLabel(t) { const map = {NB:'Notebook',DK:'Desktop',MN:'Monitor',CL:'Celular',TB:'Tablet',KB:'Teclado',MS:'Mouse',PR:'Impressora',OT:'Outro'}; return map[t] || t; }
function showToast(msg) {
const existing = document.querySelector('.toast');
if (existing) existing.remove();
const toast = document.createElement('div');
toast.className = 'toast';
toast.textContent = msg;
document.body.appendChild(toast);
setTimeout(function() { toast.style.animation = 'slideOut 0.3s ease forwards'; setTimeout(function() { toast.remove(); }, 300); }, 3000);
}
function renderSuporte() {
if (currentUser && currentUser.role === 'tecnico') {
showSuporteView('meus-atendimentos', document.getElementById('btn-tab-meus-atendimentos'));
} else {
showSuporteView('meus-chamados', document.getElementById('btn-tab-meus-chamados'));
}
}
function showSuporteView(view, btn) {
if (currentUser && currentUser.role === 'user' && ['dashboard-suporte', 'painel-tecnico', 'meus-atendimentos', 'lixeira'].includes(view)) {
showToast('Acesso restrito para o perfil Usuário Comum');
view = 'meus-chamados';
btn = document.getElementById('btn-tab-meus-chamados');
}
document.querySelectorAll('.suporte-view').forEach(function(v) { v.style.display = 'none'; });
document.getElementById('view-' + view).style.display = 'block';
document.querySelectorAll('.suporte-tab').forEach(function(t) { t.classList.remove('active'); });
if (btn) btn.classList.add('active');
if (view === 'meus-chamados') renderMeusChamados();
if (view === 'novo-chamado') popularColaboradoresChamado();
if (view === 'base-conhecimento') renderBaseConhecimento();
if (view === 'dashboard-suporte') renderDashboardSuporte();
if (view === 'painel-tecnico') renderPainelTecnico();
if (view === 'meus-atendimentos') renderMeusAtendimentos();
if (view === 'lixeira') renderLixeira();
}
function popularColaboradoresChamado() {
const employees = getData(SK.employees).filter(function(e) { return e.status === 'active'; });
const select = document.getElementById('chamado-colaborador');
select.innerHTML = '<option value="">Selecione o colaborador...</option>' +
employees.map(function(e) { return '<option value="' + e.id + '">' + e.name + ' - ' + e.depto + '</option>'; }).join('');
if (currentUser && currentUser.role === 'user' && currentUser.employee_id) {
select.value = currentUser.employee_id;
select.disabled = true;
buscarEquipamentosColaborador();
} else {
select.disabled = false;
}
}
function buscarEquipamentosColaborador() {
const colaboradorId = document.getElementById('chamado-colaborador').value;
const container = document.getElementById('equipamentos-container');
if (!colaboradorId) { container.innerHTML = ''; document.getElementById('chamado-equipamento-uid').value = ''; return; }
const allocations = getData(SK.allocations).filter(function(al) { return al.employee_id == colaboradorId && al.status === 'active'; });
if (allocations.length === 0) { container.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 13px;">Nenhum equipamento alocado para este colaborador</div>'; document.getElementById('chamado-equipamento-uid').value = ''; return; }
const assets = getData(SK.assets);
const equipamentosEncontrados = [];
allocations.forEach(function(al) {
const asset = assets.find(function(a) { return a.uid === al.asset_uid; });
if (asset) { equipamentosEncontrados.push({ uid: asset.uid, descricao: asset.brand + ' ' + asset.model + ' (' + asset.serial + ')' }); }
});
if (equipamentosEncontrados.length === 0) { container.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 13px;">Nenhum equipamento encontrado</div>'; document.getElementById('chamado-equipamento-uid').value = ''; }
else if (equipamentosEncontrados.length === 1) {
const eq = equipamentosEncontrados[0];
container.innerHTML = '<div style="padding: 10px; background: var(--black-secondary); border-radius: 8px; font-size: 13px;">' + eq.descricao + '</div>';
document.getElementById('chamado-equipamento-uid').value = eq.uid;
} else {
let html = '<select id="equipamento-select" onchange="selecionarEquipamento(this.value)" style="width: 100%; padding: 10px; background: var(--black-tertiary); border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--text-primary);">';
html += '<option value="">Selecione o equipamento...</option>';
equipamentosEncontrados.forEach(function(eq) { html += '<option value="' + eq.uid + '">' + eq.uid + ' - ' + eq.descricao + '</option>'; });
html += '</select>';
container.innerHTML = html;
}
}
function selecionarEquipamento(uid) { document.getElementById('chamado-equipamento-uid').value = uid; }
function previewImagem(input) {
const preview = document.getElementById('imagem-preview');
if (input.files && input.files[0]) {
const reader = new FileReader();
reader.onload = function(e) { preview.innerHTML = '<img src="' + e.target.result + '" alt="Preview">'; preview.style.display = 'inline-block'; };
reader.readAsDataURL(input.files[0]);
}
}
function criarChamado(event) {
event.preventDefault();
let colaboradorId = document.getElementById('chamado-colaborador').value;
if (currentUser && currentUser.role === 'user') {
if (!currentUser.employee_id) { showToast('Nenhum colaborador vinculado a este usuário. Contate o administrador.'); return; }
colaboradorId = currentUser.employee_id;
}
const categoria = 'outros';
const prioridade = document.getElementById('chamado-prioridade').value;
const assetUid = document.getElementById('chamado-equipamento-uid').value || null;
const assunto = document.getElementById('chamado-assunto').value.trim();
const descricao = document.getElementById('chamado-descricao').value.trim();
const imagemInput = document.getElementById('chamado-imagem');
const employees = getData(SK.employees);
const colaborador = employees.find(function(e) { return e.id == colaboradorId; });
if (!colaborador) { showToast('Colaborador não encontrado'); return; }
const finalizarCriacao = function(imagemData) {
const tickets = JSON.parse(localStorage.getItem(SK.tickets) || '[]');
const ticketNumber = tickets.length + 1;
const ticketId = 'TK-' + String(ticketNumber).padStart(3, '0');
const slaHours = PRIORIDADES_CHAMADO[prioridade].sla;
const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();
const newTicket = { id: ticketId, requester_id: colaboradorId, requester_name: colaborador.name, category: categoria, priority: prioridade, status: 'novo', subject: assunto, description: descricao, asset_uid: assetUid, imagem: imagemData, sla_due_at: slaDueAt, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
tickets.push(newTicket);
localStorage.setItem(SK.tickets, JSON.stringify(tickets));
addLog('Chamado Aberto', 'Novo chamado ' + ticketId + ' aberto por ' + colaborador.name + ': ' + assunto, 'chamado');
showToast('Chamado aberto com sucesso!');
document.getElementById('form-novo-chamado').reset();
document.getElementById('equipamentos-container').innerHTML = '';
document.getElementById('imagem-preview').style.display = 'none';
showSuporteView('meus-chamados', document.getElementById('btn-tab-meus-chamados'));
};
if (imagemInput.files && imagemInput.files[0]) {
const reader = new FileReader();
reader.onload = function(e) { finalizarCriacao(e.target.result); };
reader.readAsDataURL(imagemInput.files[0]);
} else { finalizarCriacao(null); }
}
function renderMeusChamados() {
const tickets = JSON.parse(localStorage.getItem(SK.tickets) || '[]');
const meusTickets = tickets.filter(function(t) {
if (currentUser.employee_id) { return t.requester_id == currentUser.employee_id; }
return t.requester_id == currentUser.username || t.requester_name === currentUser.name;
});
let ticketsFiltrados = meusTickets;
if (filtroMeusChamados === 'abertos') { ticketsFiltrados = meusTickets.filter(function(t) { return !['resolvido', 'fechado'].includes(t.status); }); }
else if (filtroMeusChamados === 'resolvidos') { ticketsFiltrados = meusTickets.filter(function(t) { return ['resolvido', 'fechado'].includes(t.status); }); }
const container = document.getElementById('meus-chamados-list');
if (ticketsFiltrados.length === 0) { container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">Nenhum chamado encontrado</div>'; return; }
container.innerHTML = ticketsFiltrados.map(function(ticket) {
const prioridade = PRIORIDADES_CHAMADO[ticket.priority];
const status = STATUS_CHAMADO[ticket.status];
const dataCriacao = new Date(ticket.created_at).toLocaleString('pt-BR');
return '<div class="ticket-card" onclick="verDetalhesChamado(\'' + ticket.id + '\')"><div class="ticket-header"><div><div class="ticket-id">' + ticket.id + '</div><div class="ticket-subject">' + ticket.subject + '</div></div><div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;"><span class="badge ' + status.class + '">' + status.label + '</span><span class="badge" style="background: rgba(255, 206, 5, 0.1); color: var(--gold-primary); border: 1px solid var(--border-gold);">' + prioridade.label + '</span></div></div><div class="ticket-meta"><div class="ticket-meta-item">📅 ' + dataCriacao + '</div>' + getSlaIndicator(ticket) + '</div></div>';
}).join('');
}
function getSlaIndicator(ticket) {
const slaDate = new Date(ticket.sla_due_at);
const now = new Date();
const diffHours = (slaDate - now) / (1000 * 60 * 60);
if (['resolvido', 'fechado'].includes(ticket.status)) { return '<span style="color: #10b981; font-size: 11px;">✓ Concluído</span>'; }
if (diffHours <= 0) { return '<span style="color: #dc2626; font-size: 11px;">⚠️ SLA Expirado</span>'; }
else if (diffHours <= 4) { return '<span style="color: #f59e0b; font-size: 11px;">⏰ ' + Math.round(diffHours) + 'h restantes</span>'; }
else { return '<span style="color: #10b981; font-size: 11px;">✓ ' + Math.round(diffHours) + 'h restantes</span>'; }
}
function filtrarMeusChamados(filter) { filtroMeusChamados = filter; renderMeusChamados(); }
function renderMeusAtendimentos() {
const tickets = JSON.parse(localStorage.getItem(SK.tickets) || '[]');
let ticketsFiltrados;
if (filtroMeusAtendimentos === 'atendidos') {
ticketsFiltrados = tickets.filter(function(t) { return t.atendido_por === currentUser.username; });
} else {
ticketsFiltrados = tickets.filter(function(t) { return !['resolvido', 'fechado'].includes(t.status) && (!t.atendido_por || t.atendido_por === currentUser.username); });
}
const container = document.getElementById('meus-atendimentos-list');
if (ticketsFiltrados.length === 0) { container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">Nenhum chamado encontrado</div>'; return; }
container.innerHTML = ticketsFiltrados.map(function(ticket) {
const prioridade = PRIORIDADES_CHAMADO[ticket.priority];
const status = STATUS_CHAMADO[ticket.status];
const atendente = ticket.atendido_por_nome ? '<div class="ticket-meta-item">🔧 Atendido por: ' + ticket.atendido_por_nome + '</div>' : '<div class="ticket-meta-item">🔧 Aguardando atendimento</div>';
return '<div class="ticket-card" onclick="verDetalhesChamado(\'' + ticket.id + '\')"><div class="ticket-header"><div><div class="ticket-id">' + ticket.id + '</div><div class="ticket-subject">' + ticket.subject + '</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Solicitante: ' + ticket.requester_name + '</div></div><div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;"><span class="badge ' + status.class + '">' + status.label + '</span><span class="badge" style="background: rgba(255, 206, 5, 0.1); color: var(--gold-primary); border: 1px solid var(--border-gold);">' + prioridade.label + '</span></div></div><div class="ticket-meta"><div class="ticket-meta-item">📅 ' + new Date(ticket.created_at).toLocaleString('pt-BR') + '</div>' + atendente + '</div></div>';
}).join('');
}
function filtrarMeusAtendimentos(filter) { filtroMeusAtendimentos = filter; renderMeusAtendimentos(); }
function assumirAtendimento(ticketId) {
const tickets = JSON.parse(localStorage.getItem(SK.tickets) || '[]');
const ticket = tickets.find(function(t) { return t.id === ticketId; });
if (ticket) {
ticket.atendido_por = currentUser.username;
ticket.atendido_por_nome = currentUser.name;
if (ticket.status === 'novo') ticket.status = 'andamento';
ticket.updated_at = new Date().toISOString();
localStorage.setItem(SK.tickets, JSON.stringify(tickets));
addLog('Atendimento Assumido', 'Chamado ' + ticketId + ' foi assumido por ' + currentUser.name, 'chamado');
showToast('Atendimento assumido com sucesso');
verDetalhesChamado(ticketId);
if (document.getElementById('view-meus-atendimentos').style.display !== 'none') { renderMeusAtendimentos(); }
}
}
function encerrarChamadoTecnico(ticketId) {
if (!confirm('Confirmar encerramento deste chamado?')) return;
const tickets = JSON.parse(localStorage.getItem(SK.tickets) || '[]');
const ticket = tickets.find(function(t) { return t.id === ticketId; });
if (ticket) {
ticket.status = 'fechado';
ticket.atendido_por = currentUser.username;
ticket.atendido_por_nome = currentUser.name;
ticket.updated_at = new Date().toISOString();
ticket.resolved_at = new Date().toISOString();
localStorage.setItem(SK.tickets, JSON.stringify(tickets));
addLog('Chamado Encerrado', 'Chamado ' + ticketId + ' foi encerrado por ' + currentUser.name, 'chamado');
showToast('Chamado encerrado com sucesso');
verDetalhesChamado(ticketId);
if (document.getElementById('view-meus-atendimentos').style.display !== 'none') { renderMeusAtendimentos(); }
}
}
function verDetalhesChamado(ticketId) {
const tickets = JSON.parse(localStorage.getItem(SK.tickets) || '[]');
const ticket = tickets.find(function(t) { return t.id === ticketId; });
if (!ticket) return;
if (currentUser && currentUser.role === 'user') {
const ehDono = currentUser.employee_id ? (ticket.requester_id == currentUser.employee_id) : (ticket.requester_name === currentUser.name);
if (!ehDono) { showToast('Você só pode visualizar seus próprios chamados.'); return; }
}
const comments = JSON.parse(localStorage.getItem(SK.comments) || '[]');
let ticketComments = comments.filter(function(c) { return c.ticket_id === ticketId; });
if (currentUser && currentUser.role === 'user') { ticketComments = ticketComments.filter(function(c) { return !c.is_internal; }); }
const prioridade = PRIORIDADES_CHAMADO[ticket.priority];
const status = STATUS_CHAMADO[ticket.status];
const isAdmin = currentUser && currentUser.role === 'admin';
const isTecnico = currentUser && currentUser.role === 'tecnico';
let equipamentoHtml = '';
if (ticket.asset_uid) {
const assets = getData(SK.assets);
const asset = assets.find(function(a) { return a.uid === ticket.asset_uid; });
if (asset) { equipamentoHtml = '<div style="margin-top: 16px;"><div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">EQUIPAMENTO RELACIONADO</div><div style="font-size: 13px; padding: 12px; background: var(--black-secondary); border-radius: 8px;"><span class="uid-cell">' + asset.uid + '</span><br>' + asset.brand + ' ' + asset.model + ' (' + asset.serial + ')</div></div>'; }
}
let imagemHtml = '';
if (ticket.imagem) { imagemHtml = '<div style="margin-top: 16px;"><div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">IMAGEM ANEXADA</div><div style="max-width: 400px; border-radius: 8px; overflow: hidden;"><img src="' + ticket.imagem + '" alt="Imagem do chamado" style="width: 100%; border-radius: 8px;"></div></div>'; }
let atendidoHtml = '';
if (ticket.atendido_por_nome) { atendidoHtml = '<div style="margin-top: 16px;"><div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">ATENDIDO POR</div><div style="font-size: 13px; padding: 12px; background: var(--black-secondary); border-radius: 8px;">' + ticket.atendido_por_nome + '</div></div>'; }
let excluirPanel = '';
if (isAdmin || isTecnico) {
excluirPanel = '<div style="margin-top: 20px; padding: 16px; background: var(--black-secondary); border-radius: 8px; border: 1px solid rgba(220, 38, 38, 0.3);"><div style="font-size: 13px; font-weight: 700; margin-bottom: 12px; color: #dc2626;">Zona de Risco</div><button class="btn btn-discarded btn-sm" onclick="excluirChamado(\'' + ticket.id + '\')">🗑️ Excluir Chamado</button><div style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">O chamado será movido para a Lixeira e removido definitivamente em até 90 dias.</div></div>';
}
let tecnicoPanel = '';
if (isTecnico) {
if (!['resolvido', 'fechado'].includes(ticket.status)) {
const btnAssumir = (ticket.atendido_por !== currentUser.username) ? '<button class="btn btn-secondary btn-sm" onclick="assumirAtendimento(\'' + ticket.id + '\')">Assumir Atendimento</button>' : '';
tecnicoPanel = '<div style="margin-top: 20px; padding: 16px; background: var(--black-secondary); border-radius: 8px;"><div style="font-size: 13px; font-weight: 700; margin-bottom: 12px; color: var(--gold-primary);">Atendimento</div><div style="display: flex; gap: 12px; flex-wrap: wrap;">' + btnAssumir + '<button class="btn btn-primary btn-sm" onclick="encerrarChamadoTecnico(\'' + ticket.id + '\')">Encerrar Chamado</button></div></div>';
} else {
tecnicoPanel = '<div style="margin-top: 20px; padding: 16px; background: var(--black-secondary); border-radius: 8px;"><div style="font-size: 13px; color: var(--text-muted);">Este chamado já foi encerrado.</div></div>';
}
}
const content = document.getElementById('chamado-detalhes-content');
content.innerHTML = '<div class="modal-title">' + ticket.subject + '</div><div class="modal-subtitle">' + ticket.id + '</div><div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 20px 0;"><div><div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">STATUS</div><span class="badge ' + status.class + '">' + status.label + '</span></div><div><div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">PRIORIDADE</div><span class="badge" style="background: rgba(255, 206, 5, 0.1); color: var(--gold-primary); border: 1px solid var(--border-gold);">' + prioridade.label + '</span></div><div><div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">SLA</div>' + getSlaIndicator(ticket) + '</div><div><div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">SOLICITANTE</div><div style="font-size: 13px; font-weight: 600;">' + ticket.requester_name + '</div></div><div><div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">DATA DE ABERTURA</div><div style="font-size: 13px;">' + new Date(ticket.created_at).toLocaleString('pt-BR') + '</div></div></div><div style="margin-top: 16px;"><div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">DESCRIÇÃO</div><div style="padding: 16px; background: var(--black-secondary); border-radius: 8px; line-height: 1.6;">' + ticket.description + '</div></div>' + equipamentoHtml + imagemHtml + atendidoHtml + excluirPanel + (isAdmin ? '<div style="margin-top: 20px; padding: 16px; background: var(--black-secondary); border-radius: 8px;"><div style="font-size: 13px; font-weight: 700; margin-bottom: 12px; color: var(--gold-primary);">Ações do Técnico</div><div style="display: flex; gap: 12px; flex-wrap: wrap;"><select id="change-status" style="flex: 1; min-width: 150px; padding: 8px; background: var(--black-tertiary); border: 1px solid var(--border-subtle); border-radius: 6px; color: var(--text-primary);"><option value="">Alterar Status...</option>' + Object.keys(STATUS_CHAMADO).map(function(s) { return '<option value="' + s + '"' + (ticket.status === s ? ' selected' : '') + '>' + STATUS_CHAMADO[s].label + '</option>'; }).join('') + '</select><button class="btn btn-primary btn-sm" onclick="alterarStatusChamado(\'' + ticket.id + '\')">Aplicar</button></div></div>' : '') + tecnicoPanel + '<div style="margin-top: 20px;"><div style="font-size: 13px; font-weight: 700; margin-bottom: 12px; color: var(--gold-primary);">Comentários (' + ticketComments.length + ')</div><div style="max-height: 300px; overflow-y: auto;">' + (ticketComments.length === 0 ? '<div style="text-align: center; padding: 20px; color: var(--text-muted);">Nenhum comentário ainda</div>' : ticketComments.map(function(comment) { return '<div class="comment-item' + (comment.is_internal ? ' internal' : '') + '"><div class="comment-header"><span class="comment-author">' + comment.author_name + '</span><span>' + new Date(comment.created_at).toLocaleString('pt-BR') + '</span></div><div class="comment-body">' + comment.body + (comment.is_internal ? '<span class="comment-internal-badge">Interno</span>' : '') + '</div></div>'; }).join('')) + '</div><div style="margin-top: 16px; padding: 16px; background: var(--black-secondary); border-radius: 8px;"><div style="font-size: 12px; font-weight: 700; margin-bottom: 8px;">Adicionar Comentário</div><textarea id="novo-comentario" placeholder="Digite seu comentário..." style="width: 100%; min-height: 80px; padding: 10px; background: var(--black-tertiary); border: 1px solid var(--border-subtle); border-radius: 6px; color: var(--text-primary); resize: vertical; font-family: \'Poppins\', sans-serif;"></textarea>' + (isAdmin ? '<div style="margin-top: 8px;"><label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;"><input type="checkbox" id="comentario-interno"><span>Comentário interno (não visível para o usuário)</span></label></div>' : '') + '<button class="btn btn-primary btn-sm" style="margin-top: 12px;" onclick="adicionarComentario(\'' + ticket.id + '\')">Enviar Comentário</button></div></div>';
document.getElementById('modal-chamado-detalhes').classList.add('active');
}
function alterarStatusChamado(ticketId) {
const newStatus = document.getElementById('change-status').value;
if (!newStatus) { showToast('Selecione um status'); return; }
const tickets = JSON.parse(localStorage.getItem(SK.tickets) || '[]');
const ticket = tickets.find(function(t) { return t.id === ticketId; });
if (ticket) {
const oldStatus = ticket.status;
ticket.status = newStatus;
ticket.updated_at = new Date().toISOString();
ticket.atendido_por = currentUser.username;
ticket.atendido_por_nome = currentUser.name;
if (newStatus === 'resolvido' || newStatus === 'fechado') { ticket.resolved_at = new Date().toISOString(); }
localStorage.setItem(SK.tickets, JSON.stringify(tickets));
addLog('Chamado Atualizado', 'Chamado ' + ticketId + ' teve status alterado de ' + STATUS_CHAMADO[oldStatus].label + ' para ' + STATUS_CHAMADO[newStatus].label, 'chamado');
showToast('Status atualizado com sucesso');
verDetalhesChamado(ticketId);
if (document.getElementById('view-painel-tecnico').style.display !== 'none') { renderPainelTecnico(); }
}
}
function adicionarComentario(ticketId) {
const commentText = document.getElementById('novo-comentario').value.trim();
if (!commentText) { showToast('Digite um comentário'); return; }
const isInternal = document.getElementById('comentario-interno') ? document.getElementById('comentario-interno').checked : false;
const comments = JSON.parse(localStorage.getItem(SK.comments) || '[]');
const newComment = { id: 'CMT-' + Date.now(), ticket_id: ticketId, author_id: currentUser.username, author_name: currentUser.name, body: commentText, is_internal: isInternal, created_at: new Date().toISOString() };
comments.push(newComment);
localStorage.setItem(SK.comments, JSON.stringify(comments));
addLog('Comentário Adicionado', 'Comentário adicionado ao chamado ' + ticketId + (isInternal ? ' (interno)' : ''), 'chamado');
showToast('Comentário adicionado');
verDetalhesChamado(ticketId);
}
function renderBaseConhecimento() {
const podeEditar = currentUser && (currentUser.role === 'admin' || currentUser.role === 'tecnico');
document.getElementById('btn-novo-artigo').style.display = podeEditar ? 'inline-block' : 'none';
const articles = JSON.parse(localStorage.getItem(SK.articles) || '[]');
const searchTerm = document.getElementById('kb-search') ? document.getElementById('kb-search').value.toLowerCase() : '';
const categoryFilter = document.getElementById('kb-categoria') ? document.getElementById('kb-categoria').value : 'todos';
let articlesFiltrados = articles;
if (searchTerm) { articlesFiltrados = articlesFiltrados.filter(function(a) { return a.title.toLowerCase().includes(searchTerm) || a.content.toLowerCase().includes(searchTerm) || a.tags.some(function(t) { return t.toLowerCase().includes(searchTerm); }); }); }
if (categoryFilter !== 'todos') { articlesFiltrados = articlesFiltrados.filter(function(a) { return a.category === categoryFilter; }); }
const container = document.getElementById('kb-articles-list');
if (articlesFiltrados.length === 0) { container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">Nenhum artigo encontrado</div>'; return; }
container.innerHTML = articlesFiltrados.map(function(article) {
let acoes = '';
if (podeEditar) {
acoes = '<div style="margin-top: 12px; display: flex; gap: 8px;" onclick="event.stopPropagation();">' +
'<button class="btn btn-outline btn-sm" onclick="abrirModalEditarArtigo(\'' + article.id + '\')">✏️ Editar</button>' +
'<button class="btn btn-danger-outline btn-sm" onclick="excluirArtigoKB(\'' + article.id + '\')">🗑️ Excluir</button>' +
'</div>';
}
return '<div class="article-card" onclick="verArtigo(\'' + article.id + '\')"><div class="article-title">' + article.title + '</div><div class="article-excerpt">' + article.content.substring(0, 150) + '...</div><div class="article-tags">' + article.tags.map(function(tag) { return '<span class="tag">' + tag + '</span>'; }).join('') + '</div><div style="margin-top: 12px; font-size: 11px; color: var(--text-muted);">👁️ ' + article.views + ' visualizações</div>' + acoes + '</div>';
}).join('');
}
function filtrarArtigos() { renderBaseConhecimento(); }
function verArtigo(articleId) {
const articles = JSON.parse(localStorage.getItem(SK.articles) || '[]');
const article = articles.find(function(a) { return a.id === articleId; });
if (!article) return;
article.views++;
localStorage.setItem(SK.articles, JSON.stringify(articles));
const podeEditar = currentUser && (currentUser.role === 'admin' || currentUser.role === 'tecnico');
const acoes = podeEditar ? '<div class="modal-actions" style="margin-top: 20px;"><button class="btn btn-outline" onclick="fecharModal(\'modal-artigo-detalhes\'); abrirModalEditarArtigo(\'' + article.id + '\')">✏️ Editar Artigo</button><button class="btn btn-danger-outline" onclick="excluirArtigoKB(\'' + article.id + '\')">🗑️ Excluir Artigo</button></div>' : '';
const content = document.getElementById('artigo-detalhes-content');
content.innerHTML = '<div class="modal-title">' + article.title + '</div><div style="margin: 16px 0; padding: 20px; background: var(--black-secondary); border-radius: 8px; line-height: 1.6;">' + article.content.replace(/\n/g, '<br>') + '</div><div class="article-tags" style="margin-top: 16px;">' + article.tags.map(function(tag) { return '<span class="tag">' + tag + '</span>'; }).join('') + '</div>' + acoes;
document.getElementById('modal-artigo-detalhes').classList.add('active');
}
// CRUD DE ARTIGOS DA BASE DE CONHECIMENTO (Admin e Técnico)
let artigoParaEditar = null;
function abrirModalNovoArtigo() {
if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'tecnico')) { showToast('Apenas Administradores e Técnicos podem criar artigos.'); return; }
artigoParaEditar = null;
document.getElementById('modal-editar-artigo-titulo').textContent = 'Novo Artigo';
document.getElementById('artigo-form-titulo').value = '';
document.getElementById('artigo-form-categoria').value = 'perifericos';
document.getElementById('artigo-form-conteudo').value = '';
document.getElementById('artigo-form-tags').value = '';
document.getElementById('modal-editar-artigo').classList.add('active');
}
function abrirModalEditarArtigo(articleId) {
if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'tecnico')) { showToast('Apenas Administradores e Técnicos podem editar artigos.'); return; }
const articles = JSON.parse(localStorage.getItem(SK.articles) || '[]');
const article = articles.find(function(a) { return a.id === articleId; });
if (!article) return;
artigoParaEditar = articleId;
document.getElementById('modal-editar-artigo-titulo').textContent = 'Editar Artigo';
document.getElementById('artigo-form-titulo').value = article.title;
document.getElementById('artigo-form-categoria').value = article.category;
document.getElementById('artigo-form-conteudo').value = article.content;
document.getElementById('artigo-form-tags').value = article.tags.join(', ');
document.getElementById('modal-editar-artigo').classList.add('active');
}
function salvarArtigoKB() {
if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'tecnico')) { showToast('Apenas Administradores e Técnicos podem salvar artigos.'); return; }
const titulo = document.getElementById('artigo-form-titulo').value.trim();
const categoria = document.getElementById('artigo-form-categoria').value;
const conteudo = document.getElementById('artigo-form-conteudo').value.trim();
const tags = document.getElementById('artigo-form-tags').value.split(',').map(function(t) { return t.trim(); }).filter(Boolean);
if (!titulo || !conteudo) { showToast('Preencha o título e o conteúdo do artigo.'); return; }
const articles = JSON.parse(localStorage.getItem(SK.articles) || '[]');
if (artigoParaEditar) {
const article = articles.find(function(a) { return a.id === artigoParaEditar; });
if (article) {
article.title = titulo;
article.category = categoria;
article.content = conteudo;
article.tags = tags;
addLog('Artigo Editado', 'Artigo "' + titulo + '" da Base de Conhecimento foi editado por ' + currentUser.name, 'alteracao');
}
} else {
articles.push({ id: 'kb' + Date.now(), title: titulo, category: categoria, content: conteudo, tags: tags, views: 0, autor: currentUser.name, created_at: new Date().toISOString() });
addLog('Artigo Criado', 'Novo artigo "' + titulo + '" foi adicionado à Base de Conhecimento por ' + currentUser.name, 'cadastro');
}
localStorage.setItem(SK.articles, JSON.stringify(articles));
showToast('Artigo salvo com sucesso!');
fecharModal('modal-editar-artigo');
fecharModal('modal-artigo-detalhes');
artigoParaEditar = null;
renderBaseConhecimento();
}
function excluirArtigoKB(articleId) {
if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'tecnico')) { showToast('Apenas Administradores e Técnicos podem excluir artigos.'); return; }
if (!confirm('Confirmar exclusão deste artigo da Base de Conhecimento?')) return;
const articles = JSON.parse(localStorage.getItem(SK.articles) || '[]');
const article = articles.find(function(a) { return a.id === articleId; });
localStorage.setItem(SK.articles, JSON.stringify(articles.filter(function(a) { return a.id !== articleId; })));
if (article) addLog('Artigo Excluído', 'Artigo "' + article.title + '" foi removido da Base de Conhecimento por ' + currentUser.name, 'exclusao');
showToast('Artigo excluído');
fecharModal('modal-artigo-detalhes');
renderBaseConhecimento();
}
function renderPainelTecnico() {
const tickets = JSON.parse(localStorage.getItem(SK.tickets) || '[]');
const abertos = tickets.filter(function(t) { return !['resolvido', 'fechado'].includes(t.status); }).length;
const slaProximo = tickets.filter(function(t) { if (['resolvido', 'fechado'].includes(t.status)) return false; const slaDate = new Date(t.sla_due_at); const now = new Date(); const diffHours = (slaDate - now) / (1000 * 60 * 60); return diffHours <= 4 && diffHours > 0; }).length;
const resolvidos7dias = tickets.filter(function(t) { if (t.status !== 'resolvido') return false; const resolvedDate = new Date(t.updated_at); const now = new Date(); const diffDays = (now - resolvedDate) / (1000 * 60 * 60 * 24); return diffDays <= 7; }).length;
const ticketsResolvidos = tickets.filter(function(t) { return t.status === 'resolvido'; });
let mttrTotal = 0;
ticketsResolvidos.forEach(function(t) { const created = new Date(t.created_at); const resolved = new Date(t.updated_at); mttrTotal += (resolved - created) / (1000 * 60 * 60); });
const mttr = ticketsResolvidos.length > 0 ? Math.round(mttrTotal / ticketsResolvidos.length) : 0;
document.getElementById('kpi-chamados-abertos').textContent = abertos;
document.getElementById('kpi-sla-proximo').textContent = slaProximo;
document.getElementById('kpi-resolvidos').textContent = resolvidos7dias;
document.getElementById('kpi-mttr').textContent = mttr + 'h';
renderFilaChamados();
}
function renderDashboardSuporte() {
const tickets = JSON.parse(localStorage.getItem(SK.tickets) || '[]');
const total = tickets.length;
const abertos = tickets.filter(function(t) { return !['resolvido', 'fechado'].includes(t.status); }).length;
const resolvidos = tickets.filter(function(t) { return ['resolvido', 'fechado'].includes(t.status); }).length;
const slaExpirado = tickets.filter(function(t) {
if (['resolvido', 'fechado'].includes(t.status)) return false;
return new Date(t.sla_due_at) < new Date();
}).length;
document.getElementById('sup-kpi-total').textContent = total;
document.getElementById('sup-kpi-abertos').textContent = abertos;
document.getElementById('sup-kpi-resolvidos').textContent = resolvidos;
document.getElementById('sup-kpi-sla').textContent = slaExpirado;
const statusCount = {};
Object.keys(STATUS_CHAMADO).forEach(function(s) { statusCount[s] = 0; });
tickets.forEach(function(t) { if (statusCount[t.status] !== undefined) statusCount[t.status]++; });
if (charts['sup-chart-status']) charts['sup-chart-status'].destroy();
charts['sup-chart-status'] = new Chart(document.getElementById('sup-chart-status').getContext('2d'), {
type: 'doughnut',
data: {
labels: Object.keys(statusCount).map(function(s) { return STATUS_CHAMADO[s].label; }),
datasets: [{
data: Object.values(statusCount),
backgroundColor: ['#3b82f6', '#f59e0b', '#8b5cf6', '#6b7280', '#10b981', '#06b6d4'],
borderWidth: 0
}]
},
options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#a0a0a0', font: { family: 'Poppins', size: 11 }, padding: 15, usePointStyle: true } } } }
});
const prioCount = {};
Object.keys(PRIORIDADES_CHAMADO).forEach(function(p) { prioCount[p] = 0; });
tickets.forEach(function(t) { if (prioCount[t.priority] !== undefined) prioCount[t.priority]++; });
if (charts['sup-chart-prioridade']) charts['sup-chart-prioridade'].destroy();
charts['sup-chart-prioridade'] = new Chart(document.getElementById('sup-chart-prioridade').getContext('2d'), {
type: 'bar',
data: {
labels: Object.keys(prioCount).map(function(p) { return PRIORIDADES_CHAMADO[p].label; }),
datasets: [{
label: 'Chamados',
data: Object.values(prioCount),
backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#dc2626'],
borderRadius: 6
}]
},
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#666', stepSize: 1 }, grid: { color: 'rgba(255,206,5,0.06)' } }, x: { ticks: { color: '#a0a0a0' }, grid: { display: false } } } }
});
const months = {};
for (let i = 5; i >= 0; i--) {
const d = new Date();
d.setMonth(d.getMonth() - i);
const key = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
months[key] = 0;
}
tickets.forEach(function(t) {
const d = new Date(t.created_at);
const key = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
if (months[key] !== undefined) months[key]++;
});
if (charts['sup-chart-evolucao']) charts['sup-chart-evolucao'].destroy();
charts['sup-chart-evolucao'] = new Chart(document.getElementById('sup-chart-evolucao').getContext('2d'), {
type: 'line',
data: {
labels: Object.keys(months),
datasets: [{
label: 'Chamados Abertos',
data: Object.values(months),
borderColor: '#FFCE05',
backgroundColor: 'rgba(255, 206, 5, 0.08)',
fill: true,
tension: 0.4,
pointBackgroundColor: '#FFCE05',
pointBorderColor: '#0a0a0a',
pointBorderWidth: 2,
pointRadius: 5
}]
},
options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#666', stepSize: 1 }, grid: { color: 'rgba(255,206,5,0.06)' } }, x: { ticks: { color: '#a0a0a0' }, grid: { display: false } } } }
});
}
function renderFilaChamados() {
const tickets = JSON.parse(localStorage.getItem(SK.tickets) || '[]');
let ticketsFiltrados = tickets;
if (filtroChamadosAdmin === 'novo') { ticketsFiltrados = tickets.filter(function(t) { return t.status === 'novo'; }); }
else if (filtroChamadosAdmin === 'andamento') { ticketsFiltrados = tickets.filter(function(t) { return t.status === 'andamento'; }); }
else if (filtroChamadosAdmin === 'aguardando') { ticketsFiltrados = tickets.filter(function(t) { return t.status === 'aguardando'; }); }
const container = document.getElementById('fila-chamados-list');
if (ticketsFiltrados.length === 0) { container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">Nenhum chamado encontrado</div>'; return; }
container.innerHTML = ticketsFiltrados.map(function(ticket) {
const prioridade = PRIORIDADES_CHAMADO[ticket.priority];
const status = STATUS_CHAMADO[ticket.status];
return '<div class="ticket-card" onclick="verDetalhesChamado(\'' + ticket.id + '\')"><div class="ticket-header"><div><div class="ticket-id">' + ticket.id + '</div><div class="ticket-subject">' + ticket.subject + '</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Solicitante: ' + ticket.requester_name + '</div></div><div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;"><span class="badge ' + status.class + '">' + status.label + '</span><span class="badge" style="background: rgba(255, 206, 5, 0.1); color: var(--gold-primary); border: 1px solid var(--border-gold);">' + prioridade.label + '</span></div></div><div class="ticket-meta"><div class="ticket-meta-item">📅 ' + new Date(ticket.created_at).toLocaleString('pt-BR') + '</div>' + getSlaIndicator(ticket) + '</div></div>';
}).join('');
}
function filtrarChamadosAdmin(filter) { filtroChamadosAdmin = filter; renderFilaChamados(); }
function excluirChamado(ticketId) {
if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'tecnico')) { showToast('Apenas administradores e técnicos podem excluir chamados.'); return; }
if (!confirm('Mover este chamado para a Lixeira? Ele poderá ser restaurado por até 90 dias.')) return;
const tickets = JSON.parse(localStorage.getItem(SK.tickets) || '[]');
const ticket = tickets.find(function(t) { return t.id === ticketId; });
if (!ticket) return;
const ticketsRestantes = tickets.filter(function(t) { return t.id !== ticketId; });
localStorage.setItem(SK.tickets, JSON.stringify(ticketsRestantes));
const trash = getData(SK.ticketsTrash);
ticket.deleted_at = new Date().toISOString();
ticket.deleted_by = currentUser.name;
ticket.deleted_by_role = currentUser.role;
trash.push(ticket);
saveData(SK.ticketsTrash, trash);
addLog('Chamado Movido para Lixeira', 'Chamado ' + ticket.id + ' (' + ticket.subject + ') foi movido para a lixeira por ' + currentUser.name + ' (' + roleLabel(currentUser.role) + ')', 'exclusao');
showToast('Chamado movido para a Lixeira');
fecharModal('modal-chamado-detalhes');
if (document.getElementById('view-meus-chamados') && document.getElementById('view-meus-chamados').style.display !== 'none') { renderMeusChamados(); }
if (document.getElementById('view-painel-tecnico') && document.getElementById('view-painel-tecnico').style.display !== 'none') { renderPainelTecnico(); }
if (document.getElementById('view-meus-atendimentos') && document.getElementById('view-meus-atendimentos').style.display !== 'none') { renderMeusAtendimentos(); }
}
function diasRestantesLixeira(deletedAt) {
const deletedDate = new Date(deletedAt);
const expiraEm = new Date(deletedDate.getTime() + 90 * 24 * 60 * 60 * 1000);
const diffDays = Math.ceil((expiraEm - new Date()) / (1000 * 60 * 60 * 24));
return diffDays;
}
function renderLixeira() {
if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'tecnico')) { return; }
const trash = getData(SK.ticketsTrash).slice().sort(function(a, b) { return new Date(b.deleted_at) - new Date(a.deleted_at); });
document.getElementById('lixeira-count-info').innerHTML = '<strong>' + trash.length + '</strong> chamado(s) na lixeira';
const container = document.getElementById('lixeira-list');
if (trash.length === 0) { container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">A lixeira está vazia</div>'; return; }
container.innerHTML = trash.map(function(t) {
const diasRestantes = diasRestantesLixeira(t.deleted_at);
const diasTexto = diasRestantes > 0 ? diasRestantes + ' dia(s) até a exclusão definitiva' : 'Expira na próxima limpeza automática';
return '<div class="ticket-card" style="cursor: default;"><div class="ticket-header"><div><div class="ticket-id">' + t.id + '</div><div class="ticket-subject">' + t.subject + '</div><div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Solicitante: ' + t.requester_name + '</div></div></div><div class="ticket-meta"><div class="ticket-meta-item">🗑️ Excluído por: ' + t.deleted_by + ' (' + roleLabel(t.deleted_by_role) + ')</div><div class="ticket-meta-item">📅 Excluído em: ' + new Date(t.deleted_at).toLocaleString('pt-BR') + '</div><div class="ticket-meta-item">⏳ ' + diasTexto + '</div></div><div class="btn-group" style="margin-top: 12px; justify-content: flex-start;"><button class="btn btn-success-outline btn-sm" onclick="restaurarChamado(\'' + t.id + '\')">↩️ Restaurar</button> <button class="btn btn-danger-outline btn-sm" onclick="excluirChamadoDefinitivo(\'' + t.id + '\')">🗑️ Excluir Definitivamente</button></div></div>';
}).join('');
}
function restaurarChamado(ticketId) {
if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'tecnico')) { showToast('Apenas administradores e técnicos podem restaurar chamados.'); return; }
if (!confirm('Restaurar este chamado para a lista de chamados ativos?')) return;
let trash = getData(SK.ticketsTrash);
const ticket = trash.find(function(t) { return t.id === ticketId; });
if (!ticket) return;
trash = trash.filter(function(t) { return t.id !== ticketId; });
saveData(SK.ticketsTrash, trash);
delete ticket.deleted_at;
delete ticket.deleted_by;
delete ticket.deleted_by_role;
const tickets = getData(SK.tickets);
tickets.push(ticket);
saveData(SK.tickets, tickets);
addLog('Chamado Restaurado', 'Chamado ' + ticket.id + ' (' + ticket.subject + ') foi restaurado da lixeira por ' + currentUser.name, 'alteracao');
showToast('Chamado restaurado com sucesso!');
renderLixeira();
}
function excluirChamadoDefinitivo(ticketId) {
if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'tecnico')) { showToast('Apenas administradores e técnicos podem excluir definitivamente.'); return; }
const motivo = prompt('Esta ação é PERMANENTE e não pode ser desfeita.\nInforme o motivo da exclusão definitiva deste chamado:');
if (motivo === null) return;
const motivoLimpo = motivo.trim();
if (!motivoLimpo) { showToast('É necessário informar um motivo para excluir definitivamente.'); return; }
let trash = getData(SK.ticketsTrash);
const ticket = trash.find(function(t) { return t.id === ticketId; });
if (!ticket) return;
trash = trash.filter(function(t) { return t.id !== ticketId; });
saveData(SK.ticketsTrash, trash);
addLog('Chamado Excluído Definitivamente', 'Chamado ' + ticket.id + ' (' + ticket.subject + ') foi excluído permanentemente por ' + currentUser.name + ' (' + roleLabel(currentUser.role) + '). Motivo: ' + motivoLimpo, 'exclusao');
showToast('Chamado excluído definitivamente!');
renderLixeira();
}
function purgeTrashAntiga() {
let trash = getData(SK.ticketsTrash);
if (trash.length === 0) return;
const agora = new Date();
const restantes = [];
let purgados = 0;
trash.forEach(function(t) {
const deletedDate = new Date(t.deleted_at);
const diffDays = (agora - deletedDate) / (1000 * 60 * 60 * 24);
if (diffDays >= 90) {
purgados++;
addLog('Chamado Excluído Definitivamente', 'Chamado ' + t.id + ' (' + t.subject + ') foi excluído automaticamente após 90 dias na lixeira', 'exclusao');
} else {
restantes.push(t);
}
});
if (purgados > 0) { saveData(SK.ticketsTrash, restantes); }
}
function popularSelectsHistorico() {
const assets = getData(SK.assets);
const selectAtivo = document.getElementById('hist-ativo');
const valorAtualAtivo = selectAtivo.value;
selectAtivo.innerHTML = '<option value="">Selecione...</option>' + assets.map(function(a) { return '<option value="' + a.uid + '">' + a.uid + ' - ' + a.brand + ' ' + a.model + '</option>'; }).join('');
if (valorAtualAtivo) selectAtivo.value = valorAtualAtivo;
const selectFiltro = document.getElementById('hist-filtro-ativo');
const valorAtualFiltro = selectFiltro.value;
selectFiltro.innerHTML = '<option value="todos">Todos</option>' + assets.map(function(a) { return '<option value="' + a.uid + '">' + a.uid + ' - ' + a.brand + ' ' + a.model + '</option>'; }).join('');
if (valorAtualFiltro) selectFiltro.value = valorAtualFiltro;
}
function popularUsuarioAnteriorHistorico() {
const uid = document.getElementById('hist-ativo').value;
if (!uid) return;
const allocations = getData(SK.allocations).filter(function(al) { return al.asset_uid === uid; }).sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
if (allocations.length > 0) {
const emp = getData(SK.employees).find(function(e) { return e.id == allocations[0].employee_id; });
if (emp) document.getElementById('hist-usuario-anterior').value = emp.name;
}
}
function previewFotoHistorico(input) {
const preview = document.getElementById('hist-foto-preview');
if (input.files && input.files[0]) {
const reader = new FileReader();
reader.onload = function(e) { preview.innerHTML = '<img src="' + e.target.result + '" alt="Foto do equipamento">'; preview.style.display = 'inline-block'; };
reader.readAsDataURL(input.files[0]);
}
}
function salvarHistorico(event) {
event.preventDefault();
if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'tecnico')) { showToast('Apenas administradores e técnicos podem registrar histórico.'); return; }
const uid = document.getElementById('hist-ativo').value;
const usuarioAnterior = document.getElementById('hist-usuario-anterior').value.trim();
const condicao = document.getElementById('hist-condicao').value;
const tipo = document.getElementById('hist-tipo').value;
const parecer = document.getElementById('hist-parecer').value.trim();
const fotoInput = document.getElementById('hist-foto');
if (!uid || !parecer) { showToast('Por favor, preencha os campos obrigatórios'); return; }
const finalizar = function(fotoData) {
const historico = getData(SK.assetHistory);
const asset = getData(SK.assets).find(function(a) { return a.uid === uid; });
historico.push({
id: 'H' + Date.now(),
asset_uid: uid,
asset_desc: asset ? (asset.brand + ' ' + asset.model) : '',
usuario_anterior: usuarioAnterior || '—',
condicao: condicao,
tipo: tipo,
parecer: parecer,
foto: fotoData,
autor: currentUser.name,
autor_role: currentUser.role,
origem: 'manual',
created_at: new Date().toISOString()
});
saveData(SK.assetHistory, historico);
addLog('Histórico Registrado', 'Registro de histórico adicionado para o ativo ' + uid + ' por ' + currentUser.name + ' (' + roleLabel(currentUser.role) + ')', 'cadastro');
showToast('Registro de histórico salvo com sucesso!');
document.getElementById('form-historico').reset();
document.getElementById('hist-foto-preview').style.display = 'none';
document.getElementById('hist-foto-preview').innerHTML = '';
renderHistorico();
};
if (fotoInput.files && fotoInput.files[0]) {
const reader = new FileReader();
reader.onload = function(e) { finalizar(e.target.result); };
reader.readAsDataURL(fotoInput.files[0]);
} else { finalizar(null); }
}
function gerarHistoricoAutomatico() {
const assets = getData(SK.assets);
const employees = getData(SK.employees);
const allocations = getData(SK.allocations);
const tickets = JSON.parse(localStorage.getItem(SK.tickets) || '[]');
const auto = [];
allocations.forEach(function(al) {
const asset = assets.find(function(a) { return a.uid === al.asset_uid; });
const emp = employees.find(function(e) { return e.id == al.employee_id; });
const nomeColab = emp ? emp.name : 'Colaborador removido';
auto.push({
id: 'AUTO-AL-' + al.id,
asset_uid: al.asset_uid,
asset_desc: asset ? (asset.brand + ' ' + asset.model) : '',
usuario_anterior: nomeColab,
condicao: 'integro',
tipo: al.status === 'active' ? 'alocacao' : 'desalocacao',
parecer: al.status === 'active'
? ('Equipamento alocado para ' + nomeColab + (emp ? ' (' + emp.depto + ')' : '') + ' em ' + new Date(al.date).toLocaleDateString('pt-BR') + '.')
: ('Equipamento foi alocado para ' + nomeColab + ' em ' + new Date(al.date).toLocaleDateString('pt-BR') + ' e posteriormente desalocado.'),
foto: null,
autor: 'Sistema (Alocações)',
autor_role: 'sistema',
origem: 'sistema',
created_at: al.date
});
});
tickets.forEach(function(t) {
if (!t.asset_uid) return;
const asset = assets.find(function(a) { return a.uid === t.asset_uid; });
const textoCompleto = ((t.subject || '') + ' ' + (t.description || '')).toLowerCase();
const palavrasAvaria = ['quebrad', 'avaria', 'danific', 'trinca', 'defeito', 'não liga', 'nao liga', 'rachad', 'queimad', 'riscad', 'amassad'];
const avariado = palavrasAvaria.some(function(p) { return textoCompleto.indexOf(p) !== -1; });
const statusLabel = STATUS_CHAMADO[t.status] ? STATUS_CHAMADO[t.status].label : t.status;
auto.push({
id: 'AUTO-TK-' + t.id,
asset_uid: t.asset_uid,
asset_desc: asset ? (asset.brand + ' ' + asset.model) : '',
usuario_anterior: t.requester_name || '—',
condicao: avariado ? 'avariado' : 'integro',
tipo: 'ocorrencia',
parecer: 'Chamado ' + t.id + ' (' + statusLabel + '): ' + t.subject + '. ' + t.description + (t.atendido_por_nome ? ' Atendido por ' + t.atendido_por_nome + '.' : ''),
foto: t.imagem || null,
autor: t.atendido_por_nome || 'Central de Suporte (Chamados)',
autor_role: 'sistema',
origem: 'sistema',
created_at: t.created_at
});
});
return auto;
}
function aplicarFiltrosHistorico() {
filtrosHistorico.dataIni = document.getElementById('f-hist-data-ini').value;
filtrosHistorico.dataFim = document.getElementById('f-hist-data-fim').value;
filtrosHistorico.colab = document.getElementById('f-hist-colab').value;
filtrosHistorico.tipoDispositivo = document.getElementById('f-hist-tipo-dispositivo').value;
filtrosHistorico.tipoRegistro = document.getElementById('f-hist-tipo-registro').value;
renderHistorico();
showToast('Filtros aplicados');
}
function limparFiltrosHistorico() {
document.getElementById('f-hist-data-ini').value = '';
document.getElementById('f-hist-data-fim').value = '';
document.getElementById('f-hist-colab').value = 'todos';
document.getElementById('f-hist-tipo-dispositivo').value = 'todos';
document.getElementById('f-hist-tipo-registro').value = 'todos';
filtrosHistorico = {
dataIni: '',
dataFim: '',
colab: 'todos',
tipoDispositivo: 'todos',
tipoRegistro: 'todos'
};
renderHistorico();
showToast('Filtros limpos');
}
function atualizarFiltrosHistoricoDropdowns() {
const employees = getData(SK.employees).filter(function(e) { return e.status === 'active'; });
const selectColab = document.getElementById('f-hist-colab');
if (!selectColab) return;
const valorAtual = selectColab.value;
selectColab.innerHTML = '<option value="todos">Todos</option>' + employees.map(function(e) { return '<option value="' + e.id + '">' + e.name + '</option>'; }).join('');
if (valorAtual) selectColab.value = valorAtual;
}
function renderHistorico() {
popularSelectsHistorico();
atualizarFiltrosHistoricoDropdowns();
const search = document.getElementById('hist-search') ? document.getElementById('hist-search').value.toLowerCase() : '';
const filtroAtivo = document.getElementById('hist-filtro-ativo') ? document.getElementById('hist-filtro-ativo').value : 'todos';
const manual = getData(SK.assetHistory);
const automatico = gerarHistoricoAutomatico();
let historico = manual.concat(automatico).sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
if (filtroAtivo !== 'todos') historico = historico.filter(function(h) { return h.asset_uid === filtroAtivo; });
if (filtrosHistorico.tipoDispositivo !== 'todos') {
historico = historico.filter(function(h) {
const assets = getData(SK.assets);
const asset = assets.find(function(a) { return a.uid === h.asset_uid; });
return asset && asset.type === filtrosHistorico.tipoDispositivo;
});
}
if (filtrosHistorico.tipoRegistro !== 'todos') {
historico = historico.filter(function(h) { return h.tipo === filtrosHistorico.tipoRegistro; });
}
if (filtrosHistorico.colab !== 'todos') {
const selectColab = document.getElementById('f-hist-colab');
const nomeColab = selectColab ? selectColab.options[selectColab.selectedIndex].text : '';
historico = historico.filter(function(h) { return h.usuario_anterior === filtrosHistorico.colab || h.usuario_anterior === nomeColab; });
}
if (filtrosHistorico.dataIni) {
const dataIni = new Date(filtrosHistorico.dataIni);
historico = historico.filter(function(h) { return new Date(h.created_at) >= dataIni; });
}
if (filtrosHistorico.dataFim) {
const dataFim = new Date(filtrosHistorico.dataFim + 'T23:59:59');
historico = historico.filter(function(h) { return new Date(h.created_at) <= dataFim; });
}
if (search) {
historico = historico.filter(function(h) {
return h.asset_uid.toLowerCase().includes(search) || (h.asset_desc || '').toLowerCase().includes(search) || (h.usuario_anterior || '').toLowerCase().includes(search) || h.parecer.toLowerCase().includes(search);
});
}
document.getElementById('hist-count-info').innerHTML = '<strong>' + historico.length + '</strong> registros';
const container = document.getElementById('historico-list');
const isAdmin = currentUser && currentUser.role === 'admin';
if (historico.length === 0) { container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">Nenhum registro de histórico encontrado</div>'; return; }
const tipoLabels = { alocacao: 'Alocação', desalocacao: 'Desalocação', ocorrencia: 'Ocorrência (Chamado)', parecer: 'Parecer Técnico', importado: 'Importado (ClickUp)', outro: 'Outro' };
container.innerHTML = historico.map(function(h) {
const condicaoBadge = h.condicao === 'avariado' ? '<span class="badge badge-discarded">Avariado</span>' : '<span class="badge badge-available">Íntegro</span>';
const isSistema = h.origem === 'sistema';
const origemBadge = isSistema ? '<span class="badge badge-inactive" style="margin-left: 6px;">Gerado pelo Sistema</span>' : '<span class="badge badge-assigned" style="margin-left: 6px;">Manual</span>';
let acoes = '';
if (isAdmin && !isSistema) {
acoes = '<div class="btn-group" style="margin-top: 12px; justify-content: flex-start;"><button class="btn btn-outline btn-sm" onclick="editarHistorico(\'' + h.id + '\')">✏️ Editar Parecer</button> <button class="btn btn-danger-outline btn-sm" onclick="excluirHistorico(\'' + h.id + '\')">🗑️ Excluir</button></div>';
}
const fotoHtml = h.foto ? '<div style="margin-top: 10px; max-width: 220px; border-radius: 8px; overflow: hidden;"><img src="' + h.foto + '" alt="Foto do equipamento" style="width: 100%; border-radius: 8px;"></div>' : '';
return '<div class="ticket-card" style="cursor: default;"><div class="ticket-header"><div><div class="ticket-id">' + h.asset_uid + (h.asset_desc ? ' — ' + h.asset_desc : '') + '</div><div class="ticket-subject" style="font-size: 13px;">' + tipoLabels[h.tipo] + origemBadge + '</div></div>' + condicaoBadge + '</div><div style="font-size: 13px; line-height: 1.5; margin: 8px 0; color: var(--text-primary); white-space: pre-wrap;">' + h.parecer + '</div><div class="ticket-meta"><div class="ticket-meta-item">👤 Usuário anterior: ' + h.usuario_anterior + '</div><div class="ticket-meta-item">✍️ Registrado por: ' + h.autor + (h.autor_role === 'sistema' ? '' : ' (' + roleLabel(h.autor_role) + ')') + '</div><div class="ticket-meta-item">📅 ' + new Date(h.created_at).toLocaleString('pt-BR') + '</div></div>' + fotoHtml + acoes + '</div>';
}).join('');
}
function exportarHistoricoPDF() {
const jsPDF = window.jspdf.jsPDF;
const doc = new jsPDF();
const search = document.getElementById('hist-search') ? document.getElementById('hist-search').value.toLowerCase() : '';
const filtroAtivo = document.getElementById('hist-filtro-ativo') ? document.getElementById('hist-filtro-ativo').value : 'todos';
const manual = getData(SK.assetHistory);
const automatico = gerarHistoricoAutomatico();
let historico = manual.concat(automatico).sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
if (filtroAtivo !== 'todos') historico = historico.filter(function(h) { return h.asset_uid === filtroAtivo; });
if (filtrosHistorico.tipoDispositivo !== 'todos') {
historico = historico.filter(function(h) {
const assets = getData(SK.assets);
const asset = assets.find(function(a) { return a.uid === h.asset_uid; });
return asset && asset.type === filtrosHistorico.tipoDispositivo;
});
}
if (filtrosHistorico.tipoRegistro !== 'todos') {
historico = historico.filter(function(h) { return h.tipo === filtrosHistorico.tipoRegistro; });
}
if (filtrosHistorico.colab !== 'todos') {
const selectColab = document.getElementById('f-hist-colab');
const nomeColab = selectColab ? selectColab.options[selectColab.selectedIndex].text : '';
historico = historico.filter(function(h) { return h.usuario_anterior === filtrosHistorico.colab || h.usuario_anterior === nomeColab; });
}
if (filtrosHistorico.dataIni) {
const dataIni = new Date(filtrosHistorico.dataIni);
historico = historico.filter(function(h) { return new Date(h.created_at) >= dataIni; });
}
if (filtrosHistorico.dataFim) {
const dataFim = new Date(filtrosHistorico.dataFim + 'T23:59:59');
historico = historico.filter(function(h) { return new Date(h.created_at) <= dataFim; });
}
if (search) {
historico = historico.filter(function(h) {
return h.asset_uid.toLowerCase().includes(search) || (h.asset_desc || '').toLowerCase().includes(search) || (h.usuario_anterior || '').toLowerCase().includes(search) || h.parecer.toLowerCase().includes(search);
});
}
const tipoLabels = { alocacao: 'Alocação', desalocacao: 'Desalocação', ocorrencia: 'Ocorrência', parecer: 'Parecer', importado: 'Importado', outro: 'Outro' };
doc.setFillColor(10, 10, 10); doc.rect(0, 0, 210, 40, 'F');
doc.setFillColor(255, 206, 5); doc.rect(0, 40, 210, 3, 'F');
doc.setTextColor(255, 206, 5); doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
doc.text('HISTÓRICO DE ATIVOS', 15, 22);
doc.setTextColor(160, 160, 160); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
doc.text('Emitido em: ' + new Date().toLocaleString('pt-BR'), 15, 32);
doc.text('Registros: ' + historico.length, 15, 38);
doc.autoTable({
startY: 50,
head: [['Data', 'Ativo', 'Descrição', 'Tipo', 'Usuário Anterior', 'Condição', 'Registrado por']],
body: historico.map(function(h) {
return [
new Date(h.created_at).toLocaleDateString('pt-BR'),
h.asset_uid,
(h.asset_desc || '').substring(0, 30),
tipoLabels[h.tipo] || h.tipo,
h.usuario_anterior || '—',
h.condicao === 'avariado' ? 'Avariado' : 'Íntegro',
h.autor
];
}),
theme: 'striped', headStyles: { fillColor: [10, 10, 10], textColor: [255, 206, 5], fontStyle: 'bold' }, styles: { font: 'helvetica', fontSize: 7 }
});
doc.save('historico_ativos_' + new Date().toISOString().split('T')[0] + '.pdf');
showToast('PDF exportado com sucesso!');
}
function exportarHistoricoExcel() {
const search = document.getElementById('hist-search') ? document.getElementById('hist-search').value.toLowerCase() : '';
const filtroAtivo = document.getElementById('hist-filtro-ativo') ? document.getElementById('hist-filtro-ativo').value : 'todos';
const manual = getData(SK.assetHistory);
const automatico = gerarHistoricoAutomatico();
let historico = manual.concat(automatico).sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
if (filtroAtivo !== 'todos') historico = historico.filter(function(h) { return h.asset_uid === filtroAtivo; });
if (filtrosHistorico.tipoDispositivo !== 'todos') {
historico = historico.filter(function(h) {
const assets = getData(SK.assets);
const asset = assets.find(function(a) { return a.uid === h.asset_uid; });
return asset && asset.type === filtrosHistorico.tipoDispositivo;
});
}
if (filtrosHistorico.tipoRegistro !== 'todos') {
historico = historico.filter(function(h) { return h.tipo === filtrosHistorico.tipoRegistro; });
}
if (filtrosHistorico.colab !== 'todos') {
const selectColab = document.getElementById('f-hist-colab');
const nomeColab = selectColab ? selectColab.options[selectColab.selectedIndex].text : '';
historico = historico.filter(function(h) { return h.usuario_anterior === filtrosHistorico.colab || h.usuario_anterior === nomeColab; });
}
if (filtrosHistorico.dataIni) {
const dataIni = new Date(filtrosHistorico.dataIni);
historico = historico.filter(function(h) { return new Date(h.created_at) >= dataIni; });
}
if (filtrosHistorico.dataFim) {
const dataFim = new Date(filtrosHistorico.dataFim + 'T23:59:59');
historico = historico.filter(function(h) { return new Date(h.created_at) <= dataFim; });
}
if (search) {
historico = historico.filter(function(h) {
return h.asset_uid.toLowerCase().includes(search) || (h.asset_desc || '').toLowerCase().includes(search) || (h.usuario_anterior || '').toLowerCase().includes(search) || h.parecer.toLowerCase().includes(search);
});
}
const tipoLabels = { alocacao: 'Alocação', desalocacao: 'Desalocação', ocorrencia: 'Ocorrência', parecer: 'Parecer', importado: 'Importado', outro: 'Outro' };
const csv = [['Data', 'Ativo', 'Descrição', 'Tipo Registro', 'Usuário Anterior', 'Condição', 'Parecer', 'Registrado por']];
historico.forEach(function(h) {
csv.push([
new Date(h.created_at).toLocaleDateString('pt-BR'),
h.asset_uid,
h.asset_desc || '',
tipoLabels[h.tipo] || h.tipo,
h.usuario_anterior || '—',
h.condicao === 'avariado' ? 'Avariado' : 'Íntegro',
(h.parecer || '').replace(/;/g, ','),
h.autor
]);
});
const csvText = csv.map(function(row) { return row.join(';'); }).join('\n');
const blob = new Blob(['\ufeff' + csvText], { type: 'text/csv;charset=utf-8;' });
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = 'historico_ativos_' + new Date().toISOString().split('T')[0] + '.csv';
link.click();
showToast('Excel exportado com sucesso!');
}
function editarHistorico(id) {
if (id.indexOf('AUTO-') === 0) { showToast('Registros gerados automaticamente pelo sistema não podem ser editados aqui. Edite o chamado ou a alocação de origem.'); return; }
if (!currentUser || currentUser.role !== 'admin') { showToast('Apenas administradores podem editar registros de histórico.'); return; }
const historico = getData(SK.assetHistory);
const h = historico.find(function(x) { return x.id === id; });
if (!h) return;
const novoParecer = prompt('Editar parecer/observações do registro:', h.parecer);
if (novoParecer === null) return;
const parecerLimpo = novoParecer.trim();
if (!parecerLimpo) { showToast('O parecer não pode ficar vazio'); return; }
h.parecer = parecerLimpo;
saveData(SK.assetHistory, historico);
addLog('Histórico Editado', 'Registro de histórico do ativo ' + h.asset_uid + ' foi editado por ' + currentUser.name, 'alteracao');
showToast('Registro atualizado com sucesso!');
renderHistorico();
}
function excluirHistorico(id) {
if (id.indexOf('AUTO-') === 0) { showToast('Registros gerados automaticamente pelo sistema não podem ser excluídos aqui.'); return; }
if (!currentUser || currentUser.role !== 'admin') { showToast('Apenas administradores podem excluir registros de histórico.'); return; }
if (!confirm('Confirmar exclusão deste registro de histórico? Esta ação não pode ser desfeita.')) return;
let historico = getData(SK.assetHistory);
const h = historico.find(function(x) { return x.id === id; });
historico = historico.filter(function(x) { return x.id !== id; });
saveData(SK.assetHistory, historico);
addLog('Histórico Excluído', 'Registro de histórico do ativo ' + (h ? h.asset_uid : '') + ' foi excluído por ' + currentUser.name, 'exclusao');
showToast('Registro excluído com sucesso!');
renderHistorico();
}
function parseCSVHistorico(text) {
const lines = text.split(/\r?\n/).filter(function(l) { return l.trim(); });
if (lines.length < 2) return [];
const headers = lines[0].split(/[;,]/).map(function(h) { return h.trim(); });
return lines.slice(1).map(function(line) {
const values = line.split(/[;,]/);
const obj = {};
headers.forEach(function(h, i) { obj[h] = values[i] ? values[i].trim() : ''; });
return obj;
});
}
function importarHistoricoClickUp(input) {
if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'tecnico')) { showToast('Apenas administradores e técnicos podem importar histórico.'); return; }
if (!input.files || !input.files[0]) return;
const file = input.files[0];
const reader = new FileReader();
reader.onload = function(e) {
try {
let registros = [];
if (file.name.toLowerCase().endsWith('.json')) {
const data = JSON.parse(e.target.result);
registros = Array.isArray(data) ? data : (data.tasks || data.items || data.registros || []);
} else {
registros = parseCSVHistorico(e.target.result);
}
const historico = getData(SK.assetHistory);
let importados = 0;
registros.forEach(function(r, idx) {
const uid = r.asset_uid || r.uid || r.Ativo || r.ativo || r.UID || '';
const parecer = r.parecer || r.description || r.Descrição || r.descricao || r.content || r.Description || r.Nome || r.name || r['Nome da tarefa'] || '';
if (!uid && !parecer) return;
const condicaoTexto = (r.condicao || r.status || r.Status || r.condição || '').toString().toLowerCase();
historico.push({
id: 'H' + Date.now() + '_' + idx,
asset_uid: uid || 'NÃO INFORMADO',
asset_desc: r.asset_desc || r.modelo || r.Modelo || '',
usuario_anterior: r.usuario_anterior || r.assignee || r.Responsável || r.responsavel || r.Assignee || '—',
condicao: condicaoTexto.indexOf('avari') !== -1 ? 'avariado' : 'integro',
tipo: 'importado',
parecer: parecer || 'Registro importado do ClickUp sem descrição detalhada.',
foto: null,
autor: currentUser.name,
autor_role: currentUser.role,
created_at: r.created_at || r.date || r['Data de criação'] || new Date().toISOString()
});
importados++;
});
saveData(SK.assetHistory, historico);
addLog('Histórico Importado', importados + ' registro(s) importado(s) do ClickUp para o histórico de ativos por ' + currentUser.name, 'cadastro');
showToast(importados + ' registro(s) importado(s) com sucesso!');
renderHistorico();
} catch (err) {
console.error('Erro ao importar histórico:', err);
showToast('Erro ao processar o arquivo. Verifique se o formato (CSV ou JSON) está correto.');
}
input.value = '';
};
reader.readAsText(file);
}
function renderChecklists() {
showChecklistView('novo-checklist', document.getElementById('btn-tab-novo-checklist'));
}
function showChecklistView(view, btn) {
document.querySelectorAll('.checklist-view').forEach(function(v) { v.style.display = 'none'; });
document.getElementById('view-' + view).style.display = 'block';
document.querySelectorAll('#page-checklists .suporte-tab').forEach(function(t) { t.classList.remove('active'); });
if (btn) btn.classList.add('active');
if (view === 'novo-checklist') popularColaboradoresChecklist();
if (view === 'visualizar-checklists') renderChecklistsOrganizados();
}
function popularColaboradoresChecklist() {
const employees = getData(SK.employees).filter(function(e) { return e.status === 'active'; });
const select = document.getElementById('chk-colaborador');
select.innerHTML = '<option value="">Selecione o colaborador...</option>' +
employees.map(function(e) {
return '<option value="' + e.id + '" data-setor="' + e.depto + '">' + e.name + '</option>';
}).join('');
}
function preencherSetorColaborador() {
const select = document.getElementById('chk-colaborador');
const selectedOption = select.options[select.selectedIndex];
const setor = selectedOption.getAttribute('data-setor') || '';
document.getElementById('chk-setor').value = setor;
}
document.getElementById('checklistForm').addEventListener('submit', function(e) {
e.preventDefault();
const selectColab = document.getElementById('chk-colaborador');
const selectedOption = selectColab.options[selectColab.selectedIndex];
const colaborador = selectedOption.text || '—';
const setor = document.getElementById('chk-setor').value || '—';
const dataVal = document.getElementById('chk-data').value;
const semestre = document.getElementById('chk-semestre').value;
if (!dataVal || !semestre) {
alert('Por favor, preencha todos os campos obrigatórios!');
return;
}
const dataSelecionada = new Date(dataVal + 'T12:00:00');
const dataMinima = new Date('2026-06-22T00:00:00');
if (isNaN(dataSelecionada.getTime())) {
alert('Data inválida! Por favor, selecione uma data válida.');
return;
}
if (dataSelecionada < dataMinima) {
alert('A data deve ser igual ou posterior a 22/06/2026 (início da campanha).');
return;
}
const checked = function(name) { return Array.from(document.querySelectorAll('input[name="' + name + '"]:checked')).map(function(cb) { return cb.value; }); };
const checklistData = {
id: 'CHK-' + Date.now(),
colaborador: colaborador,
setor: setor,
data: dataVal,
semestre: semestre,
limpeza: checked('chk-limpeza'),
organizacao: checked('chk-organizacao'),
conservacao: checked('chk-conservacao'),
seguranca: checked('chk-seguranca'),
registro: checked('chk-registro'),
obs: document.getElementById('chk-obs').value,
assColab: document.getElementById('chk-assColab').value || '',
assQualidade: document.getElementById('chk-assQualidade').value || '',
assTI: document.getElementById('chk-assTI').value || '',
created_at: new Date().toISOString(),
created_by: currentUser ? currentUser.name : 'Sistema'
};
const checklists = JSON.parse(localStorage.getItem(SK.checklists) || '{}');
const ano = new Date(dataVal).getFullYear().toString();
if (!checklists[ano]) {
checklists[ano] = { '1': [], '2': [] };
}
if (!checklists[ano][semestre]) {
checklists[ano][semestre] = [];
}
checklists[ano][semestre].push(checklistData);
localStorage.setItem(SK.checklists, JSON.stringify(checklists));
addLog('Checklist Salvo', 'Checklist de ' + colaborador + ' (' + semestre + '° Semestre/' + ano + ') foi salvo no sistema', 'cadastro');
showToast('Checklist salvo com sucesso!');
this.reset();
showChecklistView('visualizar-checklists', document.getElementById('btn-tab-visualizar-checklists'));
});
function renderChecklistsOrganizados() {
const checklists = JSON.parse(localStorage.getItem(SK.checklists) || '{}');
const container = document.getElementById('checklists-organized-list');
const anos = Object.keys(checklists).sort(function(a, b) { return b - a; });
if (anos.length === 0) {
container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">Nenhum checklist salvo ainda</div>';
return;
}
let html = '';
anos.forEach(function(ano) {
const anoData = checklists[ano];
const totalChecklists = (anoData['1'] ? anoData['1'].length : 0) + (anoData['2'] ? anoData['2'].length : 0);
html += '<div class="checklist-year-folder">';
html += '<div class="checklist-year-header" onclick="toggleYearFolder(\'' + ano + '\')">';
html += '<div class="checklist-year-title">📁 ' + ano + '</div>';
html += '<div class="checklist-year-count">' + totalChecklists + ' checklist(s)</div>';
html += '</div>';
html += '<div class="checklist-year-content" id="year-' + ano + '">';
['1', '2'].forEach(function(sem) {
const semChecklists = anoData[sem] || [];
html += '<div class="checklist-semester-folder">';
html += '<div class="checklist-semester-header" onclick="toggleSemesterFolder(\'' + ano + '\', \'' + sem + '\')">';
html += '<div class="checklist-semester-title">📂 ' + sem + '° Avaliação</div>';
html += '<div class="checklist-semester-count">' + semChecklists.length + ' checklist(s)</div>';
html += '</div>';
html += '<div class="checklist-semester-content" id="semester-' + ano + '-' + sem + '">';
if (semChecklists.length === 0) {
html += '<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 13px;">Nenhum checklist neste semestre</div>';
} else {
semChecklists.forEach(function(chk) {
const dataFmt = new Date(chk.data + 'T12:00:00').toLocaleDateString('pt-BR');
html += '<div class="checklist-item-card">';
html += '<div class="checklist-item-header">';
html += '<div>';
html += '<div class="checklist-item-title">' + chk.colaborador + ' - ' + chk.setor + '</div>';
html += '<div class="checklist-item-meta">';
html += '<div class="ticket-meta-item">📅 ' + dataFmt + '</div>';
html += '<div class="ticket-meta-item">👤 Por: ' + chk.created_by + '</div>';
html += '</div>';
html += '</div>';
html += '<div class="checklist-item-actions">';
html += '<button class="btn btn-outline btn-sm" onclick="verDetalhesChecklist(\'' + chk.id + '\')">Ver Detalhes</button>';
if (currentUser && currentUser.role === 'admin') {
html += ' <button class="btn btn-danger-outline btn-sm" onclick="excluirChecklist(\'' + chk.id + '\', \'' + ano + '\', \'' + sem + '\')">🗑️ Excluir</button>';
}
html += '</div>';
html += '</div>';
const totalChecks = chk.limpeza.length + chk.organizacao.length + chk.conservacao.length + chk.seguranca.length + chk.registro.length;
html += '<div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">✅ ' + totalChecks + ' itens verificados</div>';
if (chk.obs) {
html += '<div style="font-size: 12px; color: var(--text-muted); margin-top: 4px; font-style: italic;">📝 ' + chk.obs.substring(0, 100) + (chk.obs.length > 100 ? '...' : '') + '</div>';
}
html += '</div>';
});
}
html += '</div>';
html += '</div>';
});
html += '</div>';
html += '</div>';
});
container.innerHTML = html;
}
function toggleYearFolder(ano) {
const content = document.getElementById('year-' + ano);
content.classList.toggle('active');
}
function toggleSemesterFolder(ano, sem) {
const content = document.getElementById('semester-' + ano + '-' + sem);
content.classList.toggle('active');
}
function verDetalhesChecklist(checklistId) {
const checklists = JSON.parse(localStorage.getItem(SK.checklists) || '{}');
let checklist = null;
for (const ano in checklists) {
for (const sem in checklists[ano]) {
const found = checklists[ano][sem].find(function(c) { return c.id === checklistId; });
if (found) {
checklist = found;
break;
}
}
if (checklist) break;
}
if (!checklist) return;
const dataFmt = new Date(checklist.data + 'T12:00:00').toLocaleDateString('pt-BR');
const secoes = [
{ titulo: 'LIMPEZA', itens: checklist.limpeza, total: 4 },
{ titulo: 'ORGANIZAÇÃO', itens: checklist.organizacao, total: 3 },
{ titulo: 'CONSERVAÇÃO FÍSICA', itens: checklist.conservacao, total: 4 },
{ titulo: 'SEGURANÇA', itens: checklist.seguranca, total: 3 },
{ titulo: 'REGISTRO — TI', itens: checklist.registro, total: 3 }
];
let html = '<div class="modal-title">Checklist: ' + checklist.colaborador + '</div>';
html += '<div class="modal-subtitle">' + checklist.setor + ' • ' + dataFmt + ' • ' + checklist.semestre + '° Semestre</div>';
html += '<div style="margin: 20px 0;">';
secoes.forEach(function(sec) {
html += '<div style="margin-bottom: 16px;">';
html += '<div style="background: var(--gold-primary); color: var(--black-primary); padding: 8px 16px; font-weight: 700; border-radius: 6px 6px 0 0;">' + sec.titulo + ' (' + sec.itens.length + '/' + sec.total + ')</div>';
html += '<div style="background: var(--black-secondary); padding: 12px 16px; border-radius: 0 0 6px 6px;">';
if (sec.itens.length === 0) {
html += '<div style="color: var(--text-muted); font-size: 13px;">Nenhum item verificado</div>';
} else {
sec.itens.forEach(function(item) {
html += '<div style="padding: 6px 0; border-bottom: 1px solid var(--border-subtle); font-size: 13px;">✅ ' + item + '</div>';
});
}
html += '</div>';
html += '</div>';
});
html += '</div>';
if (checklist.obs) {
html += '<div style="margin: 16px 0; padding: 16px; background: var(--black-secondary); border-radius: 8px;">';
html += '<div style="font-weight: 700; margin-bottom: 8px; color: var(--gold-primary);">Observações:</div>';
html += '<div style="font-size: 13px; line-height: 1.6;">' + checklist.obs + '</div>';
html += '</div>';
}
html += '<div style="margin-top: 20px; padding: 16px; background: var(--black-secondary); border-radius: 8px;">';
html += '<div style="font-weight: 700; margin-bottom: 12px; color: var(--gold-primary);">Assinaturas:</div>';
html += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">';
html += '<div><div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">Colaborador</div><div style="font-size: 13px;">' + (checklist.assColab || '—') + '</div></div>';
html += '<div><div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">Gestão TI/Marketing</div><div style="font-size: 13px;">' + (checklist.assQualidade || '—') + '</div></div>';
html += '<div><div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">TI — Fernanda</div><div style="font-size: 13px;">' + (checklist.assTI || '—') + '</div></div>';
html += '</div>';
html += '</div>';
document.getElementById('checklist-detalhes-content').innerHTML = html;
document.getElementById('modal-checklist-detalhes').classList.add('active');
}
function excluirChecklist(checklistId, ano, semestre) {
if (!currentUser || currentUser.role !== 'admin') {
showToast('Apenas administradores podem excluir checklists.');
return;
}
const motivo = prompt('Esta ação é PERMANENTE e não pode ser desfeita.\nInforme o motivo da exclusão deste checklist:');
if (motivo === null) return;
const motivoLimpo = motivo.trim();
if (!motivoLimpo) {
showToast('É necessário informar um motivo para exclusão.');
return;
}
const checklists = JSON.parse(localStorage.getItem(SK.checklists) || '{}');
if (checklists[ano] && checklists[ano][semestre]) {
const idx = checklists[ano][semestre].findIndex(function(c) { return c.id === checklistId; });
if (idx !== -1) {
const checklist = checklists[ano][semestre][idx];
checklists[ano][semestre].splice(idx, 1);
localStorage.setItem(SK.checklists, JSON.stringify(checklists));
addLog('Checklist Excluído', 'Checklist de ' + checklist.colaborador + ' (' + semestre + '° Semestre/' + ano + ') foi excluído permanentemente por ' + currentUser.name + '. Motivo: ' + motivoLimpo, 'exclusao');
showToast('Checklist excluído permanentemente!');
renderChecklistsOrganizados();
}
}
}
window.addEventListener('load', initApp);
document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.classList.remove('active'); });
});
