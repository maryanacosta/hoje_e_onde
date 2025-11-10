// app.js
const express = require('express');
const multer = require('multer'); // <--- NOVO
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./database');
const app = express();
const PORT = 3000;
const saltRounds = 10;

// --- Funções de Inicialização de Dados (CORREÇÃO DE DUPLICAÇÃO E IMAGEM) ---

// Função para garantir que os eventos iniciais estejam corretos
function initializeDatabase() {
    const dataAtual = new Date().toISOString().slice(0, 10);
    const eventosIniciais = [
        // CORREÇÃO: Apenas o nome do arquivo, sem o prefixo 'img/'
        { titulo: 'Quintaneja', local: 'Salão Parthenon', duracao: '21:00', tipo: 'Festa', imagem: 'quintaneja.jpg', data: dataAtual },
        { titulo: 'NOISE Fest', local: 'McBee Music Bar', duracao: '20:00', tipo: 'Festa', imagem: 'noisefest.jpeg', data: dataAtual },
        { titulo: 'Encontro de Motociclistas', local: 'Espaço de eventos - UFV', duracao: '11:00', tipo: 'Evento Cultural/Social', imagem: 'motos.jpeg', data: dataAtual },
    ];

    // 1. Limpa entradas antigas do sistema (organizadorId = 0) para remover duplicatas e caminhos errados.
    db.run('DELETE FROM eventos WHERE organizadorId = 0', function(err) {
        if (err) {
            console.error('Erro ao limpar eventos iniciais antigos:', err.message);
            return;
        }
        console.log(`Sucesso: ${this.changes} eventos iniciais antigos foram removidos para evitar duplicação e corrigir a imagem.`);

        // 2. Insere as entradas corretas e limpas.
        eventosIniciais.forEach(evento => {
            // Incluído o campo 'imagem' no INSERT
            const query = `
                INSERT INTO eventos 
                (titulo, descricao, data, duracao, local, publicoAlvo, tipo, organizadorId, aprovado, imagem) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const values = [
                evento.titulo, 
                'Descrição detalhada do evento inicial.', 
                evento.data, 
                evento.duracao, 
                evento.local, 
                'Público em geral', 
                evento.tipo, 
                0, // organizadorId 0 para eventos do sistema
                1, // aprovado = 1
                evento.imagem // nome do arquivo (e.g., 'quintaneja.jpg')
            ];

            db.run(query, values, function(err) {
                if (err) {
                    console.error(`Erro ao inserir evento inicial "${evento.titulo}":`, err.message);
                } else {
                    console.log(`Evento inicial "${evento.titulo}" inserido e aprovado.`);
                }
            });
        });
    });
}

// app.js (Configuração Multer)

// Configuração do Multer para armazenamento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Onde os arquivos serão salvos (dentro da pasta public)
        cb(null, 'public/img/'); 
    },
    filename: (req, file, cb) => {
        // Cria um nome de arquivo único: campo-originalNome-timestamp.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

const upload = multer({ storage: storage });


// --- Middlewares de Configuração ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Configuração da Sessão
app.use(session({
    secret: 'seu_segredo_super_secreto_aqui_troque_isso', 
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 }
}));

// --- Funções Auxiliares (Middlewares) ---
function requireLogin(req, res, next) {
    if (req.session.isLogged) {
        next(); 
    } else {
        res.redirect('/login?erro=Você precisa estar logado para acessar esta página.');
    }
}

function requireAdmin(req, res, next) {
    if (!req.session.isLogged) {
        return res.redirect('/login?erro=Acesso restrito a administradores.');
    }
    db.get('SELECT tipo FROM usuarios WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user || user.tipo !== 'admin') {
            return res.status(403).send('Acesso Negado.');
        }
        next();
    });
}

// --- ROTAS DE AUTENTICAÇÃO (Cadastro/Login/Logout) ---
app.get('/cadastro', (req, res) => { res.render('cadastro'); });
app.post('/cadastro', (req, res) => {
    const { nomeCompleto, genero, email, cpf_cnpj, endereco, cidade, estado, celular, cep, senha } = req.body;
    bcrypt.hash(senha, saltRounds, (err, hash) => {
        if (err) return res.status(500).send('Erro interno ao processar a senha.');
        const query = `INSERT INTO usuarios (nomeCompleto, genero, email, cpf_cnpj, endereco, cidade, estado, celular, cep, senha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [nomeCompleto, genero || null, email, cpf_cnpj, endereco, cidade, estado, celular, cep, hash];
        db.run(query, values, function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) return res.status(400).send('Erro: E-mail ou CPF/CNPJ já cadastrado.');
                return res.status(500).send('Erro interno ao cadastrar o usuário.');
            }
            res.redirect('/login');
        });
    });
});
app.get('/login', (req, res) => { res.render('login', { erro: req.query.erro }); });
// app.js (Trecho da rota POST /login)

