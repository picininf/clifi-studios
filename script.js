// CONFIGURAÇÕES DO SEU SUPABASE
const SUPABASE_URL = 'https://vbteldgxbjzcyeupvqfh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gFZvU5AhfALyay6DoFcirA_vD-R4sd-';

// LINK DO SEU GOOGLE APPS SCRIPT (PLANILHA)
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxInzHUEGZ4kXJkcbJvsX2AZvUOUXDWFTEKMCeIlN98tuTq1W_36pqcGEHRLVLfbanSzQ/exec';

// Inicialização segura para navegadores
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

if (!supabase) {
    console.error("Erro fatal: A biblioteca do Supabase não foi carregada no HTML!");
}

// EXECUTA ASSIM QUE A PÁGINA CARREGAR
document.addEventListener("DOMContentLoaded", async function() {
    if (!supabase) return;

    // 1. VERIFICAÇÃO DE SESSÃO ATIVA (Para todas as páginas)
    const { data: { session } } = await supabase.auth.getSession();

    // ==========================================
    // LÓGICA DA HOME (index.html)
    // ==========================================
    if (document.getElementById('menu-auth')) {
        const menuAdm = document.getElementById('menu-adm');
        const menuAuth = document.getElementById('menu-auth');
        const inputNome = document.getElementById('nome');
        const inputEmail = document.getElementById('email');

        if (session) {
            const usuario = session.user;
            if (inputNome) inputNome.value = usuario.user_metadata.nome || '';
            if (inputEmail) inputEmail.value = usuario.email;

            menuAuth.innerHTML = `<a href="#" id="btn-logout" style="color: #aaa;">Sair</a>`;
            document.getElementById('btn-logout').addEventListener('click', async (e) => {
                e.preventDefault();
                await supabase.auth.signOut();
                window.location.reload();
            });

            if (usuario.email === 'filipepicinin7@gmail.com') {
                if (menuAdm) menuAdm.style.display = 'block';
            }
        }
    }

    // ==========================================
    // LÓGICA DO REGISTRO (registro.html)
    // ==========================================
    const formRegistro = document.getElementById('form-registro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const nome = document.getElementById('reg-nome').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const senha = document.getElementById('reg-senha').value;

            if (senha.length < 6) {
                alert("A senha precisa ter no mínimo 6 caracteres!");
                return;
            }

            try {
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: senha,
                    options: { data: { nome: nome } }
                });

                if (error) {
                    alert("Erro no cadastro: " + error.message);
                } else {
                    alert("Conta criada com sucesso! Redirecionando...");
                    window.location.href = 'login.html';
                }
            } catch (err) {
                alert("Erro interno: " + err.message);
            }
        });
    }

    // ==========================================
    // LÓGICA DO LOGIN (login.html)
    // ==========================================
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value.trim();
            const senha = document.getElementById('login-senha').value;

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: senha
                });

                if (error) {
                    alert("Erro no login: " + error.message);
                } else {
                    alert("Login efetuado com sucesso!");
                    window.location.href = 'index.html';
                }
            } catch (err) {
                alert("Erro interno: " + err.message);
            }
        });
    }

    // ==========================================
    // LÓGICA DA DASHBOARD (dashboard.html)
    // ==========================================
    if (document.getElementById('tabela-vendas-corpo')) {
        if (!session || session.user.email !== 'filipepicinin7@gmail.com') {
            window.location.href = 'login.html';
            return;
        }
        carregarDadosDashboard();
    }
});

// ==========================================
// FUNÇÕES AUXILIARES DE AGENDAMENTO
// ==========================================
function selecionarServico(idServico) {
    const selectElement = document.getElementById('servico-selecionado');
    if (selectElement) {
        selectElement.value = idServico;
        atualizarTotal();
        document.getElementById('agendamento').scrollIntoView({ behavior: 'smooth' });
    }
}

