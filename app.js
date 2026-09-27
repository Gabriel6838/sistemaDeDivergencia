'use strict';

/* =========================================================
   STOCKVISION
   CONTROLE INTELIGENTE DE DIVERGÊNCIAS
   ========================================================= */

/* =========================================================
   ESTADO GLOBAL
   ========================================================= */

const estado = {
  paginaAtual: 'inicio',

  competenciaAtual: null,
  competencias: [],

  produtoSelecionado: null,

  divergencias: [],
  resultadosPesquisa: [],

  filtros: {
    codigo: '',
    descricao: '',
    secao: '',
    competencia: '',
    status: '',
    tipo: ''
  },

  carregando: false
};


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

document.addEventListener('DOMContentLoaded', inicializarSistema);


async function inicializarSistema() {

  try {

    verificarSupabase();

    configurarNavegacao();
    configurarSidebar();
    configurarModais();
    configurarFormularios();
    configurarCalculoDivergencia();
    configurarPesquisa();
    configurarCompetencias();
    configurarTroca();

    await carregarDadosIniciais();

    navegarPara('inicio');

  } catch (erro) {

    console.error(
      'Erro ao inicializar o StockVision:',
      erro
    );

    mostrarToast(
      erro.message ||
      'Não foi possível inicializar o StockVision.',
      'erro'
    );

  }

}


/* =========================================================
   SUPABASE
   ========================================================= */

function verificarSupabase() {

  if (!window.supabaseClient) {

    throw new Error(
      'supabaseClient não foi encontrado. Verifique o arquivo supabase.js.'
    );

  }

}


/* =========================================================
   CARREGAMENTO INICIAL
   ========================================================= */

async function carregarDadosIniciais() {

  await carregarCompetencias();

  atualizarInterfaceCompetencia();

  preencherFiltroCompetencias();

  if (estado.competenciaAtual) {

    await Promise.all([
      carregarDadosInicio(),
      carregarDashboard()
    ]);

  } else {

    limparDashboard();
    mostrarEstadoSemCompetencia();

  }

}


/* =========================================================
   NAVEGAÇÃO
   ========================================================= */

function configurarNavegacao() {

  document
    .querySelectorAll('[data-page]')
    .forEach(botao => {

      botao.addEventListener('click', () => {

        const pagina =
          botao.dataset.page;

        navegarPara(pagina);

      });

    });

}


async function navegarPara(pagina) {

  const paginas = [
    'inicio',
    'nova-divergencia',
    'pesquisa',
    'dashboard',
    'competencias'
  ];

  if (!paginas.includes(pagina)) {
    return;
  }

  estado.paginaAtual = pagina;

  document
    .querySelectorAll('[data-page]')
    .forEach(botao => {

      botao.classList.toggle(
        'active',
        botao.dataset.page === pagina
      );

    });


  document
    .querySelectorAll('[id^="page-"]')
    .forEach(section => {

      section.classList.remove('active');

    });


  const paginaElemento =
    document.getElementById(
      `page-${pagina}`
    );


  if (paginaElemento) {

    paginaElemento.classList.add('active');

  }


  atualizarTituloPagina(pagina);

  fecharSidebarMobile();


  try {

    if (pagina === 'inicio') {

      await carregarDadosInicio();

    }

    if (pagina === 'dashboard') {

      await carregarDashboard();

    }

    if (pagina === 'pesquisa') {

      await carregarPesquisaInicial();

    }

    if (pagina === 'competencias') {

      await carregarPaginaCompetencias();

    }

    if (pagina === 'nova-divergencia') {

      prepararFormularioDivergencia();

    }

  } catch (erro) {

    console.error(
      `Erro ao carregar página ${pagina}:`,
      erro
    );

    mostrarToast(
      obterMensagemErro(erro),
      'erro'
    );

  }

}


function atualizarTituloPagina(pagina) {

  const titulos = {

    inicio: 'Início',

    'nova-divergencia':
      'Nova Divergência',

    pesquisa:
      'Pesquisar',

    dashboard:
      'Dashboard',

    competencias:
      'Competências'

  };


  const heading =
    document.getElementById(
      'pageHeading'
    );


  if (heading) {

    heading.textContent =
      titulos[pagina] ||
      'StockVision';

  }

}


/* =========================================================
   SIDEBAR
   ========================================================= */

function configurarSidebar() {

  const menuToggle =
    document.getElementById(
      'menuToggle'
    );

  const sidebarClose =
    document.getElementById(
      'sidebarClose'
    );

  const overlay =
    document.getElementById(
      'sidebarOverlay'
    );


  if (menuToggle) {

    menuToggle.addEventListener(
      'click',
      abrirSidebarMobile
    );

  }


  if (sidebarClose) {

    sidebarClose.addEventListener(
      'click',
      fecharSidebarMobile
    );

  }


  if (overlay) {

    overlay.addEventListener(
      'click',
      fecharSidebarMobile
    );

  }

}


function abrirSidebarMobile() {

  const sidebar =
    document.getElementById(
      'sidebar'
    );

  const overlay =
    document.getElementById(
      'sidebarOverlay'
    );


  sidebar?.classList.add('open');

  overlay?.classList.add('active');

}


function fecharSidebarMobile() {

  const sidebar =
    document.getElementById(
      'sidebar'
    );

  const overlay =
    document.getElementById(
      'sidebarOverlay'
    );


  sidebar?.classList.remove('open');

  overlay?.classList.remove('active');

}


/* =========================================================
   COMPETÊNCIAS
   ========================================================= */

async function carregarCompetencias() {

  const {
    data,
    error
  } =
    await window.supabaseClient
      .from('competencias')
      .select(
        'id, competencia, status, data_abertura, data_encerramento'
      )
      .order(
        'competencia',
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      'Erro ao carregar competências:',
      error
    );

    throw error;

  }


  estado.competencias =
    Array.isArray(data)
      ? data
      : [];


  /*
   * Nunca usamos o calendário para trocar
   * automaticamente a competência.
   *
   * Procuramos somente uma competência
   * explicitamente marcada como aberta.
   */

  const abertas =
    estado.competencias.filter(
      competencia =>
        competencia.status === 'aberta'
    );


  if (abertas.length > 0) {

    estado.competenciaAtual =
      abertas[0];

  } else {

    estado.competenciaAtual =
      null;

  }

}


function atualizarInterfaceCompetencia() {

  const competencia =
    estado.competenciaAtual;


  const titulo =
    competencia
      ? formatarCompetencia(
          competencia.competencia
        )
      : 'Nenhuma competência';


  const status =
    competencia
      ? formatarStatus(
          competencia.status
        )
      : 'Aguardando abertura';


  const sidebarCompetencia =
    document.getElementById(
      'sidebarCompetencia'
    );

  const sidebarStatus =
    document.getElementById(
      'sidebarCompetenciaStatus'
    );

  const topbarCompetencia =
    document.getElementById(
      'topbarCompetencia'
    );

  const topbarStatus =
    document.getElementById(
      'topbarCompetenciaStatus'
    );


  if (sidebarCompetencia) {

    sidebarCompetencia.textContent =
      titulo;

  }


  if (sidebarStatus) {

    sidebarStatus.textContent =
      status;

  }


  if (topbarCompetencia) {

    topbarCompetencia.textContent =
      titulo;

  }


  if (topbarStatus) {

    topbarStatus.textContent =
      status;

  }


  const icon =
    document.getElementById(
      'sidebarCompetenciaIcon'
    );


  if (icon) {

    icon.textContent =
      competencia
        ? '●'
        : '○';

  }

}