app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    db.get('SELECT * FROM usuarios WHERE email = ?', [email], (err, user) => {
        if (err || !user) return res.redirect('/login?erro=Email ou senha inválidos.');
        bcrypt.compare(senha, user.senha, (err, result) => {
            if (result) {
                req.session.isLogged = true;
                req.session.userId = user.id;
                req.session.userNome = user.nomeCompleto.split(' ')[0];
                // NOVO: Salvando o tipo de usuário na sessão
                req.session.userTipo = user.tipo; 
                res.redirect('/');
            } else {
                res.redirect('/login?erro=Email ou senha inválidos.');
            }
        });
    });
});
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.redirect('/');
        res.redirect('/');
    });
});


// --- ROTA PRINCIPAL (Home) ---
app.get('/', (req, res) => {
    const dataBusca = req.query.data || new Date().toISOString().slice(0, 10);
    const ordenarPor = req.query.ordenar || 'horario';
    const filtrarPorTipo = req.query.tipo || 'todos';

    const dataAtual = new Date(dataBusca + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso horário
    const dataAnterior = new Date(dataAtual); dataAnterior.setDate(dataAtual.getDate() - 1);
    const dataPosterior = new Date(dataAtual); dataPosterior.setDate(dataAtual.getDate() + 1);
    const formatarExibicao = (data) => data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const formatarLink = (data) => data.toISOString().slice(0, 10);

    let orderByClause = '';
    let whereTipoClause = '';
    const queryParams = [dataBusca]; 

    switch (ordenarPor) {
        case 'popularidade':
            orderByClause = 'ORDER BY (TotalPositivo - TotalNegativo) DESC, duracao ASC'; 
            break;
        case 'tipo':
            orderByClause = 'ORDER BY tipo ASC, duracao ASC';
            break;
        case 'horario':
        default:
            orderByClause = 'ORDER BY duracao ASC';
            break;
    }
    
    if (filtrarPorTipo !== 'todos') {
        whereTipoClause = ' AND e.tipo = ?'; 
        queryParams.push(filtrarPorTipo);
    }
    
    db.all('SELECT nome FROM tipos_evento', (err, tipos) => {
        const tiposDisponiveis = tipos ? tipos.map(t => t.nome) : [];

        const baseQuery = `
            SELECT 
                e.*, 
                SUM(CASE WHEN v.tipoVoto = 'positivo' THEN 1 ELSE 0 END) AS TotalPositivo,
                SUM(CASE WHEN v.tipoVoto = 'negativo' THEN 1 ELSE 0 END) AS TotalNegativo
            FROM eventos e
            LEFT JOIN votos v ON e.id = v.eventoId
            WHERE e.aprovado = 1 AND e.data = ? ${whereTipoClause}
            GROUP BY e.id
            ${orderByClause}
        `;
        
        db.all(baseQuery, queryParams, (err, eventosDoDia) => {
            if (err) { 
                console.error('Erro ao buscar eventos:', err.message); 
                eventosDoDia = []; 
            }
            
            res.render('index', { 
                eventos: eventosDoDia,
                isLogged: req.session.isLogged,
                userName: req.session.userNome,
                userTipo: req.session.userTipo || 'visitante', // NOVO: Passando o tipo
                dataBuscaAtiva: dataBusca,
                dataExibicao: formatarExibicao(dataAtual),
                linkAnterior: `/?data=${formatarLink(dataAnterior)}&ordenar=${ordenarPor}&tipo=${filtrarPorTipo}`,
                linkPosterior: `/?data=${formatarLink(dataPosterior)}&ordenar=${ordenarPor}&tipo=${filtrarPorTipo}`,
                exibicaoAnterior: formatarExibicao(dataAnterior),
                exibicaoPosterior: formatarExibicao(dataPosterior),
                tiposDisponiveis: tiposDisponiveis,
                ordenarAtivo: ordenarPor,
                filtroAtivo: filtrarPorTipo
            });
        });
    });
});


// --- ROTAS DE AÇÃO (Salvar, Votar, Detalhes) ---
app.post('/salvar-evento', requireLogin, (req, res) => {
    const { eventoId } = req.body;
    const usuarioId = req.session.userId;
    
    if (!eventoId || eventoId <= 0) {
         return res.status(400).json({ success: false, message: 'ID de evento inválido. Apenas eventos reais podem ser salvos.' });
    }
    
    const query = `INSERT OR IGNORE INTO eventos_salvos (usuarioId, eventoId) VALUES (?, ?)`;

    db.run(query, [usuarioId, eventoId], function(err) {
        if (err) return res.status(500).json({ success: false, message: 'Erro ao salvar o evento.' });
        
        if (this.changes > 0) {
            return res.status(200).json({ success: true, message: 'Evento salvo com sucesso!' });
        } else {
            return res.status(200).json({ success: false, message: 'Evento já estava salvo.' });
        }
    });
});

app.post('/votar', requireLogin, (req, res) => {
    const { eventoId, tipoVoto } = req.body; 
    const usuarioId = req.session.userId;

    const query = `
        INSERT INTO votos (usuarioId, eventoId, tipoVoto) 
        VALUES (?, ?, ?)
        ON CONFLICT(usuarioId, eventoId) DO UPDATE SET tipoVoto = excluded.tipoVoto
        WHERE tipoVoto != excluded.tipoVoto;
    `;
    
    db.run(query, [usuarioId, eventoId, tipoVoto], function(err) {
        if (err) {
            console.error('Erro ao votar:', err.message);
            return res.status(500).json({ success: false, message: 'Erro ao registrar o voto.' });
        }

        if (this.changes > 0) {
            const countQuery = `
                SELECT 
                    SUM(CASE WHEN tipoVoto = 'positivo' THEN 1 ELSE 0 END) AS TotalPositivo,
                    SUM(CASE WHEN tipoVoto = 'negativo' THEN 1 ELSE 0 END) AS TotalNegativo
                FROM votos WHERE eventoId = ?
            `;
            db.get(countQuery, [eventoId], (err, counts) => {
                if (err) return res.json({ success: true, message: 'Voto registrado/alterado, mas erro ao recontar.' });
                res.json({ success: true, message: 'Voto registrado com sucesso!', counts: counts });
            });
        } else {
             res.status(200).json({ success: false, message: 'Você já tinha votado dessa forma neste evento.', counts: {} });
        }
    });
});

// ROTA POST: Cadastro de novo Administrador por um Admin
// app.js (Encontre e substitua esta rota)

// ROTA POST: Cadastro de novo Administrador por um Admin
app.post('/admin/cadastrar-admin', requireAdmin, (req, res) => {
    // ATUALIZADO: Captura todos os campos obrigatórios do formulário
    const { nomeCompleto, genero, email, cpf_cnpj, endereco, cidade, estado, celular, cep, senha } = req.body;

    // Criptografa a senha
    bcrypt.hash(senha, saltRounds, (err, hash) => {
        if (err) return res.status(500).send('Erro interno ao processar a senha.');
        
        // Insere o usuário com todos os campos necessários e tipo 'admin'
        const query = `
            INSERT INTO usuarios 
            (nomeCompleto, genero, email, cpf_cnpj, endereco, cidade, estado, celular, cep, senha, tipo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin')
        `;
        const values = [nomeCompleto, genero || null, email, cpf_cnpj, endereco, cidade, estado, celular, cep, hash];
        
        db.run(query, values, function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) return res.status(400).send('Erro: E-mail ou CPF/CNPJ já cadastrado.');
                console.error('Erro detalhado ao cadastrar novo admin:', err.message);
                // Retorna a mensagem de erro que estava mascarando o problema
                return res.status(500).send('Erro interno ao cadastrar o administrador. Verifique o console do servidor.');
            }
            res.redirect('/admin?status=novo_admin_cadastrado');
        });
    });
});