function atualizarTotal() {
    const selectElement = document.getElementById('servico-selecionado');
    if (!selectElement) return;

    const opcaoSelecionada = selectElement.options[selectElement.selectedIndex];
    const resumoServico = document.getElementById('resumo-servico');
    const resumoPreco = document.getElementById('resumo-preco');
    const totalPagar = document.getElementById('total-pagar');
    
    if (opcaoSelecionada && !opcaoSelecionada.disabled) {
        const nomeApenas = opcaoSelecionada.text.split(' (')[0]; 
        const valor = parseFloat(opcaoSelecionada.getAttribute('data-valor'));
        const valorFormatado = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        resumoServico.innerText = nomeApenas;
        resumoPreco.innerText = valorFormatado;
        totalPagar.innerText = valorFormatado;
    } else {
        resumoServico.innerText = "Nenhum"; resumoPreco.innerText = "R$ 0,00"; totalPagar.innerText = "R$ 0,00";
    }
}

async function carregarHorariosDisponiveis() {
    const dataSelecionada = document.getElementById('data').value;
    const selectHora = document.getElementById('hora');
    if (!dataSelecionada || !supabase) return;

    selectHora.disabled = true;
    selectHora.innerHTML = '<option value="" disabled selected>Buscando horários...</option>';

    const { data: ocupados, error } = await supabase
        .from('agendamentos')
        .select('horario')
        .eq('data_agendamento', dataSelecionada);

    if (error) { 
        console.error(error); 
        return; 
    }

    const ocupadosFormatados = ocupados.map(o => o.horario.substring(0, 5));
    const todosHorarios = ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"];

    selectHora.innerHTML = '<option value="" disabled selected>Selecione o horário</option>';
    todosHorarios.forEach(h => {
        if (!ocupadosFormatados.includes(h)) {
            const option = document.createElement('option');
            option.value = h; option.text = h + 'h';
            selectHora.appendChild(option);
        }
    });
    selectHora.disabled = false;
}

const formAgendamento = document.getElementById('form-agendamento');
if (formAgendamento) {
    formAgendamento.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!supabase) return;

        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const servicoId = document.getElementById('servico-selecionado').value;
        const data = document.getElementById('data').value;
        const hora = document.getElementById('hora').value;

        const tabelaServicos = {
            "1": { nome: "Sessão de Gravação", preco: 250.00 },
            "2": { nome: "Gravação + Edição Completa", preco: 890.00 },
            "3": { nome: "Edição de Vídeo", preco: 450.00 }
        };

        const servicoNome = tabelaServicos[servicoId].nome;
        const valorTotal = tabelaServicos[servicoId].preco;

        try {
            // 1. Salva no Supabase
            const { error } = await supabase.from('agendamentos').insert([{
                nome, email, servico: servicoNome, data_agendamento: data, horario: hora, valor_total: valorTotal
            }]);

            if (error) {
                alert("Erro ao salvar no banco: " + error.message);
                return;
            }

            // 2. Envia para o Google Sheets de forma assíncrona/silenciosa
            await fetch(GOOGLE_SHEETS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nome: nome,
                    email: email,
                    servico: servicoNome,
                    data_agendamento: data.split('-').reverse().join('/'), 
                    horario: hora + 'h',
                    valor_total: valorTotal
                })
            });

            alert("Agendamento efetuado com sucesso e registrado na planilha!"); 
            window.location.reload();

        } catch (err) {
            console.error("Erro na integração:", err);
            alert("Agendamento efetuado com sucesso!");
            window.location.reload();
        }
    });
}

async function carregarDadosDashboard() {
    if (!supabase) return;
    const { data: agendamentos, error } = await supabase.from('agendamentos').select('*').order('data_criacao', { ascending: false });
    if (error) return;

    let faturamentoTotal = 0;
    const corpoTabela = document.getElementById('tabela-vendas-corpo');
    corpoTabela.innerHTML = '';

    agendamentos.forEach(i => {
        faturamentoTotal += parseFloat(i.valor_total);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i.nome}</td>
            <td>${i.email}</td>
            <td>${i.servico}</td>
            <td>${i.data_agendamento.split('-').reverse().join('/')}</td>
            <td>${i.horario.substring(0,5)}h</td>
            <td>R$ ${parseFloat(i.valor_total).toFixed(2).replace('.', ',')}</td>
        `;
        corpoTabela.appendChild(tr);
    });

    document.getElementById('dash-faturamento').innerText = `R$ ${faturamentoTotal.toFixed(2).replace('.', ',')}`;
    document.getElementById('dash-vendas').innerText = `${agendamentos.length} clipes`;
}