// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'hoje_e_onde.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');

    // 1. Tabela de USUÁRIOS
    db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nomeCompleto TEXT NOT NULL,
        genero TEXT,
        email TEXT UNIQUE NOT NULL,
        cpf_cnpj TEXT UNIQUE NOT NULL,
        endereco TEXT,
        cidade TEXT,
        estado TEXT,
        celular TEXT,
        cep TEXT,
        senha TEXT NOT NULL,
        tipo TEXT DEFAULT 'visitante'
      )
    `, (err) => {
      if (err) console.error('Erro ao criar a tabela usuarios:', err.message);
      else console.log('Tabela de usuários pronta.');
    });

    // 2. Tabela de EVENTOS (COLUNA 'imagem' ADICIONADA)
    db.run(`
      CREATE TABLE IF NOT EXISTS eventos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descricao TEXT,
        data TEXT NOT NULL,
        duracao TEXT,
        local TEXT NOT NULL,
        publicoAlvo TEXT,
        tipo TEXT NOT NULL,
        organizadorId INTEGER,
        aprovado BOOLEAN DEFAULT 0,
        imagem TEXT, 
        FOREIGN KEY (organizadorId) REFERENCES usuarios(id)
      )
    `, (err) => {
      if (err) console.error('Erro ao criar a tabela eventos:', err.message);
      else console.log('Tabela de eventos pronta.');
    });

    // 3. Tabela de EVENTOS SALVOS
    db.run(`
      CREATE TABLE IF NOT EXISTS eventos_salvos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuarioId INTEGER NOT NULL,
        eventoId INTEGER NOT NULL,
        UNIQUE(usuarioId, eventoId),
        FOREIGN KEY (usuarioId) REFERENCES usuarios(id),
        FOREIGN KEY (eventoId) REFERENCES eventos(id)
      )
    `, (err) => {
      if (err) console.error('Erro ao criar a tabela eventos_salvos:', err.message);
      else console.log('Tabela de eventos salvos pronta.');
    });
    
    // 4. Tabela de VOTOS
    db.run(`
      CREATE TABLE IF NOT EXISTS votos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuarioId INTEGER NOT NULL,
        eventoId INTEGER NOT NULL,
        tipoVoto TEXT NOT NULL, 
        UNIQUE(usuarioId, eventoId),
        FOREIGN KEY (usuarioId) REFERENCES usuarios(id),
        FOREIGN KEY (eventoId) REFERENCES eventos(id)
      )
    `, (err) => {
        if (err) console.error('Erro ao criar a tabela votos:', err.message);
        else console.log('Tabela de votos pronta.');
    });
    
    // 5. Tabela de TIPOS DE EVENTO
    db.run(`
      CREATE TABLE IF NOT EXISTS tipos_evento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE NOT NULL
      )
    `, (err) => {
      if (err) {
          console.error('Erro ao criar a tabela tipos_evento:', err.message);
      } else {
          console.log('Tabela de tipos de evento pronta.');
          const tiposIniciais = ['Festa', 'Evento Cultural/Social', 'Promoção', 'Oportunidade', 'Outro'];
          tiposIniciais.forEach(tipo => {
              db.run("INSERT OR IGNORE INTO tipos_evento (nome) VALUES (?)", [tipo]);
          });
      }
    });
  }
});

module.exports = db;