app.get('/evento/:id', (req, res) => {
    const eventoId = req.params.id;
    const usuarioId = req.session.userId;
    const isLogged = req.session.isLogged;
    
    const queryDetalhe = `
        SELECT 
            e.*, 
            SUM(CASE WHEN v.tipoVoto = 'positivo' THEN 1 ELSE 0 END) AS TotalPositivo,
            SUM(CASE WHEN v.tipoVoto = 'negativo' THEN 1 ELSE 0 END) AS TotalNegativo
        FROM eventos e
        LEFT JOIN votos v ON e.id = v.eventoId
        WHERE e.id = ? AND e.aprovado = 1
        GROUP BY e.id
    `;
    
    db.get(queryDetalhe, [eventoId], (err, evento) => {
        if (err || !evento) return res.status(404).render('detalhe_evento', { evento: null, isLogged: isLogged });
        
        let usuarioVoto = null;
        let estaSalvo = false;
        
        if (isLogged) {
            db.get('SELECT tipoVoto FROM votos WHERE usuarioId = ? AND eventoId = ?', [usuarioId, eventoId], (err, voto) => {
                if (!err && voto) usuarioVoto = voto.tipoVoto;

                db.get('SELECT * FROM eventos_salvos WHERE usuarioId = ? AND eventoId = ?', [usuarioId, eventoId], (err, salvo) => {
                    if (!err && salvo) estaSalvo = true;

                    res.render('detalhe_evento', { 
                        evento: evento, 
                        isLogged: isLogged, 
                        userName: req.session.userNome,
                        usuarioVoto: usuarioVoto, 
                        estaSalvo: estaSalvo 
                    });
                });
            });
        } else {
            res.render('detalhe_evento', { 
                evento: evento, 
                isLogged: isLogged, 
                userName: null,
                usuarioVoto: null,
                estaSalvo: false
            });
        }
    });
});


