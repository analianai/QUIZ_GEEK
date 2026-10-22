"use strict";

/*
 * QUIZ GEEK: HTML + CSS + JavaScript puro, sem instalação de dependências.
 * Fonte oficial das 50 questões: perguntas.json.
 * No GitHub Pages, o navegador lê o JSON com fetch().
 * Ao abrir index.html diretamente (file://), usamos dados-offline.js,
 * um espelho fiel do JSON, porque navegadores bloqueiam fetch() local.
 */

const LETRAS = ["A", "B", "C", "D"];
const CHAVE_SALVAMENTO = "quiz-geek-50-v1";

const tela = {
  inicio: document.querySelector("#intro"),
  painel: document.querySelector("#painelQuiz"),
  fim: document.querySelector("#fim"),
  botaoComecar: document.querySelector("#btnComecar"),
  botaoProxima: document.querySelector("#btnProxima"),
  botaoZerar: document.querySelector("#btnZerar"),
  botaoReiniciarFinal: document.querySelector("#btnReiniciarFinal"),
  categoria: document.querySelector("#categoria"),
  dificuldade: document.querySelector("#dificuldade"),
  numero: document.querySelector("#numeroPergunta"),
  pergunta: document.querySelector("#perguntaTexto"),
  opcoes: document.querySelector("#opcoes"),
  feedback: document.querySelector("#feedback"),
  feedbackTitulo: document.querySelector("#feedbackTitulo"),
  feedbackDetalhe: document.querySelector("#feedbackDetalhe"),
  instrucao: document.querySelector("#instrucao"),
  contador: document.querySelector("#contadorTopo"),
  estado: document.querySelector("#estadoCarregamento")
};

let banco = [];
let estado = null;

function conferirBanco(dados) {
  if (!dados || !Array.isArray(dados.questoes) || dados.questoes.length !== 50) {
    throw new Error("O arquivo JSON precisa conter exatamente 50 questões.");
  }
  const ids = new Set();
  for (const q of dados.questoes) {
    if (!Number.isInteger(q.id) || ids.has(q.id)) throw new Error("Identificador de questão duplicado ou inválido.");
    if (typeof q.pergunta !== "string" || !q.pergunta.trim()) throw new Error("Há uma pergunta vazia.");
    if (typeof q.categoria !== "string" || typeof q.dificuldade !== "string") throw new Error("Metadados incompletos.");
    if (!q.alternativas || Object.keys(q.alternativas).sort().join("") !== "ABCD") {
      throw new Error(`A questão ${q.id} precisa ter as alternativas A, B, C e D.`);
    }
    if (!LETRAS.includes(q.respostaCorreta)) throw new Error(`Resposta inválida na questão ${q.id}.`);
    if (!LETRAS.every(letra => typeof q.alternativas[letra] === "string" && q.alternativas[letra].trim())) {
      throw new Error(`Alternativa vazia na questão ${q.id}.`);
    }
    if (new Set(Object.values(q.alternativas).map(a => a.trim().toLowerCase())).size !== 4) {
      throw new Error(`Alternativas repetidas na questão ${q.id}.`);
    }
    ids.add(q.id);
  }
  return dados.questoes;
}

async function carregarPerguntas() {
  // Em páginas hospedadas, lê o JSON externo. Não são necessárias bibliotecas.
  if (location.protocol !== "file:") {
    try {
      const resposta = await fetch("./perguntas.json", { cache: "no-store" });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const dados = await resposta.json();
      const perguntas = conferirBanco(dados);
      document.documentElement.dataset.fonteQuestoes = "json";
      return perguntas;
    } catch (erro) {
      console.warn("Não foi possível ler perguntas.json. Tentando cópia offline.", erro);
    }
  }
  // Permite duplo clique no arquivo HTML mesmo sem internet ou servidor local.
  const perguntas = conferirBanco(window.QUIZ_GEEK_DADOS_OFFLINE);
  document.documentElement.dataset.fonteQuestoes = "offline";
  return perguntas;
}

function embaralhar(lista) {
  const resultado = [...lista];
  for (let i = resultado.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
  }
  return resultado;
}

function novoEstado() {
  return {
    ordem: embaralhar(banco.map(q => q.id)),
    posicao: -1,
    escolha: null
  };
}

function salvar() {
  try { localStorage.setItem(CHAVE_SALVAMENTO, JSON.stringify(estado)); }
  catch (_) { /* Alguns navegadores desativam armazenamento no modo privado. */ }
}

function carregarEstadoSalvo() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_SALVAMENTO));
    const ids = new Set(banco.map(q => q.id));
    if (!bruto || !Array.isArray(bruto.ordem) || bruto.ordem.length !== banco.length ||
        new Set(bruto.ordem).size !== banco.length || !bruto.ordem.every(id => ids.has(id)) ||
        !Number.isInteger(bruto.posicao) || bruto.posicao < -1 || bruto.posicao > banco.length ||
        (bruto.escolha !== null && !LETRAS.includes(bruto.escolha))) return null;
    if ((bruto.posicao < 0 || bruto.posicao >= banco.length) && bruto.escolha !== null) return null;
    return bruto;
  } catch (_) { return null; }
}

function perguntaAtual() {
  return banco.find(q => q.id === estado.ordem[estado.posicao]);
}

function mostrarApenas(id) {
  for (const nome of ["inicio", "painel", "fim"]) {
    tela[nome].classList.toggle("oculto", nome !== id);
  }
}