async function carregarPaginaCompetencias() {

  await carregarCompetencias();

  atualizarInterfaceCompetencia();

  preencherFiltroCompetencias();

  renderizarCompetenciaAtual();

  renderizarTabelaCompetencias();

}


function renderizarCompetenciaAtual() {

  const competencia =
    estado.competenciaAtual;


  const titulo =
    document.getElementById(
      'competenciaAtualTitulo'
    );

  const descricao =
    document.getElementById(
      'competenciaAtualDescricao'
    );

  const status =
    document.getElementById(
      'competenciaAtualStatus'
    );

  const btnEncerrar =
    document.getElementById(
      'btnEncerrarCompetencia'
    );


  if (!competencia) {

    if (titulo) {
      titulo.textContent =
        'Nenhuma competência aberta';
    }

    if (descricao) {
      descricao.textContent =
        'Abra uma competência para começar a registrar divergências.';
    }

    if (status) {
      status.textContent =
        'Aguardando abertura';
    }

    if (btnEncerrar) {
      btnEncerrar.disabled = true;
    }

    return;

  }


  if (titulo) {

    titulo.textContent =
      formatarCompetencia(
        competencia.competencia
      );

  }


  if (descricao) {

    descricao.textContent =
      competencia.status === 'aberta'
        ? 'Competência atual aberta para registros.'
        : 'Competência encerrada.';

  }


  if (status) {

    status.textContent =
      formatarStatus(
        competencia.status
      );

  }


  if (btnEncerrar) {

    btnEncerrar.disabled =
      competencia.status !== 'aberta';

  }

}