// --- A: ÁREA DO USUÁRIO (/area-usuario) ---

app.get('/area-usuario', requireLogin, (req, res) => {
    const usuarioId = req.session.userId;
    
    db.all('SELECT * FROM eventos WHERE organizadorId = ? ORDER BY data DESC', [usuarioId], (errPub, publicados) => {
        
        const querySalvos = `
            SELECT 
                e.*,
                es.id AS idSalvo 
            FROM eventos e 
            JOIN eventos_salvos es ON e.id = es.eventoId 
            WHERE es.usuarioId = ?
            ORDER BY e.data DESC
        `;
        
        db.all(querySalvos, [usuarioId], (errSalvos, salvos) => {
            
            if (errPub) { console.error('Erro ao buscar eventos publicados:', errPub.message); publicados = []; }
            if (errSalvos) { console.error('Erro ao buscar eventos salvos:', errSalvos.message); salvos = []; }
            
            res.render('area_usuario', {
                userName: req.session.userNome,
                eventosPublicados: publicados || [],
                eventosSalvos: salvos || []
            });
        });
    });
});

app.post('/remover-salvo', requireLogin, (req, res) => {
    const { eventoId } = req.body;
    const usuarioId = req.session.userId;
    
    const query = `DELETE FROM eventos_salvos WHERE usuarioId = ? AND eventoId = ?`;

    db.run(query, [usuarioId, eventoId], function(err) {
        if (err) {
            console.error('Erro ao remover evento salvo:', err.message);
            return res.status(500).json({ success: false, message: 'Erro interno ao remover o evento da sua lista.' });
        }
        
        if (this.changes > 0) {
            return res.status(200).json({ success: true, message: 'Evento removido da sua lista com sucesso!' });
        } else {
            return res.status(200).json({ success: false, message: 'Evento não encontrado na sua lista.' });
        }
    });
});