function atualizarContador() {
  const quantas = Math.min(Math.max(estado.posicao + 1, 0), banco.length);
  tela.contador.textContent = `${quantas} / ${banco.length} sorteadas`;
  tela.botaoZerar.classList.toggle("oculto", estado.posicao < 0 || estado.posicao >= banco.length);
}

function desenhar() {
  atualizarContador();
  if (estado.posicao < 0) {
    mostrarApenas("inicio");
    return;
  }
  if (estado.posicao >= banco.length) {
    mostrarApenas("fim");
    return;
  }

  mostrarApenas("painel");
  const questao = perguntaAtual();
  tela.categoria.textContent = questao.categoria;
  tela.dificuldade.textContent = `NÍVEL ${questao.dificuldade.toLocaleUpperCase("pt-BR")}`;
  tela.numero.textContent = `PERGUNTA ${String(estado.posicao + 1).padStart(2, "0")} / ${banco.length}`;
  tela.pergunta.textContent = questao.pergunta;
  tela.opcoes.replaceChildren();

  for (const letra of LETRAS) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "opcao";
    botao.dataset.letra = letra;
    botao.setAttribute("aria-label", `${letra}: ${questao.alternativas[letra]}`);

    const marca = document.createElement("span");
    marca.className = "opcao-letra";
    marca.textContent = letra;
    const texto = document.createElement("span");
    texto.className = "opcao-texto";
    texto.textContent = questao.alternativas[letra];
    botao.append(marca, texto);
    botao.addEventListener("click", () => responder(letra));
    tela.opcoes.append(botao);
  }

  tela.feedback.className = "feedback oculto";
  tela.botaoProxima.classList.add("oculto");
  tela.instrucao.classList.remove("oculto");
  if (estado.escolha !== null) aplicarResultado(estado.escolha);
}

function responder(letra) {
  if (!LETRAS.includes(letra) || estado.posicao < 0 || estado.posicao >= banco.length || estado.escolha !== null) return;
  estado.escolha = letra;
  salvar();
  aplicarResultado(letra);
}

function aplicarResultado(letra) {
  const q = perguntaAtual();
  const acertou = q.respostaCorreta === letra;

  for (const botao of tela.opcoes.querySelectorAll("button")) {
    const alternativa = botao.dataset.letra;
    botao.disabled = true; // A pergunta só pode ser respondida uma vez.
    botao.classList.add("bloqueada");
    if (alternativa === q.respostaCorreta) {
      botao.classList.remove("bloqueada");
      botao.classList.add("correta");
    } else if (alternativa === letra) {
      botao.classList.remove("bloqueada");
      botao.classList.add("errada");
    }
  }

  tela.feedback.className = `feedback ${acertou ? "sucesso" : "falha"}`;
  tela.feedbackTitulo.textContent = acertou ? "✓ ACERTOU!" : "✕ ERROU!";
  tela.feedbackDetalhe.textContent = acertou
    ? `Resposta correta: ${q.respostaCorreta}`
    : `Resposta correta: ${q.respostaCorreta} — ${q.alternativas[q.respostaCorreta]}`;
  tela.botaoProxima.textContent = estado.posicao === banco.length - 1 ? "CONCLUIR QUIZ →" : "PRÓXIMA PERGUNTA →";
  tela.botaoProxima.classList.remove("oculto");
  tela.instrucao.classList.add("oculto");
}

function sortearProxima() {
  if (!estado || estado.posicao >= banco.length) return;
  if (estado.posicao >= 0 && estado.escolha === null) return; // Evita pular uma questão sem responder.
  estado.posicao += 1;
  estado.escolha = null;
  salvar();
  desenhar();
  if (estado.posicao < banco.length) {
    tela.pergunta.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}

function recomeçar(exigirConfirmacao = true) {
  if (exigirConfirmacao && !window.confirm("Recomeçar o quiz? A sequência atual será perdida.")) return;
  estado = novoEstado();
  salvar();
  desenhar();
}

async function iniciar() {
  try {
    banco = await carregarPerguntas();
    estado = carregarEstadoSalvo() ?? novoEstado();
    salvar();
    tela.botaoComecar.disabled = false;
    tela.estado.textContent = "Pronto para jogar";
    tela.botaoComecar.addEventListener("click", sortearProxima);
    tela.botaoProxima.addEventListener("click", sortearProxima);
    tela.botaoZerar.addEventListener("click", () => recomeçar(true));
    tela.botaoReiniciarFinal.addEventListener("click", () => recomeçar(false));
    document.addEventListener("keydown", (evento) => {
      if (evento.altKey || evento.ctrlKey || evento.metaKey || evento.repeat) return;
      if (estado.posicao >= 0 && estado.posicao < banco.length && estado.escolha === null) {
        const letra = evento.key.toUpperCase();
        if (LETRAS.includes(letra)) responder(letra);
      } else if (evento.key === "Enter" && estado.posicao >= 0 && estado.escolha !== null) {
        if (document.activeElement?.tagName !== "BUTTON") sortearProxima();
      }
    });
    desenhar();
  } catch (erro) {
    console.error(erro);
    tela.estado.textContent = "Falha ao carregar perguntas";
    document.querySelector(".texto-intro").textContent = "Não foi possível abrir o banco de perguntas. Confira se os arquivos foram extraídos juntos, na mesma pasta.";
  }
}

iniciar();