function renderizarTabelaCompetencias() {

  const tabela =
    document.getElementById(
      'tabelaCompetencias'
    );


  if (!tabela) {
    return;
  }


  const tbody =
    tabela.querySelector('tbody') ||
    tabela;


  tbody.innerHTML = '';


  if (
    estado.competencias.length === 0
  ) {

    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          Nenhuma competência cadastrada.
        </td>
      </tr>
    `;

    return;

  }


  estado.competencias
    .forEach(competencia => {

      const tr =
        document.createElement('tr');


      tr.innerHTML = `

        <td>
          ${escapeHtml(
            formatarCompetencia(
              competencia.competencia
            )
          )}
        </td>

        <td>
          <span class="status-pill ${classeStatus(
            competencia.status
          )}">
            ${escapeHtml(
              formatarStatus(
                competencia.status
              )
            )}
          </span>
        </td>

        <td>
          ${formatarDataHora(
            competencia.data_abertura
          )}
        </td>

        <td>
          ${
            competencia.data_encerramento
              ? formatarDataHora(
                  competencia.data_encerramento
                )
              : '—'
          }
        </td>

        <td>
          ${
            competencia.id ===
            estado.competenciaAtual?.id
              ? '<strong>Atual</strong>'
              : '—'
          }
        </td>

      `;


      tbody.appendChild(tr);

    });

}


function configurarCompetencias() {

  const btnEncerrar =
    document.getElementById(
      'btnEncerrarCompetencia'
    );

  const btnNova =
    document.getElementById(
      'btnNovaCompetencia'
    );


  if (btnEncerrar) {

    btnEncerrar.addEventListener(
      'click',
      solicitarEncerramentoCompetencia
    );

  }


  if (btnNova) {

    btnNova.addEventListener(
      'click',
      abrirNovaCompetencia
    );

  }

}


/* =========================================================
   ENCERRAR COMPETÊNCIA
   ========================================================= */

function solicitarEncerramentoCompetencia() {

  const competencia =
    estado.competenciaAtual;


  if (!competencia) {

    mostrarToast(
      'Não existe competência aberta.',
      'aviso'
    );

    return;

  }


  abrirConfirmacao({

    titulo:
      'Encerrar competência',

    mensagem:
      `Deseja realmente encerrar a competência ${formatarCompetencia(
        competencia.competencia
      )}? Depois disso, será necessário abrir uma nova competência manualmente.`,

    confirmar:
      encerrarCompetencia

  });

}


async function encerrarCompetencia() {

  const competencia =
    estado.competenciaAtual;


  if (!competencia) {
    return;
  }


  const {
    error
  } =
    await window.supabaseClient
      .from('competencias')
      .update({

        status: 'encerrada',

        data_encerramento:
          new Date().toISOString()

      })
      .eq(
        'id',
        competencia.id
      );


  if (error) {

    console.error(
      'Erro ao encerrar competência:',
      error
    );

    throw error;

  }


  mostrarToast(
    'Competência encerrada com sucesso.',
    'sucesso'
  );


  await carregarDadosIniciais();

  if (
    estado.paginaAtual ===
    'competencias'
  ) {

    renderizarCompetenciaAtual();
    renderizarTabelaCompetencias();

  }

}


/* =========================================================
   NOVA COMPETÊNCIA
   ========================================================= */

function abrirNovaCompetencia() {

  const proxima =
    sugerirProximaCompetencia();


  abrirPromptCompetencia(
    proxima
  );

}


function sugerirProximaCompetencia() {

  if (
    !estado.competencias.length
  ) {

    return '2026-09';

  }


  const datas =
    estado.competencias
      .map(item =>
        normalizarCompetenciaInput(
          item.competencia
        )
      )
      .filter(Boolean)
      .sort();


  if (!datas.length) {

    return '2026-09';

  }


  const ultima =
    datas[datas.length - 1];


  const [ano, mes] =
    ultima.split('-')
      .map(Number);


  const data =
    new Date(
      ano,
      mes,
      1
    );


  return `${data.getFullYear()}-${String(
    data.getMonth() + 1
  ).padStart(2, '0')}`;

}


function abrirPromptCompetencia(
  valorInicial
) {

  /*
   * Como o HTML atual não possui um modal
   * específico para nova competência,
   * usamos o modal de confirmação com
   * um pequeno formulário temporário.
   */

  const modal =
    document.getElementById(
      'modalConfirmacao'
    );

  if (!modal) {
    return;
  }


  const titulo =
    document.getElementById(
      'modalConfirmacaoTitulo'
    );

  const mensagem =
    document.getElementById(
      'modalConfirmacaoMensagem'
    );

  const confirmar =
    document.getElementById(
      'btnConfirmarAcao'
    );


  if (!titulo ||
      !mensagem ||
      !confirmar) {

    return;

  }


  titulo.textContent =
    'Abrir nova competência';


  mensagem.innerHTML = `

    <div class="form-group">
      <label for="novaCompetenciaInput">
        Competência
      </label>

      <input
        type="month"
        id="novaCompetenciaInput"
        value="${escapeHtml(
          valorInicial
        )}"
      >
    </div>

    <p class="modal-description">
      A competência será criada somente
      após sua confirmação.
    </p>

  `;


  modal.classList.add('active');


  const novaInput =
    document.getElementById(
      'novaCompetenciaInput'
    );


  confirmar.onclick =
    async function () {

      const valor =
        novaInput?.value;


      if (!valor) {

        mostrarToast(
          'Informe a competência.',
          'aviso'
        );

        return;

      }


      try {

        confirmar.disabled = true;

        await criarCompetencia(
          valor
        );

        fecharModal(
          'modalConfirmacao'
        );

      } catch (erro) {

        console.error(
          erro
        );

        mostrarToast(
          obterMensagemErro(erro),
          'erro'
        );

      } finally {

        confirmar.disabled = false;

      }

    };

}


async function criarCompetencia(
  valor
) {

  const competencia =
    `${valor}-01`;


  /*
   * Verificação local antes do INSERT.
   */

  const existente =
    estado.competencias.find(
      item =>
        normalizarCompetenciaInput(
          item.competencia
        ) === valor
    );


  if (existente) {

    mostrarToast(
      'Essa competência já existe.',
      'aviso'
    );

    return;

  }


  /*
   * Nunca abrimos uma nova competência
   * automaticamente.
   *
   * O usuário chegou até aqui
   * explicitamente.
   */

  const {
    data,
    error
  } =
    await window.supabaseClient
      .from('competencias')
      .insert({

        competencia,

        status: 'aberta'

      })
      .select()
      .single();


  if (error) {

    console.error(
      'Erro ao criar competência:',
      error
    );

    if (
      error.code === '23505'
    ) {

      throw new Error(
        'Essa competência já existe.'
      );

    }

    throw error;

  }


  estado.competenciaAtual =
    data;


  mostrarToast(
    `Competência ${formatarCompetencia(
      competencia
    )} aberta com sucesso.`,
    'sucesso'
  );


  await carregarDadosIniciais();

  if (
    estado.paginaAtual ===
    'competencias'
  ) {

    renderizarCompetenciaAtual();
    renderizarTabelaCompetencias();

  }

}


/* =========================================================
   PRODUTOS
   ========================================================= */

async function buscarProdutoPorCodigo(
  codigo
) {

  codigo =
    String(codigo || '')
      .trim();


  if (!codigo) {

    return null;

  }


  const {
    data,
    error
  } =
    await window.supabaseClient
      .from('produtos')
      .select(
        'id, codigo, descricao, secao'
      )
      .eq(
        'codigo',
        codigo
      )
      .maybeSingle();


  if (error) {

    console.error(
      'Erro ao buscar produto:',
      error
    );

    throw error;

  }


  return data;

}


/* =========================================================
   NOVA DIVERGÊNCIA
   ========================================================= */

function configurarFormularios() {

  const form =
    document.getElementById(
      'formDivergencia'
    );

  const buscar =
    document.getElementById(
      'btnBuscarProduto'
    );

  const cadastrar =
    document.getElementById(
      'btnCadastrarProduto'
    );

  const cancelar =
    document.getElementById(
      'btnCancelarDivergencia'
    );

  const salvar =
    document.getElementById(
      'btnSalvarDivergencia'
    );


  if (buscar) {

    buscar.addEventListener(
      'click',
      executarBuscaProduto
    );

  }


  if (form) {

    form.addEventListener(
      'submit',
      async evento => {

        evento.preventDefault();

        await salvarDivergencia();

      }
    );

  }


  if (cadastrar) {

    cadastrar.addEventListener(
      'click',
      abrirCadastroProduto
    );

  }


  if (cancelar) {

    cancelar.addEventListener(
      'click',
      limparFormularioDivergencia
    );

  }


  if (salvar) {

    salvar.addEventListener(
      'click',
      evento => {

        if (
          evento.currentTarget
            .form
        ) {
          return;
        }

      }
    );

  }

}


function prepararFormularioDivergencia() {

  if (!estado.competenciaAtual) {

    mostrarToast(
      'Abra uma competência antes de registrar uma divergência.',
      'aviso'
    );

  }

}


async function executarBuscaProduto() {

  const input =
    document.getElementById(
      'codigoProduto'
    );


  const codigo =
    input?.value.trim();


  if (!codigo) {

    mostrarToast(
      'Informe o código do produto.',
      'aviso'
    );

    return;

  }


  try {

    const produto =
      await buscarProdutoPorCodigo(
        codigo
      );


    if (!produto) {

      estado.produtoSelecionado =
        null;

      exibirProdutoNaoEncontrado(
        codigo
      );

      return;

    }


    selecionarProduto(
      produto
    );


  } catch (erro) {

    console.error(
      erro
    );

    mostrarToast(
      obterMensagemErro(erro),
      'erro'
    );

  }

}


function selecionarProduto(
  produto
) {

  estado.produtoSelecionado =
    produto;


  const produtoId =
    document.getElementById(
      'produtoId'
    );

  const encontrado =
    document.getElementById(
      'produtoEncontrado'
    );

  const naoEncontrado =
    document.getElementById(
      'produtoNaoEncontrado'
    );

  const descricao =
    document.getElementById(
      'produtoDescricao'
    );

  const codigoExibicao =
    document.getElementById(
      'produtoCodigoExibicao'
    );

  const secao =
    document.getElementById(
      'produtoSecao'
    );


  if (produtoId) {

    produtoId.value =
      produto.id;

  }


  if (descricao) {

    descricao.textContent =
      produto.descricao ||
      'Sem descrição';

  }


  if (codigoExibicao) {

    codigoExibicao.textContent =
      produto.codigo ||
      '—';

  }


  if (secao) {

    secao.textContent =
      produto.secao ||
      'Sem seção';

  }


  if (encontrado) {

    encontrado.hidden = false;
    encontrado.classList.add(
      'active'
    );

  }


  if (naoEncontrado) {

    naoEncontrado.hidden = true;

  }


  mostrarToast(
    'Produto encontrado.',
    'sucesso'
  );

}


function exibirProdutoNaoEncontrado(
  codigo
) {

  const encontrado =
    document.getElementById(
      'produtoEncontrado'
    );

  const naoEncontrado =
    document.getElementById(
      'produtoNaoEncontrado'
    );


  if (encontrado) {

    encontrado.hidden = true;

  }


  if (naoEncontrado) {

    naoEncontrado.hidden = false;

  }


  const codigoNovo =
    document.getElementById(
      'novoProdutoCodigo'
    );


  if (codigoNovo) {

    codigoNovo.value =
      codigo;

  }


  mostrarToast(
    'Produto não encontrado. Cadastre-o para continuar.',
    'aviso'
  );

}


function abrirCadastroProduto() {

  const codigo =
    document.getElementById(
      'codigoProduto'
    )?.value.trim();


  const codigoInput =
    document.getElementById(
      'novoProdutoCodigo'
    );


  if (codigoInput) {

    codigoInput.value =
      codigo || '';

  }


  abrirModal(
    'modalCadastroProduto'
  );

}


/* =========================================================
   CADASTRO DE PRODUTO
   ========================================================= */

function configurarCadastroProduto() {

  const salvar =
    document.getElementById(
      'btnSalvarProduto'
    );


  if (!salvar) {
    return;
  }


  salvar.addEventListener(
    'click',
    salvarNovoProduto
  );

}


async function salvarNovoProduto() {

  const codigo =
    document.getElementById(
      'novoProdutoCodigo'
    )?.value.trim();


  const descricao =
    document.getElementById(
      'novoProdutoDescricao'
    )?.value.trim();


  const secao =
    document.getElementById(
      'novoProdutoSecao'
    )?.value.trim();


  if (!codigo) {

    mostrarToast(
      'Informe o código do produto.',
      'aviso'
    );

    return;

  }


  if (!descricao) {

    mostrarToast(
      'Informe a descrição do produto.',
      'aviso'
    );

    return;

  }


  const botao =
    document.getElementById(
      'btnSalvarProduto'
    );


  try {

    if (botao) {
      botao.disabled = true;
    }


    const {
      data,
      error
    } =
      await window.supabaseClient
        .from('produtos')
        .insert({

          codigo,
          descricao,
          secao:
            secao || null

        })
        .select()
        .single();


    if (error) {

      if (
        error.code === '23505'
      ) {

        throw new Error(
          'Esse código de produto já está cadastrado.'
        );

      }

      throw error;

    }


    selecionarProduto(
      data
    );


    fecharModal(
      'modalCadastroProduto'
    );


    limparCamposCadastroProduto();


    mostrarToast(
      'Produto cadastrado com sucesso.',
      'sucesso'
    );


  } catch (erro) {

    console.error(
      'Erro ao cadastrar produto:',
      erro
    );

    mostrarToast(
      obterMensagemErro(erro),
      'erro'
    );

  } finally {

    if (botao) {
      botao.disabled = false;
    }

  }

}


function limparCamposCadastroProduto() {

  const campos = [
    'novoProdutoCodigo',
    'novoProdutoDescricao',
    'novoProdutoSecao'
  ];


  campos.forEach(id => {

    const elemento =
      document.getElementById(id);

    if (elemento) {
      elemento.value = '';
    }

  });

}


function limparFormularioDivergencia() {

  const form =
    document.getElementById(
      'formDivergencia'
    );


  if (form) {

    form.reset();

  }


  estado.produtoSelecionado =
    null;


  const produtoId =
    document.getElementById(
      'produtoId'
    );


  if (produtoId) {

    produtoId.value = '';

  }


  const encontrado =
    document.getElementById(
      'produtoEncontrado'
    );


  const naoEncontrado =
    document.getElementById(
      'produtoNaoEncontrado'
    );


  if (encontrado) {

    encontrado.hidden = true;

  }


  if (naoEncontrado) {

    naoEncontrado.hidden = true;

  }


  const trocaFields =
    document.getElementById(
      'trocaFields'
    );


  if (trocaFields) {

    trocaFields.hidden = true;

  }


  limparResultadoCalculo();

}


/* =========================================================
   CÁLCULO
   ========================================================= */

function configurarCalculoDivergencia() {

  const campos = [
    'custoProduto',
    'quantidadeSistema',
    'quantidadeFisica'
  ];


  campos.forEach(id => {

    const elemento =
      document.getElementById(id);


    if (elemento) {

      elemento.addEventListener(
        'input',
        calcularDivergencia
      );

    }

  });

}


function calcularDivergencia() {

  const custo =
    numeroInput(
      'custoProduto'
    );

  const sistema =
    inteiroInput(
      'quantidadeSistema'
    );

  const fisica =
    inteiroInput(
      'quantidadeFisica'
    );


  const quantidade =
    fisica - sistema;


  const valor =
    quantidade * custo;


  const quantidadeElemento =
    document.getElementById(
      'divergenciaQuantidade'
    );

  const valorElemento =
    document.getElementById(
      'divergenciaValor'
    );


  if (quantidadeElemento) {

    quantidadeElemento.textContent =
      formatarQuantidadeComSinal(
        quantidade
      );

  }


  if (valorElemento) {

    valorElemento.textContent =
      formatarMoedaComSinal(
        valor
      );


    valorElemento.classList.remove(
      'value-positive',
      'value-negative',
      'value-zero'
    );


    valorElemento.classList.add(
      valor > 0
        ? 'value-positive'
        : valor < 0
          ? 'value-negative'
          : 'value-zero'
    );

  }


  const resultado =
    document.getElementById(
      'resultadoCalculo'
    );


  if (resultado) {

    resultado.hidden = false;

  }

}


function limparResultadoCalculo() {

  const quantidade =
    document.getElementById(
      'divergenciaQuantidade'
    );

  const valor =
    document.getElementById(
      'divergenciaValor'
    );


  if (quantidade) {
    quantidade.textContent =
      '0';
  }


  if (valor) {
    valor.textContent =
      formatarMoeda(0);
  }

}


async function salvarDivergencia() {

  if (!estado.competenciaAtual) {

    mostrarToast(
      'Não existe competência aberta. Abra uma competência antes de registrar uma divergência.',
      'aviso'
    );

    return;

  }


  if (!estado.produtoSelecionado) {

    mostrarToast(
      'Busque e selecione um produto antes de salvar.',
      'aviso'
    );

    return;

  }


  const custo =
    numeroInput(
      'custoProduto'
    );


  const sistema =
    inteiroInput(
      'quantidadeSistema'
    );


  const fisica =
    inteiroInput(
      'quantidadeFisica'
    );


  if (
    !Number.isFinite(custo) ||
    custo < 0
  ) {

    mostrarToast(
      'Informe um custo válido.',
      'aviso'
    );

    return;

  }


  if (
    !Number.isFinite(sistema)
  ) {

    mostrarToast(
      'Informe a quantidade do sistema.',
      'aviso'
    );

    return;

  }


  if (
    !Number.isFinite(fisica)
  ) {

    mostrarToast(
      'Informe a quantidade física.',
      'aviso'
    );

    return;

  }


  const divergenciaQuantidade =
    fisica - sistema;


  const divergenciaValor =
    divergenciaQuantidade *
    custo;


  const observacao =
    document.getElementById(
      'observacao'
    )?.value.trim() ||
    null;


  const botao =
    document.getElementById(
      'btnSalvarDivergencia'
    );


  try {

    if (botao) {
      botao.disabled = true;
    }


    const payload = {

      produto_id:
        estado.produtoSelecionado.id,

      competencia_id:
        estado.competenciaAtual.id,

      competencia:
        estado.competenciaAtual.competencia,

      quantidade_sistema:
        sistema,

      quantidade_fisica:
        fisica,

      divergencia_quantidade:
        divergenciaQuantidade,

      custo,

      divergencia_valor:
        divergenciaValor,

      observacao,

      status:
        'pendente'

    };


    const {
      data,
      error
    } =
      await window.supabaseClient
        .from('divergencias')
        .insert(payload)
        .select()
        .single();


    if (error) {

      console.error(
        'Erro retornado pelo Supabase:',
        error
      );

      throw error;

    }


    mostrarToast(
      'Divergência registrada com sucesso.',
      'sucesso'
    );


    limparFormularioDivergencia();


    await carregarDadosIniciais();


    navegarPara(
      'inicio'
    );


  } catch (erro) {

    console.error(
      'Erro ao salvar divergência:',
      erro
    );

    mostrarToast(
      obterMensagemErro(erro),
      'erro'
    );

  } finally {

    if (botao) {
      botao.disabled = false;
    }

  }

}


/* =========================================================
   TROCA DE PRODUTO
   ========================================================= */

function configurarTroca() {

  const checkbox =
    document.getElementById(
      'produtoTrocado'
    );


  if (!checkbox) {
    return;
  }


  checkbox.addEventListener(
    'change',
    () => {

      const fields =
        document.getElementById(
          'trocaFields'
        );


      if (fields) {

        fields.hidden =
          !checkbox.checked;

      }

    }
  );

}


/* =========================================================
   INÍCIO
   ========================================================= */

async function carregarDadosInicio() {

  if (
    !estado.competenciaAtual
  ) {

    limparDashboard();

    return;

  }


  const {
    data,
    error
  } =
    await buscarDivergenciasCompetencia(
      estado.competenciaAtual.id
    );


  if (error) {
    throw error;
  }


  estado.divergencias =
    data || [];


  atualizarCardsInicio(
    estado.divergencias
  );


  renderizarTabelaInicio(
    estado.divergencias.slice(
      0,
      10
    )
  );

}


function atualizarCardsInicio(
  registros
) {

  const valores =
    registros.map(
      registro =>
        Number(
          registro.divergencia_valor
        ) || 0
    );


  const total =
    registros.length;


  const faltas =
    valores
      .filter(valor => valor < 0)
      .reduce(
        (total, valor) =>
          total + valor,
        0
      );


  const sobras =
    valores
      .filter(valor => valor > 0)
      .reduce(
        (total, valor) =>
          total + valor,
        0
      );


  const saldo =
    faltas + sobras;


  definirTexto(
    'inicioTotalDivergencias',
    total
  );


  definirTexto(
    'inicioTotalFaltas',
    formatarMoedaComSinal(
      faltas
    )
  );


  definirTexto(
    'inicioTotalSobras',
    formatarMoedaComSinal(
      sobras
    )
  );


  definirTexto(
    'inicioSaldoDivergencia',
    formatarMoedaComSinal(
      saldo
    )
  );

}


function renderizarTabelaInicio(
  registros
) {

  const tabela =
    document.getElementById(
      'inicioTabelaDivergencias'
    );


  if (!tabela) {
    return;
  }


  const tbody =
    tabela.querySelector('tbody') ||
    tabela;


  tbody.innerHTML = '';


  if (!registros.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          ${
            estado.competenciaAtual
              ? 'Nenhuma divergência registrada nesta competência.'
              : 'Abra uma competência para começar.'
          }
        </td>
      </tr>
    `;

    return;

  }


  registros.forEach(
    registro => {

      const produto =
        registro.produtos || {};


      const tr =
        document.createElement('tr');


      tr.innerHTML = `

        <td>
          <strong>
            ${escapeHtml(
              produto.codigo || '—'
            )}
          </strong>
        </td>

        <td>
          ${escapeHtml(
            produto.descricao || '—'
          )}
        </td>

        <td>
          ${escapeHtml(
            produto.secao || '—'
          )}
        </td>

        <td>
          ${formatarQuantidadeComSinal(
            registro.divergencia_quantidade
          )}
        </td>

        <td class="${
          Number(
            registro.divergencia_valor
          ) >= 0
            ? 'value-positive'
            : 'value-negative'
        }">
          ${formatarMoedaComSinal(
            registro.divergencia_valor
          )}
        </td>

        <td>
          <span class="status-pill ${classeStatus(
            registro.status
          )}">
            ${escapeHtml(
              formatarStatus(
                registro.status
              )
            )}
          </span>
        </td>

      `;


      tbody.appendChild(tr);

    }
  );

}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function carregarDashboard() {

  if (
    !estado.competenciaAtual
  ) {

    limparDashboard();

    mostrarEstadoSemCompetencia();

    return;

  }


  const {
    data,
    error
  } =
    await buscarDivergenciasCompetencia(
      estado.competenciaAtual.id
    );


  if (error) {
    throw error;
  }


  const registros =
    data || [];


  const valores =
    registros.map(
      item =>
        Number(
          item.divergencia_valor
        ) || 0
    );


  const faltas =
    valores
      .filter(valor => valor < 0)
      .reduce(
        (a, b) => a + b,
        0
      );


  const sobras =
    valores
      .filter(valor => valor > 0)
      .reduce(
        (a, b) => a + b,
        0
      );


  const saldo =
    faltas + sobras;


  definirTexto(
    'dashboardTotal',
    registros.length
  );


  definirTexto(
    'dashboardFaltas',
    formatarMoedaComSinal(
      faltas
    )
  );


  definirTexto(
    'dashboardSobras',
    formatarMoedaComSinal(
      sobras
    )
  );


  definirTexto(
    'dashboardSaldo',
    formatarMoedaComSinal(
      saldo
    )
  );


  renderizarResumoDashboard(
    registros
  );

}