// --- ROTAS DE SUBMISSÃO E ADMIN ---
app.get('/submeter-evento', requireLogin, (req, res) => { res.render('submeter_evento', { userName: req.session.userNome }); });
// app.js (Sua rota POST de submissão de evento, totalmente substituída)

app.post('/submeter-evento', requireLogin, upload.single('banner'), (req, res) => {
    // req.file contém informações sobre o arquivo se houver upload
    const nomeArquivo = req.file ? req.file.filename : null; 
    
    // Captura os dados do corpo (via Multer)
    const { titulo, descricao, data, duracao, local, publicoAlvo, tipo } = req.body;
    const organizadorId = req.session.userId;
    
    // SQL: Adiciona o campo 'imagem' na inserção
    const query = `
        INSERT INTO eventos 
        (titulo, descricao, data, duracao, local, publicoAlvo, tipo, organizadorId, imagem) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [titulo, descricao, data, duracao, local, publicoAlvo, tipo, organizadorId, nomeArquivo];

    db.run(query, values, function(err) {
        if (err) { 
            console.error('Erro ao submeter evento:', err.message); 
            return res.status(500).send('Erro interno ao salvar o evento.'); 
        }
        res.send(`<h1>Sucesso!</h1><p>Evento submetido com sucesso! Ele passará por aprovação administrativa antes de ser publicado.</p><a href="/">Voltar para a página inicial</a>`);
    });
});

app.get('/admin', requireAdmin, (req, res) => {
    const query = `SELECT e.*, u.nomeCompleto as organizadorNome FROM eventos e JOIN usuarios u ON e.organizadorId = u.id WHERE e.aprovado = 0`;
    db.all(query, (err, eventosPendentes) => {
        if (err) { eventosPendentes = []; }
        res.render('admin_painel', { eventos: eventosPendentes, userName: req.session.userNome });
    });
});
app.post('/admin/aprovar', requireAdmin, (req, res) => {
    const { eventoId, acao } = req.body;
    if (acao === 'aprovar') {
        db.run('UPDATE eventos SET aprovado = 1 WHERE id = ?', [eventoId], function(err) {
            if (err) return res.status(500).send('Erro ao aprovar evento.');
            res.redirect('/admin?status=aprovado');
        });
    } else if (acao === 'recusar') {
        db.run('DELETE FROM eventos WHERE id = ?', [eventoId], function(err) {
             if (err) return res.status(500).send('Erro ao recusar evento.');
            res.redirect('/admin?status=recusado');
        });
    } else {
        res.redirect('/admin');
    }
});

// app.js (Adicione esta nova rota junto com as outras rotas GET)

// ROTA: Calendário de Eventos
app.get('/calendario', (req, res) => {
    // Busca todos os eventos aprovados para preencher o calendário
    const query = `
        SELECT id, titulo, data, tipo, duracao
        FROM eventos 
        WHERE aprovado = 1 
        ORDER BY data ASC, duracao ASC
    `;

    db.all(query, (err, eventos) => {
        if (err) {
            console.error('Erro ao buscar eventos para o calendário:', err.message);
            eventos = [];
        }
        
        // Renderiza a view de calendário
        res.render('calendario', { 
            eventos: eventos,
            isLogged: req.session.isLogged,
            userName: req.session.userNome,
            // Passa o mês atual como default
            mesAtivo: req.query.mes || new Date().toISOString().slice(0, 7) // Formato YYYY-MM
        });
    });
});

// ROTA GET: Exibir formulário de cadastro de Admin (apenas para Admin)
app.get('/admin/cadastrar-admin', requireAdmin, (req, res) => {
    res.render('admin_cadastrar', { userName: req.session.userNome });
});

// --- INICIALIZAÇÃO ---
initializeDatabase(); // Chamando a função de correção e inserção
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});