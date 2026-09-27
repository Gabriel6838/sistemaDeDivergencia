'use strict';

/*
 * STOCKVISION
 * js/inicio.js
 *
 * Responsável pela página Início:
 * - Buscar a competência aberta
 * - Buscar as divergências da competência atual
 * - Identificar a última divergência de cada produto
 * - Calcular indicadores usando o estado atual dos produtos
 * - Preencher tabela de últimas divergências
 * - Atualizar resumo da competência
 */

(function () {

  let competenciaAtual = null;

  /*
   * Guarda TODAS as divergências da competência.
   *
   * IMPORTANTE:
   * Não removemos registros antigos daqui.
   * O histórico continua completo.
   */
  let divergenciasAtual = [];

  /*
   * Contém somente a última divergência de cada produto.
   *
   * É esta lista que será utilizada para:
   * - indicadores
   * - resumo
   * - faltas
   * - sobras
   * - saldo
   */
  let divergenciasAtuaisPorProduto = [];


  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  async function inicializarInicio() {

    if (!window.supabaseClient) {

      console.error(
        'StockVision: cliente Supabase não encontrado.'
      );

      mostrarErroInicio(
        'Não foi possível conectar ao banco de dados.'
      );

      return;
    }

    try {

      limparEstadoVisual();

      await carregarCompetenciaAtual();

      if (!competenciaAtual) {

        mostrarSemCompetencia();

        return;
      }

      await carregarDivergencias();

      /*
       * Depois de carregar todas as divergências,
       * identificamos a situação mais recente de cada produto.
       */
      montarUltimasDivergenciasPorProduto();

      atualizarCabecalhoCompetencia();

      atualizarIndicadores();

      atualizarResumo();

      renderizarTabela();

    } catch (erro) {

      console.error(
        'StockVision - erro ao carregar início:',
        erro
      );

      mostrarErroInicio(
        'Não foi possível carregar os dados da competência.'
      );
    }
  }


  /* =========================================================
     COMPETÊNCIA
     ========================================================= */

  async function carregarCompetenciaAtual() {

    const {
      data,
      error
    } = await window.supabaseClient
      .from('competencias')
      .select('*')
      .eq('status', 'aberta')
      .order('competencia', {
        ascending: false
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    competenciaAtual = data || null;
  }


  /* =========================================================
     DIVERGÊNCIAS
     ========================================================= */

  async function carregarDivergencias() {

    if (!competenciaAtual) {

      divergenciasAtual = [];

      divergenciasAtuaisPorProduto = [];

      return;
    }

    const {
      data,
      error
    } = await window.supabaseClient
      .from('divergencias')
      .select(`
        id,
        produto_id,
        competencia,
        quantidade_sistema,
        quantidade_fisica,
        divergencia_quantidade,
        custo,
        divergencia_valor,
        observacao,
        status,
        resolvido_em,
        created_at,
        produtos (
          codigo,
          descricao,
          secao
        )
      `)
      .eq(
        'competencia_id',
        competenciaAtual.id
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      );

    if (error) {
      throw error;
    }

    divergenciasAtual = data || [];

    /*
     * Será preenchido posteriormente por
     * montarUltimasDivergenciasPorProduto().
     */
    divergenciasAtuaisPorProduto = [];
  }


  /* =========================================================
     ÚLTIMA DIVERGÊNCIA POR PRODUTO
     ========================================================= */

  function montarUltimasDivergenciasPorProduto() {

    /*
     * Como a consulta já está ordenada por created_at
     * DESC, o primeiro registro encontrado para cada
     * produto é automaticamente o mais recente.
     */

    const mapa = new Map();

    divergenciasAtual.forEach(function (registro) {

      const produtoId =
        registro.produto_id;

      /*
       * Se por algum motivo o produto_id não existir,
       * usamos o id da própria divergência como chave.
       *
       * Isso evita que dois registros sem produto_id
       * sejam tratados como o mesmo produto.
       */
      const chave =
        produtoId !== null &&
        produtoId !== undefined &&
        produtoId !== ''
          ? String(produtoId)
          : `divergencia-${registro.id}`;

      /*
       * Como os registros estão do mais recente
       * para o mais antigo, não substituímos o primeiro.
       */
      if (!mapa.has(chave)) {

        mapa.set(
          chave,
          registro
        );
      }
    });

    divergenciasAtuaisPorProduto =
      Array.from(mapa.values());
  }


  /* =========================================================
     INDICADORES
     ========================================================= */

  function atualizarIndicadores() {

    /*
     * IMPORTANTE:
     * O total agora representa a quantidade de produtos
     * com uma posição atual registrada na competência,
     * e não a quantidade total de lançamentos históricos.
     */
    const total =
      divergenciasAtuaisPorProduto.length;

    let faltas = 0;

    let sobras = 0;

    divergenciasAtuaisPorProduto.forEach(
      function (registro) {

        const valor =
          Number(
            registro.divergencia_valor || 0
          );

        if (valor < 0) {

          faltas += valor;
        }

        if (valor > 0) {

          sobras += valor;
        }
      }
    );

    const saldo =
      faltas + sobras;


    definirTexto(
      'inicioTotalDivergencias',
      formatarNumero(total)
    );

    definirTexto(
      'inicioTotalFaltas',
      formatarMoeda(faltas)
    );

    definirTexto(
      'inicioTotalSobras',
      formatarMoeda(sobras)
    );

    definirTexto(
      'inicioSaldoDivergencia',
      formatarMoeda(saldo)
    );


    aplicarClasseValor(
      'inicioTotalFaltas',
      faltas
    );

    aplicarClasseValor(
      'inicioTotalSobras',
      sobras
    );

    aplicarClasseValor(
      'inicioSaldoDivergencia',
      saldo
    );
  }


  /* =========================================================
     RESUMO
     ========================================================= */

  function atualizarResumo() {

    /*
     * O resumo usa exatamente a mesma base dos indicadores:
     * somente a última divergência de cada produto.
     */
    const total =
      divergenciasAtuaisPorProduto.length;

    let faltas = 0;

    let sobras = 0;


    divergenciasAtuaisPorProduto.forEach(
      function (registro) {

        const valor =
          Number(
            registro.divergencia_valor || 0
          );

        if (valor < 0) {

          faltas += valor;
        }

        if (valor > 0) {

          sobras += valor;
        }
      }
    );


    const saldo =
      faltas + sobras;


    definirTexto(
      'inicioResumoRegistros',
      formatarNumero(total)
    );

    definirTexto(
      'inicioResumoFaltas',
      formatarMoeda(faltas)
    );

    definirTexto(
      'inicioResumoSobras',
      formatarMoeda(sobras)
    );

    definirTexto(
      'inicioResumoSaldo',
      formatarMoeda(saldo)
    );


    aplicarClasseValor(
      'inicioResumoFaltas',
      faltas
    );

    aplicarClasseValor(
      'inicioResumoSobras',
      sobras
    );

    aplicarClasseValor(
      'inicioResumoSaldo',
      saldo
    );
  }


  /* =========================================================
     CABEÇALHO DA COMPETÊNCIA
     ========================================================= */

  function atualizarCabecalhoCompetencia() {

    if (!competenciaAtual) {
      return;
    }

    const competenciaFormatada =
      formatarCompetencia(
        competenciaAtual.competencia
      );


    definirTexto(
      'inicioCompetenciaTitulo',
      competenciaFormatada
    );


    const status =
      document.getElementById(
        'inicioCompetenciaStatus'
      );


    if (status) {

      status.textContent =
        competenciaAtual.status === 'aberta'
          ? 'Aberta'
          : capitalizar(
              competenciaAtual.status
            );

      status.className =
        'status-badge status-aberta';
    }
  }


  /* =========================================================
     TABELA
     ========================================================= */

  function renderizarTabela() {

    const tabela =
      document.getElementById(
        'inicioTabelaDivergencias'
      );


    if (!tabela) {
      return;
    }


    tabela.innerHTML = '';


    if (!divergenciasAtual.length) {

      tabela.innerHTML = `
        <tr class="table-empty-row">
          <td colspan="5">
            <div class="empty-state compact">
              <div class="empty-state-icon">✓</div>

              <strong>
                Nenhuma divergência registrada
              </strong>

              <span>
                Não existem divergências na competência atual.
              </span>
            </div>
          </td>
        </tr>
      `;

      return;
    }


    /*
     * A tabela representa OCORRÊNCIAS RECENTES.
     *
     * Portanto, ela continua usando todas as divergências
     * e mostra somente as 5 mais recentes.
     *
     * Isso é diferente dos indicadores, que usam apenas
     * a última divergência de cada produto.
     */
    const registros =
      divergenciasAtual.slice(0, 5);


    registros.forEach(
      function (registro) {

        const produto =
          registro.produtos || {};


        const codigo =
          produto.codigo || '—';


        const descricao =
          produto.descricao ||
          'Produto não encontrado';


        const quantidade =
          Number(
            registro.divergencia_quantidade || 0
          );


        const valor =
          Number(
            registro.divergencia_valor || 0
          );


        const status =
          normalizarStatus(
            registro.status
          );


        const tr =
          document.createElement('tr');


        tr.innerHTML = `
          <td>
            <div class="product-cell">

              <strong>
                ${escaparHTML(descricao)}
              </strong>

              <span>
                ${escaparHTML(codigo)}
              </span>

            </div>
          </td>

          <td>
            ${escaparHTML(
              produto.secao || '—'
            )}
          </td>

          <td>
            <span class="${classeQuantidade(quantidade)}">
              ${formatarQuantidade(quantidade)}
            </span>
          </td>

          <td>
            <span class="${classeValor(valor)}">
              ${formatarMoeda(valor)}
            </span>
          </td>

          <td>
            <span class="status-badge ${classeStatus(status)}">
              ${textoStatus(status)}
            </span>
          </td>
        `;


        tabela.appendChild(tr);
      }
    );
  }


  /* =========================================================
     SEM COMPETÊNCIA
     ========================================================= */

  function mostrarSemCompetencia() {

    const alerta =
      document.getElementById(
        'inicioAlertaCompetencia'
      );


    if (alerta) {

      alerta.hidden = false;
    }


    const titulo =
      document.getElementById(
        'inicioCompetenciaTitulo'
      );


    if (titulo) {

      titulo.textContent =
        'Nenhuma competência aberta';
    }


    const status =
      document.getElementById(
        'inicioCompetenciaStatus'
      );


    if (status) {

      status.textContent =
        'Atenção';

      status.className =
        'status-badge status-atencao';
    }


    definirTexto(
      'inicioTotalDivergencias',
      '0'
    );

    definirTexto(
      'inicioTotalFaltas',
      formatarMoeda(0)
    );

    definirTexto(
      'inicioTotalSobras',
      formatarMoeda(0)
    );

    definirTexto(
      'inicioSaldoDivergencia',
      formatarMoeda(0)
    );


    definirTexto(
      'inicioResumoRegistros',
      '0'
    );

    definirTexto(
      'inicioResumoFaltas',
      formatarMoeda(0)
    );

    definirTexto(
      'inicioResumoSobras',
      formatarMoeda(0)
    );

    definirTexto(
      'inicioResumoSaldo',
      formatarMoeda(0)
    );


    const tabela =
      document.getElementById(
        'inicioTabelaDivergencias'
      );


    if (tabela) {

      tabela.innerHTML = `
        <tr class="table-empty-row">
          <td colspan="5">

            <div class="empty-state compact">

              <div class="empty-state-icon">
                !
              </div>

              <strong>
                Sem competência aberta
              </strong>

              <span>
                Abra uma competência para começar os lançamentos.
              </span>

            </div>

          </td>
        </tr>
      `;
    }
  }


  /* =========================================================
     ERRO
     ========================================================= */

  function mostrarErroInicio(mensagem) {

    if (
      typeof window.mostrarToast ===
      'function'
    ) {

      window.mostrarToast(
        mensagem,
        'erro'
      );
    }


    const tabela =
      document.getElementById(
        'inicioTabelaDivergencias'
      );


    if (tabela) {

      tabela.innerHTML = `
        <tr class="table-empty-row">
          <td colspan="5">

            <div class="empty-state compact">

              <div class="empty-state-icon">
                !
              </div>

              <strong>
                Não foi possível carregar os dados
              </strong>

              <span>
                ${escaparHTML(mensagem)}
              </span>

            </div>

          </td>
        </tr>
      `;
    }
  }


  /* =========================================================
     LIMPEZA VISUAL
     ========================================================= */

  function limparEstadoVisual() {

    const alerta =
      document.getElementById(
        'inicioAlertaCompetencia'
      );


    if (alerta) {

      alerta.hidden = true;
    }
  }


  /* =========================================================
     FORMATAÇÕES
     ========================================================= */

  function formatarMoeda(valor) {

    const numero =
      Number(valor || 0);


    return numero.toLocaleString(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL'
      }
    );
  }


  function formatarNumero(valor) {

    return Number(
      valor || 0
    ).toLocaleString(
      'pt-BR'
    );
  }


  function formatarQuantidade(valor) {

    const numero =
      Number(valor || 0);


    if (numero > 0) {

      return `+${formatarNumero(numero)}`;
    }


    return formatarNumero(numero);
  }


  function formatarCompetencia(data) {

    if (!data) {
      return '—';
    }


    const partes =
      String(data).split('-');


    if (partes.length < 2) {
      return data;
    }


    const ano =
      partes[0];

    const mes =
      partes[1];


    const nomesMeses = [

      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro'

    ];


    const indice =
      Number(mes) - 1;


    if (
      indice < 0 ||
      indice > 11
    ) {

      return `${mes}/${ano}`;
    }


    return `${nomesMeses[indice]} / ${ano}`;
  }


  /* =========================================================
     STATUS
     ========================================================= */

  function normalizarStatus(status) {

    return String(
      status || 'pendente'
    )
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .replace(
        /\s+/g,
        '_'
      );
  }


  function textoStatus(status) {

    const mapa = {

      pendente:
        'Pendente',

      aguardando_confirmacao:
        'Aguardando confirmação',

      resolvida:
        'Resolvida',

      resolvido:
        'Resolvido',

      continua:
        'Continua',

      em_analise:
        'Em análise'
    };


    return mapa[status] ||
      capitalizar(
        String(status || 'Pendente')
          .replaceAll('_', ' ')
      );
  }


  function classeStatus(status) {

    switch (status) {

      case 'resolvida':
      case 'resolvido':

        return 'status-resolvida';


      case 'aguardando_confirmacao':

        return 'status-atencao';


      case 'continua':

        return 'status-continua';


      case 'em_analise':

        return 'status-analise';


      case 'pendente':
      default:

        return 'status-pendente';
    }
  }


  /* =========================================================
     CLASSES DE VALOR
     ========================================================= */

  function classeValor(valor) {

    if (valor < 0) {

      return 'value-negative';
    }


    if (valor > 0) {

      return 'value-positive';
    }


    return 'value-neutral';
  }


  function classeQuantidade(valor) {

    if (valor < 0) {

      return 'quantity-negative';
    }


    if (valor > 0) {

      return 'quantity-positive';
    }


    return 'quantity-neutral';
  }


  function aplicarClasseValor(
    id,
    valor
  ) {

    const elemento =
      document.getElementById(id);


    if (!elemento) {
      return;
    }


    elemento.classList.remove(

      'value-negative',
      'value-positive',
      'value-neutral'

    );


    elemento.classList.add(
      classeValor(valor)
    );
  }


  /* =========================================================
     UTILITÁRIOS
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


  function capitalizar(texto) {

    if (!texto) {
      return '';
    }


    return texto.charAt(0).toUpperCase() +
      texto.slice(1);
  }


  function escaparHTML(valor) {

    return String(
      valor ?? ''
    )
      .replaceAll(
        '&',
        '&amp;'
      )
      .replaceAll(
        '<',
        '&lt;'
      )
      .replaceAll(
        '>',
        '&gt;'
      )
      .replaceAll(
        '"',
        '&quot;'
      )
      .replaceAll(
        "'",
        '&#039;'
      );
  }


  /* =========================================================
     API PÚBLICA
     ========================================================= */

  window.inicioStockVision = {

    carregar:
      inicializarInicio,

    recarregar:
      inicializarInicio,

    obterCompetencia:
      function () {

        return competenciaAtual;
      },

    /*
     * Retorna TODAS as divergências.
     * Isso preserva o histórico completo.
     */
    obterDivergencias:
      function () {

        return divergenciasAtual;
      },

    /*
     * Retorna somente a última divergência
     * de cada produto.
     *
     * Outros módulos podem utilizar esta função
     * futuramente se necessário.
     */
    obterDivergenciasAtuais:
      function () {

        return divergenciasAtuaisPorProduto;
      }
  };


  /* =========================================================
     EXECUÇÃO
     ========================================================= */

  /*
   * O app.js pode chamar esta função depois que
   * pages/inicio.html for carregado.
   *
   * Também deixamos uma execução automática caso
   * o arquivo seja carregado diretamente.
   */

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      function () {

        const pagina =
          document.getElementById(
            'inicioPage'
          );


        if (pagina) {

          inicializarInicio();
        }

      },
      {
        once: true
      }
    );

  } else {

    const pagina =
      document.getElementById(
        'inicioPage'
      );


    if (pagina) {

      inicializarInicio();
    }
  }

})();