function renderizarResumoDashboard(
  registros
) {

  const statusElemento =
    document.getElementById(
      'dashboardStatus'
    );


  if (!statusElemento) {
    return;
  }


  const pendentes =
    registros.filter(
      item =>
        item.status === 'pendente'
    ).length;


  const resolvidas =
    registros.filter(
      item =>
        item.status === 'resolvida'
    ).length;


  statusElemento.innerHTML = `

    <div class="status-summary">

      <span>
        ${pendentes}
        pendente${pendentes === 1 ? '' : 's'}
      </span>

      <span>
        ${resolvidas}
        resolvida${resolvidas === 1 ? '' : 's'}
      </span>

    </div>

  `;

}


function limparDashboard() {

  [
    'inicioTotalDivergencias',
    'dashboardTotal'
  ]
    .forEach(id =>
      definirTexto(id, '0')
    );


  [
    'inicioTotalFaltas',
    'inicioTotalSobras',
    'inicioSaldoDivergencia',
    'dashboardFaltas',
    'dashboardSobras',
    'dashboardSaldo'
  ]
    .forEach(id =>
      definirTexto(
        id,
        formatarMoeda(0)
      )
    );


  const tabela =
    document.getElementById(
      'inicioTabelaDivergencias'
    );


  if (tabela) {

    const tbody =
      tabela.querySelector(
        'tbody'
      ) || tabela;


    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          Nenhuma competência aberta.
        </td>
      </tr>
    `;

  }

}


/* =========================================================
   CONSULTA DE DIVERGÊNCIAS
   ========================================================= */

async function buscarDivergenciasCompetencia(
  competenciaId
) {

  return await window.supabaseClient
    .from('divergencias')
    .select(`
      id,
      produto_id,
      competencia_id,
      competencia,
      quantidade_sistema,
      quantidade_fisica,
      divergencia_quantidade,
      custo,
      divergencia_valor,
      observacao,
      status,
      resolvido_em,
      observacao_resolucao,
      created_at,
      produtos (
        id,
        codigo,
        descricao,
        secao
      )
    `)
    .eq(
      'competencia_id',
      competenciaId
    )
    .order(
      'created_at',
      {
        ascending: false
      }
    );

}


/* =========================================================
   PESQUISA
   ========================================================= */

function configurarPesquisa() {

  const pesquisar =
    document.getElementById(
      'btnPesquisar'
    );

  const limpar =
    document.getElementById(
      'btnLimparFiltros'
    );


  if (pesquisar) {

    pesquisar.addEventListener(
      'click',
      executarPesquisa
    );

  }


  if (limpar) {

    limpar.addEventListener(
      'click',
      limparFiltrosPesquisa
    );

  }

}


async function carregarPesquisaInicial() {

  preencherFiltroCompetencias();

  await executarPesquisa();

}


async function executarPesquisa() {

  const resultado =
    document.getElementById(
      'tabelaPesquisa'
    );


  if (resultado) {

    const tbody =
      resultado.querySelector(
        'tbody'
      ) || resultado;


    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          Pesquisando...
        </td>
      </tr>
    `;

  }


  try {

    const codigo =
      document.getElementById(
        'filtroCodigo'
      )?.value.trim()
        .toLowerCase() || '';


    const descricao =
      document.getElementById(
        'filtroDescricao'
      )?.value.trim()
        .toLowerCase() || '';


    const secao =
      document.getElementById(
        'filtroSecao'
      )?.value.trim()
        .toLowerCase() || '';


    const competencia =
      document.getElementById(
        'filtroCompetencia'
      )?.value || '';


    const status =
      document.getElementById(
        'filtroStatus'
      )?.value || '';


    const tipo =
      document.getElementById(
        'filtroTipo'
      )?.value || '';


    let query =
      window.supabaseClient
        .from('divergencias')
        .select(`
          id,
          produto_id,
          competencia_id,
          competencia,
          quantidade_sistema,
          quantidade_fisica,
          divergencia_quantidade,
          custo,
          divergencia_valor,
          observacao,
          status,
          resolvido_em,
          observacao_resolucao,
          created_at,
          produtos (
            id,
            codigo,
            descricao,
            secao
          ),
          competencias (
            id,
            competencia,
            status
          )
        `)
        .order(
          'created_at',
          {
            ascending: false
          }
        );


    if (competencia) {

      query =
        query.eq(
          'competencia_id',
          competencia
        );

    }


    if (status) {

      query =
        query.eq(
          'status',
          status
        );

    }


    const {
      data,
      error
    } =
      await query;


    if (error) {

      throw error;

    }


    let registros =
      data || [];


    registros =
      registros.filter(
        registro => {

          const produto =
            registro.produtos || {};


          const codigoProduto =
            String(
              produto.codigo || ''
            )
              .toLowerCase();


          const descricaoProduto =
            String(
              produto.descricao || ''
            )
              .toLowerCase();


          const secaoProduto =
            String(
              produto.secao || ''
            )
              .toLowerCase();


          if (
            codigo &&
            !codigoProduto.includes(
              codigo
            )
          ) {

            return false;

          }


          if (
            descricao &&
            !descricaoProduto.includes(
              descricao
            )
          ) {

            return false;

          }


          if (
            secao &&
            !secaoProduto.includes(
              secao
            )
          ) {

            return false;

          }


          const valor =
            Number(
              registro.divergencia_valor
            ) || 0;


          if (
            tipo === 'positivo' &&
            valor <= 0
          ) {

            return false;

          }


          if (
            tipo === 'negativo' &&
            valor >= 0
          ) {

            return false;

          }


          if (
            tipo === 'zero' &&
            valor !== 0
          ) {

            return false;

          }


          return true;

        }
      );


    estado.resultadosPesquisa =
      registros;


    renderizarPesquisa(
      registros
    );


  } catch (erro) {

    console.error(
      'Erro na pesquisa:',
      erro
    );


    mostrarToast(
      obterMensagemErro(erro),
      'erro'
    );


    renderizarPesquisa(
      []
    );

  }

}


function renderizarPesquisa(
  registros
) {

  const tabela =
    document.getElementById(
      'tabelaPesquisa'
    );


  if (!tabela) {
    return;
  }


  const tbody =
    tabela.querySelector(
      'tbody'
    ) || tabela;


  tbody.innerHTML = '';


  const contador =
    document.getElementById(
      'resultCount'
    );


  if (contador) {

    contador.textContent =
      `${registros.length} resultado${
        registros.length === 1
          ? ''
          : 's'
      }`;

  }


  if (!registros.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          Nenhuma divergência encontrada.
        </td>
      </tr>
    `;

    return;

  }


  registros.forEach(
    registro => {

      const produto =
        registro.produtos || {};


      const competencia =
        registro.competencias || {};


      const tr =
        document.createElement('tr');


      tr.innerHTML = `

        <td>
          ${escapeHtml(
            produto.codigo || '—'
          )}
        </td>

        <td>
          ${escapeHtml(
            produto.descricao || '—'
          )}
        </td>

        <td>
          ${escapeHtml(
            produto.secao || '—'
          )}
        </td>

        <td>
          ${escapeHtml(
            formatarCompetencia(
              competencia.competencia ||
              registro.competencia
            )
          )}
        </td>

        <td>
          ${formatarQuantidadeComSinal(
            registro.divergencia_quantidade
          )}
        </td>

        <td class="${
          Number(
            registro.divergencia_valor
          ) >= 0
            ? 'value-positive'
            : 'value-negative'
        }">
          ${formatarMoedaComSinal(
            registro.divergencia_valor
          )}
        </td>

        <td>
          <span class="status-pill ${classeStatus(
            registro.status
          )}">
            ${escapeHtml(
              formatarStatus(
                registro.status
              )
            )}
          </span>
        </td>

        <td>
          <button
            type="button"
            class="table-action"
            data-historico-produto="${escapeHtml(
              registro.produto_id
            )}"
          >
            Histórico
          </button>
        </td>

      `;


      const botao =
        tr.querySelector(
          '[data-historico-produto]'
        );


      if (botao) {

        botao.addEventListener(
          'click',
          () =>
            abrirHistoricoProduto(
              registro.produto_id,
              produto
            )
        );

      }


      tbody.appendChild(tr);

    }
  );

}


function limparFiltrosPesquisa() {

  [
    'filtroCodigo',
    'filtroDescricao',
    'filtroSecao'
  ]
    .forEach(id => {

      const elemento =
        document.getElementById(id);

      if (elemento) {
        elemento.value = '';
      }

    });


  [
    'filtroCompetencia',
    'filtroStatus',
    'filtroTipo'
  ]
    .forEach(id => {

      const elemento =
        document.getElementById(id);

      if (elemento) {
        elemento.value = '';
      }

    });


  executarPesquisa();

}


function preencherFiltroCompetencias() {

  const select =
    document.getElementById(
      'filtroCompetencia'
    );


  if (!select) {
    return;
  }


  const valorAtual =
    select.value;


  select.innerHTML =
    '<option value="">Todas as competências</option>';


  estado.competencias
    .forEach(
      competencia => {

        const option =
          document.createElement(
            'option'
          );


        option.value =
          competencia.id;


        option.textContent =
          formatarCompetencia(
            competencia.competencia
          );


        select.appendChild(
          option
        );

      }
    );


  if (
    valorAtual &&
    estado.competencias.some(
      item =>
        item.id === valorAtual
    )
  ) {

    select.value =
      valorAtual;

  }

}


/* =========================================================
   HISTÓRICO DO PRODUTO
   ========================================================= */

async function abrirHistoricoProduto(
  produtoId,
  produto
) {

  const titulo =
    document.getElementById(
      'historicoProdutoTitulo'
    );


  const historico =
    document.getElementById(
      'historicoProduto'
    );


  if (titulo) {

    titulo.textContent =
      produto?.descricao ||
      'Histórico do produto';

  }


  if (historico) {

    historico.classList.add(
      'active'
    );

  }


  const timeline =
    document.getElementById(
      'historyTimeline'
    );


  if (timeline) {

    timeline.innerHTML = `
      <div class="history-loading">
        Carregando histórico...
      </div>
    `;

  }


  try {

    const {
      data,
      error
    } =
      await window.supabaseClient
        .from('divergencias')
        .select(`
          id,
          competencia,
          quantidade_sistema,
          quantidade_fisica,
          divergencia_quantidade,
          custo,
          divergencia_valor,
          observacao,
          status,
          resolvido_em,
          observacao_resolucao,
          created_at,
          competencias (
            id,
            competencia,
            status
          )
        `)
        .eq(
          'produto_id',
          produtoId
        )
        .order(
          'competencia',
          {
            ascending: true
          }
        )
        .order(
          'created_at',
          {
            ascending: true
          }
        );


    if (error) {
      throw error;
    }


    renderizarHistorico(
      data || []
    );


  } catch (erro) {

    console.error(
      'Erro no histórico:',
      erro
    );


    if (timeline) {

      timeline.innerHTML = `
        <div class="history-empty">
          Não foi possível carregar o histórico.
        </div>
      `;

    }


    mostrarToast(
      obterMensagemErro(erro),
      'erro'
    );

  }

}


function renderizarHistorico(
  registros
) {

  const timeline =
    document.getElementById(
      'historyTimeline'
    );


  if (!timeline) {
    return;
  }


  timeline.innerHTML = '';


  if (!registros.length) {

    timeline.innerHTML = `
      <div class="history-empty">
        Nenhuma divergência registrada para este produto.
      </div>
    `;

    return;

  }


  registros.forEach(
    registro => {

      const item =
        document.createElement(
          'div'
        );


      item.className =
        'history-item';


      const valor =
        Number(
          registro.divergencia_valor
        ) || 0;


      const quantidade =
        Number(
          registro.divergencia_quantidade
        ) || 0;


      item.innerHTML = `

        <div class="history-marker"></div>

        <div class="history-content">

          <div class="history-header">

            <strong>
              ${escapeHtml(
                formatarCompetencia(
                  registro.competencia
                )
              )}
            </strong>

            <span class="status-pill ${classeStatus(
              registro.status
            )}">
              ${escapeHtml(
                formatarStatus(
                  registro.status
                )
              )}
            </span>

          </div>

          <div class="history-main">

            <div>
              <span class="history-label">
                Divergência
              </span>

              <strong>
                ${formatarQuantidadeComSinal(
                  quantidade
                )}
                unidade${Math.abs(
                  quantidade
                ) === 1 ? '' : 's'}
              </strong>
            </div>

            <div>
              <span class="history-label">
                Valor
              </span>

              <strong class="${
                valor >= 0
                  ? 'value-positive'
                  : 'value-negative'
              }">
                ${formatarMoedaComSinal(
                  valor
                )}
              </strong>
            </div>

          </div>

          <div class="history-detail">

            <span>
              Sistema:
              ${formatarNumero(
                registro.quantidade_sistema
              )}
            </span>

            <span>
              Físico:
              ${formatarNumero(
                registro.quantidade_fisica
              )}
            </span>

            <span>
              Custo:
              ${formatarMoeda(
                registro.custo
              )}
            </span>

          </div>

          ${
            registro.observacao
              ? `
                <div class="history-note">
                  ${escapeHtml(
                    registro.observacao
                  )}
                </div>
              `
              : ''
          }

          ${
            registro.resolvido_em
              ? `
                <div class="history-resolution">
                  Resolvida em
                  ${formatarDataHora(
                    registro.resolvido_em
                  )}
                  ${
                    registro.observacao_resolucao
                      ? ` — ${escapeHtml(
                          registro.observacao_resolucao
                        )}`
                      : ''
                  }
                </div>
              `
              : ''
          }

        </div>

      `;


      timeline.appendChild(
        item
      );

    }
  );

}


function fecharHistoricoProduto() {

  const historico =
    document.getElementById(
      'historicoProduto'
    );


  if (historico) {

    historico.classList.remove(
      'active'
    );

  }

}


/* =========================================================
   MODAIS
   ========================================================= */

function configurarModais() {

  document
    .querySelectorAll(
      '[data-close-modal]'
    )
    .forEach(
      botao => {

        botao.addEventListener(
          'click',
          () => {

            fecharModal(
              botao.dataset.closeModal
            );

          }
        );

      }
    );


  const fecharHistorico =
    document.getElementById(
      'btnFecharHistorico'
    );


  if (fecharHistorico) {

    fecharHistorico.addEventListener(
      'click',
      fecharHistoricoProduto
    );

  }


  const fecharConfirmacao =
    document.getElementById(
      'btnFecharConfirmacao'
    );


  const cancelarConfirmacao =
    document.getElementById(
      'btnCancelarConfirmacao'
    );


  if (fecharConfirmacao) {

    fecharConfirmacao.addEventListener(
      'click',
      () =>
        fecharModal(
          'modalConfirmacao'
        )
    );

  }


  if (cancelarConfirmacao) {

    cancelarConfirmacao.addEventListener(
      'click',
      () =>
        fecharModal(
          'modalConfirmacao'
        )
    );

  }


  document
    .querySelectorAll('.modal')
    .forEach(
      modal => {

        modal.addEventListener(
          'click',
          evento => {

            if (
              evento.target === modal
            ) {

              fecharModal(
                modal.id
              );

            }

          }
        );

      }
    );


  configurarCadastroProduto();

}


function abrirModal(
  id
) {

  const modal =
    document.getElementById(id);


  if (!modal) {
    return;
  }


  modal.classList.add(
    'active'
  );


  modal.removeAttribute(
    'hidden'
  );

}


function fecharModal(
  id
) {

  const modal =
    document.getElementById(id);


  if (!modal) {
    return;
  }


  modal.classList.remove(
    'active'
  );

}


function abrirConfirmacao({
  titulo,
  mensagem,
  confirmar
}) {

  const modal =
    document.getElementById(
      'modalConfirmacao'
    );


  if (!modal) {

    /*
     * Fallback apenas caso o modal
     * não exista no HTML.
     */

    if (
      window.confirm(
        mensagem
      )
    ) {

      confirmar();

    }

    return;

  }


  const tituloElemento =
    document.getElementById(
      'modalConfirmacaoTitulo'
    );


  const mensagemElemento =
    document.getElementById(
      'modalConfirmacaoMensagem'
    );


  const botao =
    document.getElementById(
      'btnConfirmarAcao'
    );


  if (tituloElemento) {

    tituloElemento.textContent =
      titulo;

  }


  if (mensagemElemento) {

    mensagemElemento.innerHTML =
      escapeHtml(
        mensagem
      );

  }


  abrirModal(
    'modalConfirmacao'
  );


  if (botao) {

    /*
     * Clone evita acumular vários
     * listeners de confirmações.
     */

    const novoBotao =
      botao.cloneNode(true);


    botao.replaceWith(
      novoBotao
    );


    novoBotao.addEventListener(
      'click',
      async () => {

        try {

          novoBotao.disabled =
            true;

          await confirmar();

          fecharModal(
            'modalConfirmacao'
          );

        } catch (erro) {

          console.error(
            'Erro na ação confirmada:',
            erro
          );

          mostrarToast(
            obterMensagemErro(
              erro
            ),
            'erro'
          );

        } finally {

          novoBotao.disabled =
            false;

        }

      }
    );

  }

}


/* =========================================================
   TOASTS
   ========================================================= */

function mostrarToast(
  mensagem,
  tipo = 'info'
) {

  let container =
    document.getElementById(
      'toastContainer'
    );


  if (!container) {

    container =
      document.createElement(
        'div'
      );

    container.id =
      'toastContainer';


    document.body.appendChild(
      container
    );

  }


  const toast =
    document.createElement(
      'div'
    );


  toast.className =
    `toast toast-${tipo}`;


  toast.innerHTML = `
    <span class="toast-message">
      ${escapeHtml(
        mensagem
      )}
    </span>
  `;


  container.appendChild(
    toast
  );


  requestAnimationFrame(
    () => {

      toast.classList.add(
        'show'
      );

    }
  );


  setTimeout(
    () => {

      toast.classList.remove(
        'show'
      );

      setTimeout(
        () =>
          toast.remove(),
        300
      );

    },
    4000
  );

}


/* =========================================================
   ESTADO SEM COMPETÊNCIA
   ========================================================= */

function mostrarEstadoSemCompetencia() {

  /*
   * Não cria competência automaticamente.
   *
   * O usuário decide quando abrir uma.
   */

}


/* =========================================================
   HELPERS DE DADOS
   ========================================================= */

function numeroInput(
  id
) {

  const elemento =
    document.getElementById(id);


  if (!elemento) {
    return NaN;
  }


  let valor =
    elemento.value;


  if (
    typeof valor !== 'string'
  ) {

    return Number(valor);

  }


  valor =
    valor
      .trim()
      .replace(/\s/g, '');


  /*
   * Aceita:
   *
   * 1200
   * 1200,50
   * 1.200,50
   */

  if (
    valor.includes(',') &&
    valor.includes('.')
  ) {

    valor =
      valor
        .replace(/\./g, '')
        .replace(',', '.');

  } else if (
    valor.includes(',')
  ) {

    valor =
      valor.replace(',', '.');

  }


  return Number(valor);

}


function inteiroInput(
  id
) {

  const elemento =
    document.getElementById(id);


  if (!elemento) {
    return NaN;
  }


  const valor =
    Number(
      elemento.value
    );


  return Number.isFinite(valor)
    ? Math.trunc(valor)
    : NaN;

}


function normalizarCompetenciaInput(
  valor
) {

  if (!valor) {
    return '';
  }


  const texto =
    String(valor);


  if (
    /^\d{4}-\d{2}-\d{2}/
      .test(texto)
  ) {

    return texto.substring(
      0,
      7
    );

  }


  if (
    /^\d{4}-\d{2}$/
      .test(texto)
  ) {

    return texto;

  }


  return '';

}


/* =========================================================
   FORMATAÇÃO
   ========================================================= */

function formatarMoeda(
  valor
) {

  const numero =
    Number(valor) || 0;


  return numero.toLocaleString(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL'
    }
  );

}


function formatarMoedaComSinal(
  valor
) {

  const numero =
    Number(valor) || 0;


  if (numero > 0) {

    return `+${formatarMoeda(
      numero
    )}`;

  }


  return formatarMoeda(
    numero
  );

}


function formatarNumero(
  valor
) {

  return (
    Number(valor) || 0
  ).toLocaleString(
    'pt-BR'
  );

}


function formatarQuantidadeComSinal(
  valor
) {

  const numero =
    Number(valor) || 0;


  if (numero > 0) {

    return `+${formatarNumero(
      numero
    )}`;

  }


  return formatarNumero(
    numero
  );

}


function formatarCompetencia(
  valor
) {

  if (!valor) {
    return '—';
  }


  const texto =
    String(valor);


  const match =
    texto.match(
      /^(\d{4})-(\d{2})/
    );


  if (!match) {

    return texto;

  }


  return `${match[2]}/${match[1]}`;

}


function formatarDataHora(
  valor
) {

  if (!valor) {
    return '—';
  }


  const data =
    new Date(valor);


  if (
    Number.isNaN(
      data.getTime()
    )
  ) {

    return '—';

  }


  return data.toLocaleString(
    'pt-BR'
  );

}


function formatarStatus(
  status
) {

  const mapa = {

    pendente:
      'Pendente',

    'aguardando confirmação':
      'Aguardando confirmação',

    resolvida:
      'Resolvida',

    resolvido:
      'Resolvida',

    encerrada:
      'Encerrada',

    aberta:
      'Aberta'

  };


  return mapa[status] ||
    status ||
    '—';

}


function classeStatus(
  status
) {

  const mapa = {

    pendente:
      'status-pending',

    'aguardando confirmação':
      'status-warning',

    resolvida:
      'status-success',

    resolvido:
      'status-success',

    encerrada:
      'status-closed',

    aberta:
      'status-open'

  };


  return mapa[status] ||
    'status-default';

}


/* =========================================================
   DOM
   ========================================================= */

function definirTexto(
  id,
  texto
) {

  const elemento =
    document.getElementById(id);


  if (elemento) {

    elemento.textContent =
      texto;

  }

}


/* =========================================================
   SEGURANÇA
   ========================================================= */

function escapeHtml(
  valor
) {

  if (
    valor === null ||
    valor === undefined
  ) {

    return '';

  }


  return String(valor)
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );

}


/* =========================================================
   ERROS DO SUPABASE
   ========================================================= */

function obterMensagemErro(
  erro
) {

  if (!erro) {

    return 'Ocorreu um erro inesperado.';

  }


  if (
    erro.code === '23505'
  ) {

    return 'Este registro já existe.';

  }


  if (
    erro.code === '23503'
  ) {

    return 'Não foi possível salvar porque existe uma referência inválida.';

  }


  if (
    erro.code === '42501'
  ) {

    return 'O Supabase recusou o acesso. Verifique as políticas RLS da tabela.';

  }


  if (
    erro.code === 'PGRST116'
  ) {

    return 'Registro não encontrado.';

  }


  if (
    erro.message
  ) {

    return erro.message;

  }


  return 'Não foi possível concluir a operação.';

}


/* =========================================================
   INFORMAÇÃO EXTRA
   ========================================================= */

function registrarErro(
  contexto,
  erro
) {

  console.error(
    `[StockVision] ${contexto}`,
    erro
  );

}


/* =========================================================
   EXPOSIÇÃO OPCIONAL PARA DEBUG
   ========================================================= */

window.StockVision = {

  estado,

  carregarCompetencias,

  carregarDadosInicio,

  carregarDashboard,

  executarPesquisa,

  buscarProdutoPorCodigo,

  calcularDivergencia,

  navegarPara

};


/* =========================================================
   FIM
   ========================================================= */

console.log(
  '✓ StockVision: app.js carregado.'
);