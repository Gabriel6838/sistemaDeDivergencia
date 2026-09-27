'use strict';

window.StockVisionCompetencias = (() => {

  let competencias = [];
  let competenciaAtual = null;
  let competenciaVisualizada = null;
  let divergenciasVisualizadas = [];
  let eventosConfigurados = false;
  let carregando = false;

  const $ = id =>
    document.getElementById(id);


  /* =========================================================
     INICIALIZAÇÃO
  ========================================================= */

  async function init() {

    configurarEventos();

    await carregarCompetencias();

  }


  /* =========================================================
     EVENTOS
  ========================================================= */

  function configurarEventos() {

    if (eventosConfigurados) {
      return;
    }

    eventosConfigurados = true;


    document.addEventListener(
      'click',
      async event => {

        const btnNova =
          event.target.closest(
            '#btnNovaCompetencia'
          );

        if (btnNova) {

          event.preventDefault();

          abrirNovaCompetencia();

          return;

        }


        const btnFecharNova =
          event.target.closest(
            '#btnFecharNovaCompetencia'
          );

        if (btnFecharNova) {

          event.preventDefault();

          fecharNovaCompetencia();

          return;

        }


        const btnCancelarNova =
          event.target.closest(
            '#btnCancelarNovaCompetencia'
          );

        if (btnCancelarNova) {

          event.preventDefault();

          fecharNovaCompetencia();

          return;

        }


        const btnVerAtual =
          event.target.closest(
            '#btnVerCompetenciaAtual'
          );

        if (btnVerAtual) {

          event.preventDefault();

          if (competenciaAtual) {

            await abrirVisualizacaoCompetencia(
              competenciaAtual
            );

          }

          return;

        }


        const btnEncerrar =
          event.target.closest(
            '#btnEncerrarCompetencia'
          );

        if (btnEncerrar) {

          event.preventDefault();

          abrirModalEncerramento();

          return;

        }


        const btnFecharEncerramento =
          event.target.closest(
            '#btnFecharEncerramento'
          );

        if (btnFecharEncerramento) {

          event.preventDefault();

          fecharModalEncerramento();

          return;

        }


        const btnCancelarEncerramento =
          event.target.closest(
            '#btnCancelarEncerramento'
          );

        if (btnCancelarEncerramento) {

          event.preventDefault();

          fecharModalEncerramento();

          return;

        }


        const btnConfirmarEncerramento =
          event.target.closest(
            '#btnConfirmarEncerramento'
          );

        if (btnConfirmarEncerramento) {

          event.preventDefault();

          await encerrarCompetencia();

          return;

        }


        const btnFecharVisualizacao =
          event.target.closest(
            '#btnFecharVisualizacaoCompetencia'
          );

        if (btnFecharVisualizacao) {

          event.preventDefault();

          fecharVisualizacaoCompetencia();

          return;

        }


        const btnFecharVisualizacaoFooter =
          event.target.closest(
            '#btnFecharVisualizacaoCompetenciaFooter'
          );

        if (btnFecharVisualizacaoFooter) {

          event.preventDefault();

          fecharVisualizacaoCompetencia();

          return;

        }


        const btnGerarPdf =
          event.target.closest(
            '#btnGerarPdfCompetencia'
          );

        if (btnGerarPdf) {

          event.preventDefault();

          await gerarPdfCompetencia();

          return;

        }


        const btnVerHistorico =
          event.target.closest(
            '[data-ver-competencia]'
          );

        if (btnVerHistorico) {

          event.preventDefault();

          const id =
            btnVerHistorico.dataset.verCompetencia;

          const competencia =
            competencias.find(
              item =>
                String(item.id) ===
                String(id)
            );

          if (competencia) {

            await abrirVisualizacaoCompetencia(
              competencia
            );

          }

          return;

        }


        const modalNova =
          event.target.closest(
            '#modalNovaCompetencia'
          );

        if (
          modalNova &&
          event.target === modalNova
        ) {

          fecharNovaCompetencia();

          return;

        }


        const modalEncerramento =
          event.target.closest(
            '#modalEncerramentoCompetencia'
          );

        if (
          modalEncerramento &&
          event.target === modalEncerramento
        ) {

          fecharModalEncerramento();

          return;

        }


        const modalVisualizacao =
          event.target.closest(
            '#modalVisualizacaoCompetencia'
          );

        if (
          modalVisualizacao &&
          event.target === modalVisualizacao
        ) {

          fecharVisualizacaoCompetencia();

        }

      }
    );


    document.addEventListener(
      'submit',
      async event => {

        if (
          event.target &&
          event.target.id ===
            'formNovaCompetencia'
        ) {

          event.preventDefault();

          await criarCompetencia();

        }

      }
    );


    document.addEventListener(
      'keydown',
      event => {

        if (
          event.key !== 'Escape'
        ) {
          return;
        }

        fecharNovaCompetencia();

        fecharModalEncerramento();

        fecharVisualizacaoCompetencia();

      }
    );

  }


  /* =========================================================
     CARREGAR COMPETÊNCIAS
  ========================================================= */

  async function carregarCompetencias() {

    if (carregando) {
      return;
    }

    carregando = true;

    renderizarCarregando();

    try {

      if (!window.supabaseClient) {
        throw new Error(
          'Supabase não está disponível.'
        );
      }


      const {
        data,
        error
      } =
        await window.supabaseClient
          .from('competencias')
          .select('*')
          .order(
            'competencia',
            {
              ascending: false
            }
          );


      if (error) {
        throw error;
      }


      competencias =
        Array.isArray(data)
          ? data
          : [];


      await carregarQuantidadeDivergencias();


      competenciaAtual =
        competencias.find(
          item =>
            String(item.status)
              .toLowerCase() ===
            'aberta'
        ) || null;


      renderizarCompetenciaAtual();

      renderizarTabela();


      if (
        window.StockVisionApp &&
        typeof
          window.StockVisionApp
            .updateCompetenciaGlobal ===
          'function'
      ) {

        await
          window.StockVisionApp
            .updateCompetenciaGlobal();

      }

    } catch (error) {

      console.error(
        'Erro ao carregar competências:',
        error
      );

      const mensagem =
        obterMensagemErro(
          error,
          'Não foi possível carregar as competências.'
        );

      renderizarErro(mensagem);

      mostrarToast(
        mensagem,
        'error'
      );

    } finally {

      carregando = false;

    }

  }


  /* =========================================================
     QUANTIDADE DE DIVERGÊNCIAS
     
     IMPORTANTE:
     A quantidade da competência agora representa
     produtos distintos que possuem um último registro.
     
     Não usamos apenas a quantidade bruta de lançamentos.
  ========================================================= */

  async function carregarQuantidadeDivergencias() {

    if (!competencias.length) {
      return;
    }


    await Promise.all(

      competencias.map(
        async competencia => {

          try {

            const dados =
              await buscarDivergenciasBrutas(
                competencia
              );

            const finais =
              obterDivergenciasFinais(
                dados
              );

            competencia.quantidade =
              finais.length;

          } catch (error) {

            console.error(
              'Erro ao contar divergências da competência:',
              competencia.id,
              error
            );

            competencia.quantidade = 0;

          }

        }
      )

    );

  }


  /* =========================================================
     BUSCAR DIVERGÊNCIAS BRUTAS
     
     Aqui buscamos TODOS os lançamentos.
     
     O histórico permanece intacto.
     A filtragem para "última por produto" acontece depois.
  ========================================================= */

  async function buscarDivergenciasBrutas(
    competencia
  ) {

    if (!competencia) {
      return [];
    }


    let registros = [];


    /* -------------------------------------------------------
       PRIMEIRA TENTATIVA:
       competência pelo ID
    ------------------------------------------------------- */

    const porId =
      await window.supabaseClient
        .from('divergencias')
        .select(`
          id,
          produto_id,
          competencia,
          competencia_id,
          quantidade_sistema,
          quantidade_fisica,
          divergencia_quantidade,
          custo,
          divergencia_valor,
          observacao,
          status,
          resolvido_em,
          observacao_resolucao,
          created_at
        `)
        .eq(
          'competencia_id',
          competencia.id
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        );


    if (porId.error) {
      throw porId.error;
    }


    registros =
      porId.data || [];


    /* -------------------------------------------------------
       COMPATIBILIDADE COM REGISTROS ANTIGOS
       
       Caso existam registros sem competencia_id,
       buscamos também pela competência textual.
    ------------------------------------------------------- */

    const competenciaNormalizada =
      normalizarCompetencia(
        competencia.competencia
      );


    const idsExistentes =
      new Set(
        registros.map(
          item =>
            String(item.id)
        )
      );


    const porTexto =
      await window.supabaseClient
        .from('divergencias')
        .select(`
          id,
          produto_id,
          competencia,
          competencia_id,
          quantidade_sistema,
          quantidade_fisica,
          divergencia_quantidade,
          custo,
          divergencia_valor,
          observacao,
          status,
          resolvido_em,
          observacao_resolucao,
          created_at
        `)
        .is(
          'competencia_id',
          null
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        );


    if (porTexto.error) {
      throw porTexto.error;
    }


    (porTexto.data || []).forEach(
      item => {

        if (
          idsExistentes.has(
            String(item.id)
          )
        ) {
          return;
        }


        if (
          normalizarCompetencia(
            item.competencia
          ) !==
          competenciaNormalizada
        ) {
          return;
        }


        registros.push(item);

      }
    );


    registros.sort(
      (
        a,
        b
      ) =>
        obterTimestamp(b) -
        obterTimestamp(a)
    );


    return carregarProdutosDivergencias(
      registros
    );

  }


  /* =========================================================
     REGRA PRINCIPAL DO STOCKVISION
     
     PARA CADA PRODUTO:
     
     - pega todos os lançamentos;
     - ordena pela data;
     - mantém somente o mais recente.
     
     Exemplo:
     
     Produto A
     01/09 → -R$ 100
     03/09 → -R$ 80
     
     Resultado final:
     Produto A → -R$ 80
     
     Se o último lançamento for R$ 0:
     
     01/09 → -R$ 100
     03/09 → R$ 0
     
     Resultado final:
     Produto A → R$ 0
     
     O histórico NÃO é apagado.
  ========================================================= */

  function obterDivergenciasFinais(
    registros
  ) {

    if (
      !Array.isArray(registros) ||
      !registros.length
    ) {
      return [];
    }


    const mapa =
      new Map();


    const ordenados =
      registros
        .slice()
        .sort(
          (
            a,
            b
          ) =>
            obterTimestamp(b) -
            obterTimestamp(a)
        );


    ordenados.forEach(
      registro => {

        const chave =
          obterChaveProduto(
            registro
          );


        /*
         * O primeiro registro encontrado é
         * o mais recente.
         *
         * Se já existe no mapa, ignoramos
         * os registros antigos.
         */

        if (
          mapa.has(chave)
        ) {
          return;
        }


        mapa.set(
          chave,
          registro
        );

      }
    );


    return Array.from(
      mapa.values()
    ).sort(
      (
        a,
        b
      ) =>
        obterTimestamp(b) -
        obterTimestamp(a)
    );

  }


  /* =========================================================
     CHAVE DO PRODUTO
     
     Normalmente usamos produto_id.
     
     Para registros antigos sem produto_id,
     usamos um identificador alternativo.
  ========================================================= */

  function obterChaveProduto(
    registro
  ) {

    if (
      registro &&
      registro.produto_id !== null &&
      registro.produto_id !== undefined &&
      String(
        registro.produto_id
      ).trim() !== ''
    ) {

      return `id:${String(
        registro.produto_id
      )}`;

    }


    /*
     * Fallback para registros antigos.
     */

    if (
      registro &&
      registro.produto &&
      registro.produto.codigo
    ) {

      return `codigo:${String(
        registro.produto.codigo
      ).trim()}`;

    }


    /*
     * Último recurso:
     * o próprio ID.
     */

    return `registro:${String(
      registro?.id || ''
    )}`;

  }


  /* =========================================================
     TIMESTAMP
  ========================================================= */

  function obterTimestamp(
    registro
  ) {

    if (
      !registro
    ) {
      return 0;
    }


    const data =
      new Date(
        registro.created_at || 0
      );


    const timestamp =
      data.getTime();


    return Number.isFinite(
      timestamp
    )
      ? timestamp
      : 0;

  }


  /* =========================================================
     CARREGAR PRODUTOS
  ========================================================= */

  async function carregarProdutosDivergencias(
    registros
  ) {

    const ids =
      [
        ...new Set(
          registros
            .map(
              item =>
                item.produto_id
            )
            .filter(Boolean)
            .map(
              id =>
                String(id)
            )
        )
      ];


    if (!ids.length) {
      return registros;
    }


    const {
      data,
      error
    } =
      await window.supabaseClient
        .from('produtos')
        .select(
          'id,codigo,descricao,secao'
        )
        .in(
          'id',
          ids
        );


    if (error) {
      throw error;
    }


    const mapa =
      new Map(
        (data || []).map(
          produto => [
            String(
              produto.id
            ),
            produto
          ]
        )
      );


    return registros.map(
      item => ({

        ...item,

        produto:
          mapa.get(
            String(
              item.produto_id
            )
          ) || null

      })
    );

  }


  /* =========================================================
     CARREGANDO
  ========================================================= */

  function renderizarCarregando() {

    const tbody =
      $('competenciasTabela');

    if (!tbody) {
      return;
    }


    tbody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="competencias-table-message"
        >
          <span class="competencias-loading">
            Carregando competências...
          </span>
        </td>
      </tr>
    `;

  }


  /* =========================================================
     ERRO
  ========================================================= */

  function renderizarErro(
    mensagem
  ) {

    const tbody =
      $('competenciasTabela');

    if (!tbody) {
      return;
    }


    tbody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="competencias-table-message"
        >
          ${escapeHtml(mensagem)}
        </td>
      </tr>
    `;

  }


  /* =========================================================
     COMPETÊNCIA ATUAL
  ========================================================= */

  function renderizarCompetenciaAtual() {

    const nome =
      $('competenciaAtualNome');

    const status =
      $('competenciaAtualStatus');

    const descricao =
      $('competenciaAtualDescricao');

    const abertura =
      $('competenciaAtualAbertura');

    const registros =
      $('competenciaAtualRegistros');

    const valor =
      $('competenciaAtualValor');

    const btnVer =
      $('btnVerCompetenciaAtual');

    const btnEncerrar =
      $('btnEncerrarCompetencia');


    if (!competenciaAtual) {

      if (nome) {
        nome.textContent =
          'Nenhuma competência aberta';
      }

      if (status) {

        status.textContent =
          'Nenhuma aberta';

        status.className =
          'competencia-status-pill';

      }

      if (descricao) {

        descricao.textContent =
          'Abra uma nova competência para começar a registrar divergências.';

      }

      if (abertura) {
        abertura.textContent =
          '—';
      }

      if (registros) {
        registros.textContent =
          '0';
      }

      if (valor) {
        valor.textContent =
          'R$ 0,00';
      }

      if (btnVer) {
        btnVer.disabled = true;
      }

      if (btnEncerrar) {
        btnEncerrar.disabled = true;
      }

      return;

    }


    const nomeCompetencia =
      formatarCompetencia(
        competenciaAtual.competencia
      );


    if (nome) {
      nome.textContent =
        nomeCompetencia;
    }


    if (status) {

      status.textContent =
        'Aberta';

      status.className =
        'competencia-status-pill aberta';

    }


    if (descricao) {

      descricao.textContent =
        'Esta é a competência atualmente aberta para registros de divergência.';

    }


    if (abertura) {

      abertura.textContent =
        formatarData(
          competenciaAtual.data_abertura
        );

    }


    if (registros) {

      registros.textContent =
        formatarNumero(
          competenciaAtual.quantidade || 0
        );

    }


    if (valor) {

      valor.textContent =
        'Carregando...';


      calcularValorCompetencia(
        competenciaAtual
      )
        .then(
          total => {

            if (
              competenciaAtual
            ) {

              valor.textContent =
                formatarMoedaComSinal(
                  total
                );

              valor.className =
                obterClasseValorCompetencia(
                  total
                );

            }

          }
        )
        .catch(
          error => {

            console.error(
              'Erro ao calcular valor da competência:',
              error
            );

            if (valor) {

              valor.textContent =
                'R$ 0,00';

              valor.className =
                '';

            }

          }
        );

    }


    if (btnVer) {
      btnVer.disabled = false;
    }

    if (btnEncerrar) {
      btnEncerrar.disabled = false;
    }

  }


  /* =========================================================
     VALOR FINAL DA COMPETÊNCIA
     
     IMPORTANTE:
     NÃO soma todos os lançamentos.
     
     Soma somente a última divergência de cada produto.
  ========================================================= */

  async function calcularValorCompetencia(
    competencia
  ) {

    if (!competencia) {
      return 0;
    }


    const dados =
      await buscarDivergenciasBrutas(
        competencia
      );


    const finais =
      obterDivergenciasFinais(
        dados
      );


    return finais.reduce(
      (
        total,
        item
      ) =>
        total +
        numeroSeguro(
          item.divergencia_valor
        ),
      0
    );

  }


  /* =========================================================
     TABELA DE COMPETÊNCIAS
  ========================================================= */

  function renderizarTabela() {

    const tbody =
      $('competenciasTabela');

    const contador =
      $('competenciasContador');


    if (contador) {

      const quantidade =
        competencias.length;

      contador.textContent =
        quantidade === 1
          ? '1 competência'
          : `${quantidade} competências`;

    }


    if (!tbody) {
      return;
    }


    if (!competencias.length) {

      tbody.innerHTML = `
        <tr>
          <td
            colspan="6"
            class="competencias-table-message"
          >
            Nenhuma competência cadastrada.
          </td>
        </tr>
      `;

      return;

    }


    tbody.innerHTML =
      competencias
        .map(
          competencia =>
            criarLinhaCompetencia(
              competencia
            )
        )
        .join('');

  }


  function criarLinhaCompetencia(
    competencia
  ) {

    const aberta =
      String(
        competencia.status || ''
      ).toLowerCase() ===
      'aberta';


    const statusTexto =
      aberta
        ? 'Aberta'
        : 'Encerrada';


    const statusClasse =
      aberta
        ? 'aberta'
        : 'encerrada';


    const quantidade =
      Number(
        competencia.quantidade
      ) || 0;


    return `
      <tr>

        <td>

          <div class="competencia-tabela-nome">

            <strong>
              ${escapeHtml(
                formatarCompetencia(
                  competencia.competencia
                )
              )}
            </strong>

            <span>
              ID ${escapeHtml(
                String(
                  competencia.id
                )
              )}
            </span>

          </div>

        </td>


        <td>

          <span
            class="competencia-status-tabela ${statusClasse}"
          >
            ${statusTexto}
          </span>

        </td>


        <td>
          ${escapeHtml(
            formatarData(
              competencia.data_abertura
            )
          )}
        </td>


        <td>
          ${escapeHtml(
            competencia.data_encerramento
              ? formatarData(
                  competencia.data_encerramento
                )
              : '—'
          )}
        </td>


        <td>
          ${formatarNumero(
            quantidade
          )}
        </td>


        <td>

          <div class="competencia-tabela-acoes">

            <button
              type="button"
              class="btn btn-secondary"
              data-ver-competencia="${escapeHtml(
                String(
                  competencia.id
                )
              )}"
            >
              Ver
            </button>

          </div>

        </td>

      </tr>
    `;

  }


  /* =========================================================
     NOVA COMPETÊNCIA
  ========================================================= */

  function abrirNovaCompetencia() {

    const modal =
      $('modalNovaCompetencia');

    const input =
      $('novaCompetencia');


    if (!modal) {
      return;
    }


    if (input) {

      if (!input.value) {

        const agora =
          new Date();

        const ano =
          agora.getFullYear();

        const mes =
          String(
            agora.getMonth() + 1
          )
            .padStart(
              2,
              '0'
            );

        input.value =
          `${ano}-${mes}`;

      }

      setTimeout(
        () => input.focus(),
        50
      );

    }


    abrirModal(
      modal
    );

  }


  function fecharNovaCompetencia() {

    const modal =
      $('modalNovaCompetencia');

    if (!modal) {
      return;
    }


    fecharModal(
      modal
    );

  }


  async function criarCompetencia() {

    const input =
      $('novaCompetencia');

    const button =
      $('btnSalvarNovaCompetencia');


    if (!input) {
      return;
    }


    const valor =
      String(
        input.value || ''
      ).trim();


    if (!/^\d{4}-\d{2}$/.test(valor)) {

      mostrarToast(
        'Selecione um mês válido.',
        'error'
      );

      return;

    }


    const competencia =
      `${valor}-01`;


    if (button) {

      button.disabled = true;

      button.textContent =
        'Abrindo...';

    }


    try {

      if (!window.supabaseClient) {
        throw new Error(
          'Supabase não está disponível.'
        );
      }


      const aberta =
        competencias.find(
          item =>
            String(
              item.status || ''
            ).toLowerCase() ===
            'aberta'
        );


      if (aberta) {

        throw new Error(
          `Já existe uma competência aberta: ${formatarCompetencia(aberta.competencia)}. Encerre a competência atual antes de abrir outra.`
        );

      }


      const existente =
        competencias.find(
          item =>
            normalizarCompetencia(
              item.competencia
            ) ===
            normalizarCompetencia(
              competencia
            )
        );


      if (existente) {

        throw new Error(
          `A competência ${formatarCompetencia(competencia)} já está cadastrada.`
        );

      }


      const {
        error
      } =
        await window.supabaseClient
          .from('competencias')
          .insert({
            competencia,
            status: 'aberta',
            data_abertura:
              new Date().toISOString()
          });


      if (error) {
        throw error;
      }


      fecharNovaCompetencia();


      if (input) {
        input.value = '';
      }


      mostrarToast(
        `Competência ${formatarCompetencia(competencia)} aberta com sucesso.`
      );


      await carregarCompetencias();

    } catch (error) {

      console.error(
        'Erro ao criar competência:',
        error
      );

      mostrarToast(
        obterMensagemErro(
          error,
          'Não foi possível criar a competência.'
        ),
        'error'
      );

    } finally {

      if (button) {

        button.disabled = false;

        button.textContent =
          'Abrir competência';

      }

    }

  }


  /* =========================================================
     ENCERRAMENTO
  ========================================================= */

  function abrirModalEncerramento() {

    if (!competenciaAtual) {

      mostrarToast(
        'Não existe uma competência aberta.',
        'error'
      );

      return;

    }


    const modal =
      $('modalEncerramentoCompetencia');

    const nome =
      $('encerramentoCompetenciaNome');


    if (!modal) {
      return;
    }


    if (nome) {

      nome.textContent =
        formatarCompetencia(
          competenciaAtual.competencia
        );

    }


    abrirModal(
      modal
    );

  }


  function fecharModalEncerramento() {

    const modal =
      $('modalEncerramentoCompetencia');

    if (!modal) {
      return;
    }


    fecharModal(
      modal
    );

  }


  async function encerrarCompetencia() {

    if (!competenciaAtual) {
      return;
    }


    const button =
      $('btnConfirmarEncerramento');


    if (button) {

      button.disabled = true;

      button.textContent =
        'Encerrando...';

    }


    try {

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
            competenciaAtual.id
          );


      if (error) {
        throw error;
      }


      fecharModalEncerramento();


      mostrarToast(
        `Competência ${formatarCompetencia(competenciaAtual.competencia)} encerrada com sucesso.`
      );


      await carregarCompetencias();

    } catch (error) {

      console.error(
        'Erro ao encerrar competência:',
        error
      );

      mostrarToast(
        obterMensagemErro(
          error,
          'Não foi possível encerrar a competência.'
        ),
        'error'
      );

    } finally {

      if (button) {

        button.disabled = false;

        button.textContent =
          'Encerrar competência';

      }

    }

  }


  /* =========================================================
     VISUALIZAÇÃO DA COMPETÊNCIA
  ========================================================= */

  async function abrirVisualizacaoCompetencia(
    competencia
  ) {

    competenciaVisualizada =
      competencia;

    divergenciasVisualizadas =
      [];


    const modal =
      $('modalVisualizacaoCompetencia');

    const corpo =
      $('divergenciasCompetenciaTabela');


    if (!modal) {
      return;
    }


    atualizarCabecalhoVisualizacao(
      competencia
    );


    if (corpo) {

      corpo.innerHTML = `
        <tr>
          <td
            colspan="10"
            class="competencias-table-message"
          >
            <span class="competencias-loading">
              Carregando divergências...
            </span>
          </td>
        </tr>
      `;

    }


    abrirModal(
      modal
    );


    try {

      /*
       * A visualização mostra somente
       * a divergência mais recente por produto.
       */

      const dadosBrutos =
        await buscarDivergenciasBrutas(
          competencia
        );


      divergenciasVisualizadas =
        obterDivergenciasFinais(
          dadosBrutos
        );


      renderizarDivergencias();


    } catch (error) {

      console.error(
        'Erro ao carregar divergências:',
        error
      );


      if (corpo) {

        corpo.innerHTML = `
          <tr>
            <td
              colspan="10"
              class="competencias-table-message"
            >
              ${escapeHtml(
                obterMensagemErro(
                  error,
                  'Não foi possível carregar as divergências.'
                )
              )}
            </td>
          </tr>
        `;

      }


      mostrarToast(
        obterMensagemErro(
          error,
          'Não foi possível carregar as divergências.'
        ),
        'error'
      );

    }

  }


  function atualizarCabecalhoVisualizacao(
    competencia
  ) {

    const titulo =
      $('visualizacaoCompetenciaTitulo');

    const status =
      $('visualizacaoCompetenciaStatus');

    const abertura =
      $('visualizacaoCompetenciaAbertura');


    if (titulo) {

      titulo.textContent =
        formatarCompetencia(
          competencia.competencia
        );

    }


    if (status) {

      const aberta =
        String(
          competencia.status || ''
        ).toLowerCase() ===
        'aberta';


      status.textContent =
        aberta
          ? 'Aberta'
          : 'Encerrada';


      status.className =
        `competencia-status-pill ${
          aberta
            ? 'aberta'
            : 'encerrada'
        }`;

    }


    if (abertura) {

      abertura.textContent =
        formatarData(
          competencia.data_abertura
        );

    }

  }


  /* =========================================================
     RENDERIZAR DIVERGÊNCIAS FINAIS
  ========================================================= */

  function renderizarDivergencias() {

    const corpo =
      $('divergenciasCompetenciaTabela');

    const total =
      $('visualizacaoTotalDivergencias');

    const valor =
      $('visualizacaoValorTotal');


    /*
     * Aqui já recebemos somente
     * a última divergência por produto.
     */

    if (total) {

      total.textContent =
        formatarNumero(
          divergenciasVisualizadas.length
        );

    }


    const valorTotal =
      divergenciasVisualizadas.reduce(
        (
          acumulado,
          item
        ) =>
          acumulado +
          numeroSeguro(
            item.divergencia_valor
          ),
        0
      );


    if (valor) {

      valor.textContent =
        formatarMoedaComSinal(
          valorTotal
        );

      valor.className =
        obterClasseValorCompetencia(
          valorTotal
        );

    }


    if (!corpo) {
      return;
    }


    if (
      !divergenciasVisualizadas.length
    ) {

      corpo.innerHTML = `
        <tr>
          <td
            colspan="10"
            class="competencias-table-message"
          >
            Nenhuma divergência registrada nesta competência.
          </td>
        </tr>
      `;

      return;

    }


    corpo.innerHTML =
      divergenciasVisualizadas
        .map(
          criarLinhaDivergencia
        )
        .join('');

  }


  /* =========================================================
     LINHA DA DIVERGÊNCIA
  ========================================================= */

  function criarLinhaDivergencia(
    item
  ) {

    const produto =
      item.produto || {};


    const codigo =
      produto.codigo ||
      '—';


    const descricao =
      produto.descricao ||
      'Produto não informado';


    const secao =
      produto.secao ||
      '—';


    const sistema =
      numeroSeguro(
        item.quantidade_sistema
      );


    const fisico =
      numeroSeguro(
        item.quantidade_fisica
      );


    const divergencia =
      numeroSeguro(
        item.divergencia_quantidade
      );


    const custo =
      numeroSeguro(
        item.custo
      );


    const valor =
      numeroSeguro(
        item.divergencia_valor
      );


    const status =
      String(
        item.status ||
        'pendente'
      );


    const observacao =
      item.observacao ||
      '—';


    return `
      <tr>

        <td>
          <strong>
            ${escapeHtml(codigo)}
          </strong>
        </td>


        <td class="competencia-produto-cell">

          <strong>
            ${escapeHtml(descricao)}
          </strong>

          <span>
            ${escapeHtml(codigo)}
          </span>

        </td>


        <td>
          ${escapeHtml(secao)}
        </td>


        <td>
          ${formatarNumero(sistema)}
        </td>


        <td>
          ${formatarNumero(fisico)}
        </td>


        <td>
          <strong
            class="${classeDivergencia(
              divergencia
            )}"
          >
            ${formatarDivergencia(
              divergencia
            )}
          </strong>
        </td>


        <td>
          ${formatarMoeda(custo)}
        </td>


        <td>
          <strong
            class="${
              valor < 0
                ? 'competencia-valor-negativo'
                : valor > 0
                  ? 'competencia-valor-positivo'
                  : ''
            }"
          >
            ${formatarMoedaComSinal(
              valor
            )}
          </strong>
        </td>


        <td>

          <span
            class="competencia-status-tabela ${classeStatusDivergencia(
              status
            )}"
          >
            ${escapeHtml(
              formatarStatusDivergencia(
                status
              )
            )}
          </span>

        </td>


        <td
          class="competencia-observacao-cell"
          title="${escapeHtml(
            observacao
          )}"
        >

          <span>
            ${escapeHtml(
              observacao
            )}
          </span>

        </td>

      </tr>
    `;

  }


  /* =========================================================
     FECHAR VISUALIZAÇÃO
  ========================================================= */

  function fecharVisualizacaoCompetencia() {

    const modal =
      $('modalVisualizacaoCompetencia');

    if (!modal) {
      return;
    }


    fecharModal(
      modal
    );

    competenciaVisualizada =
      null;

    divergenciasVisualizadas =
      [];

  }


  /* =========================================================
     GERAR PDF
     
     O PDF também utiliza somente a última
     divergência de cada produto.
  ========================================================= */

  async function gerarPdfCompetencia() {

    if (!competenciaVisualizada) {

      mostrarToast(
        'Nenhuma competência está sendo visualizada.',
        'error'
      );

      return;

    }


    if (
      !window.jspdf ||
      !window.jspdf.jsPDF
    ) {

      mostrarToast(
        'A biblioteca de PDF não está disponível.',
        'error'
      );

      return;

    }


    const button =
      $('btnGerarPdfCompetencia');


    if (button) {

      button.disabled = true;

      button.textContent =
        'Gerando...';

    }


    try {

      /*
       * Buscamos todos os lançamentos,
       * mas imediatamente aplicamos a regra
       * de última divergência por produto.
       */

      const dadosBrutos =
        await buscarDivergenciasBrutas(
          competenciaVisualizada
        );


      const dados =
        obterDivergenciasFinais(
          dadosBrutos
        );


      const {
        jsPDF
      } =
        window.jspdf;


      const pdf =
        new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });


      const nome =
        formatarCompetencia(
          competenciaVisualizada.competencia
        );


      pdf.setFontSize(17);

      pdf.setFont(
        undefined,
        'bold'
      );

      pdf.text(
        `StockVision — Competência ${nome}`,
        12,
        15
      );


      pdf.setFontSize(9);

      pdf.setFont(
        undefined,
        'normal'
      );


      pdf.text(
        `Status: ${
          competenciaVisualizada.status ===
          'aberta'
            ? 'Aberta'
            : 'Encerrada'
        }`,
        12,
        22
      );


      pdf.text(
        `Abertura: ${formatarData(
          competenciaVisualizada.data_abertura
        )}`,
        12,
        27
      );


      if (
        competenciaVisualizada.data_encerramento
      ) {

        pdf.text(
          `Encerramento: ${formatarData(
            competenciaVisualizada.data_encerramento
          )}`,
          12,
          32
        );

      }


      /*
       * TOTAL FINAL
       *
       * Não considera lançamentos antigos
       * do mesmo produto.
       */

      const total =
        dados.length;


      const valorTotal =
        dados.reduce(
          (
            acumulado,
            item
          ) =>
            acumulado +
            numeroSeguro(
              item.divergencia_valor
            ),
          0
        );


      pdf.setFont(
        undefined,
        'bold'
      );


      pdf.text(
        `Produtos considerados: ${total}`,
        90,
        22
      );


      pdf.text(
        `Valor final: ${formatarMoedaComSinal(
          valorTotal
        )}`,
        160,
        22
      );


      /*
       * Informação explicativa no PDF.
       */

      pdf.setFont(
        undefined,
        'normal'
      );

      pdf.setFontSize(7.5);

      pdf.text(
        'Critério: considerada a divergência mais recente de cada produto na competência.',
        90,
        27
      );


      let y =
        41;


      const colunas = [
        {
          titulo: 'Código',
          x: 12
        },
        {
          titulo: 'Produto',
          x: 38
        },
        {
          titulo: 'Seção',
          x: 100
        },
        {
          titulo: 'Sistema',
          x: 132
        },
        {
          titulo: 'Físico',
          x: 151
        },
        {
          titulo: 'Diverg.',
          x: 170
        },
        {
          titulo: 'Custo',
          x: 192
        },
        {
          titulo: 'Valor',
          x: 220
        },
        {
          titulo: 'Status',
          x: 251
        }
      ];


      desenharCabecalhoPdf(
        pdf,
        colunas,
        y
      );


      y += 7;


      if (!dados.length) {

        pdf.setFont(
          undefined,
          'normal'
        );

        pdf.text(
          'Nenhuma divergência registrada nesta competência.',
          12,
          y
        );

      } else {

        dados.forEach(
          item => {

            if (y > 190) {

              pdf.addPage();

              y = 15;

              desenharCabecalhoPdf(
                pdf,
                colunas,
                y
              );

              y += 7;

            }


            const produto =
              item.produto || {};


            const codigo =
              produto.codigo ||
              '—';


            const descricao =
              produto.descricao ||
              'Produto não informado';


            const secao =
              produto.secao ||
              '—';


            const sistema =
              numeroSeguro(
                item.quantidade_sistema
              );


            const fisico =
              numeroSeguro(
                item.quantidade_fisica
              );


            const divergencia =
              numeroSeguro(
                item.divergencia_quantidade
              );


            const custo =
              numeroSeguro(
                item.custo
              );


            const valor =
              numeroSeguro(
                item.divergencia_valor
              );


            const status =
              formatarStatusDivergencia(
                item.status
              );


            pdf.setFontSize(7.5);

            pdf.setFont(
              undefined,
              'normal'
            );


            pdf.text(
              limitarTexto(
                codigo,
                18
              ),
              12,
              y
            );


            pdf.text(
              limitarTexto(
                descricao,
                36
              ),
              38,
              y
            );


            pdf.text(
              limitarTexto(
                secao,
                18
              ),
              100,
              y
            );


            pdf.text(
              formatarNumero(
                sistema
              ),
              132,
              y
            );


            pdf.text(
              formatarNumero(
                fisico
              ),
              151,
              y
            );


            pdf.text(
              formatarDivergencia(
                divergencia
              ),
              170,
              y
            );


            pdf.text(
              formatarMoeda(
                custo
              ),
              192,
              y
            );


            pdf.text(
              formatarMoeda(
                valor
              ),
              220,
              y
            );


            pdf.text(
              limitarTexto(
                status,
                15
              ),
              251,
              y
            );


            y += 6;

          }
        );

      }


      pdf.save(
        `StockVision_${normalizarNomeArquivo(
          nome
        )}.pdf`
      );


      mostrarToast(
        'PDF gerado com sucesso.'
      );

    } catch (error) {

      console.error(
        'Erro ao gerar PDF:',
        error
      );

      mostrarToast(
        obterMensagemErro(
          error,
          'Não foi possível gerar o PDF.'
        ),
        'error'
      );

    } finally {

      if (button) {

        button.disabled = false;

        button.textContent =
          'Gerar PDF';

      }

    }

  }


  /* =========================================================
     CABEÇALHO PDF
  ========================================================= */

  function desenharCabecalhoPdf(
    pdf,
    colunas,
    y
  ) {

    pdf.setFontSize(7.5);

    pdf.setFont(
      undefined,
      'bold'
    );


    colunas.forEach(
      coluna => {

        pdf.text(
          coluna.titulo,
          coluna.x,
          y
        );

      }
    );


    pdf.setDrawColor(
      210,
      218,
      228
    );


    pdf.line(
      12,
      y + 2,
      285,
      y + 2
    );

  }


  /* =========================================================
     MODAIS
  ========================================================= */

  function abrirModal(
    modal
  ) {

    if (!modal) {
      return;
    }


    modal.classList.remove(
      'hidden'
    );


    modal.setAttribute(
      'aria-hidden',
      'false'
    );


    document.body.classList.add(
      'modal-open'
    );

  }


  function fecharModal(
    modal
  ) {

    if (!modal) {
      return;
    }


    modal.classList.add(
      'hidden'
    );


    modal.setAttribute(
      'aria-hidden',
      'true'
    );


    const modaisAbertos =
      document.querySelectorAll(
        '.competencias-modal:not(.hidden)'
      );


    if (!modaisAbertos.length) {

      document.body.classList.remove(
        'modal-open'
      );

    }

  }


  /* =========================================================
     FORMATAÇÕES
  ========================================================= */

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


    if (match) {

      return `${match[2]}/${match[1]}`;

    }


    const data =
      new Date(valor);


    if (
      !Number.isNaN(
        data.getTime()
      )
    ) {

      return `${String(
        data.getMonth() + 1
      ).padStart(
        2,
        '0'
      )}/${data.getFullYear()}`;

    }


    return texto;

  }


  function normalizarCompetencia(
    valor
  ) {

    if (!valor) {
      return '';
    }


    const texto =
      String(valor)
        .trim();


    const match =
      texto.match(
        /^(\d{4})-(\d{2})/
      );


    if (match) {

      return `${match[1]}-${match[2]}`;

    }


    const matchBr =
      texto.match(
        /^(\d{2})\/(\d{4})$/
      );


    if (matchBr) {

      return `${matchBr[2]}-${matchBr[1]}`;

    }


    const data =
      new Date(valor);


    if (
      !Number.isNaN(
        data.getTime()
      )
    ) {

      return `${data.getFullYear()}-${String(
        data.getMonth() + 1
      ).padStart(
        2,
        '0'
      )}`;

    }


    return texto;

  }


  function formatarData(
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

      return String(
        valor
      );

    }


    return data.toLocaleString(
      'pt-BR',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );

  }


  function formatarNumero(
    valor
  ) {

    return new Intl.NumberFormat(
      'pt-BR',
      {
        maximumFractionDigits: 2
      }
    ).format(
      numeroSeguro(
        valor
      )
    );

  }


  function formatarMoeda(
    valor
  ) {

    return new Intl.NumberFormat(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL'
      }
    ).format(
      numeroSeguro(
        valor
      )
    );

  }


  function formatarMoedaComSinal(
    valor
  ) {

    const numero =
      numeroSeguro(
        valor
      );


    if (numero > 0) {

      return `+${formatarMoeda(
        numero
      )}`;

    }


    return formatarMoeda(
      numero
    );

  }


  function formatarDivergencia(
    valor
  ) {

    const numero =
      numeroSeguro(
        valor
      );


    if (numero > 0) {

      return `+${formatarNumero(
        numero
      )}`;

    }


    return formatarNumero(
      numero
    );

  }


  /* =========================================================
     CLASSES DE VALOR
  ========================================================= */

  function obterClasseValorCompetencia(
    valor
  ) {

    const numero =
      numeroSeguro(
        valor
      );


    if (numero < 0) {

      return 'competencia-valor-negativo';

    }


    if (numero > 0) {

      return 'competencia-valor-positivo';

    }


    return '';

  }


  function classeDivergencia(
    valor
  ) {

    const numero =
      numeroSeguro(
        valor
      );


    if (numero > 0) {

      return 'competencia-divergencia-positiva';

    }


    if (numero < 0) {

      return 'competencia-divergencia-negativa';

    }


    return 'competencia-divergencia-zero';

  }


  /* =========================================================
     STATUS
  ========================================================= */

  function formatarStatusDivergencia(
    status
  ) {

    const texto =
      String(
        status ||
        'pendente'
      )
        .trim()
        .toLowerCase();


    if (
      texto ===
      'aguardando confirmação'
    ) {

      return 'Aguardando confirmação';

    }


    if (
      texto ===
      'aguardando_confirmacao'
    ) {

      return 'Aguardando confirmação';

    }


    if (
      texto ===
      'resolvida'
    ) {

      return 'Resolvida';

    }


    if (
      texto ===
      'resolvido'
    ) {

      return 'Resolvido';

    }


    if (
      texto ===
      'continua'
    ) {

      return 'Continua';

    }


    if (
      texto ===
      'em_analise'
    ) {

      return 'Em análise';

    }


    return 'Pendente';

  }


  function classeStatusDivergencia(
    status
  ) {

    const texto =
      String(
        status ||
        'pendente'
      )
        .trim()
        .toLowerCase();


    if (
      texto ===
      'resolvida' ||
      texto ===
      'resolvido'
    ) {

      return 'resolvida';

    }


    if (
      texto ===
      'aguardando confirmação' ||
      texto ===
      'aguardando_confirmacao'
    ) {

      return 'aguardando';

    }


    if (
      texto ===
      'continua'
    ) {

      return 'outro';

    }


    if (
      texto ===
      'em_analise'
    ) {

      return 'outro';

    }


    if (
      texto ===
      'pendente'
    ) {

      return 'pendente';

    }


    return 'outro';

  }


  /* =========================================================
     NÚMERO
  ========================================================= */

  function numeroSeguro(
    valor
  ) {

    const numero =
      Number(
        valor
      );


    return Number.isFinite(
      numero
    )
      ? numero
      : 0;

  }


  /* =========================================================
     HTML
  ========================================================= */

  function escapeHtml(
    valor
  ) {

    return String(
      valor ??
      ''
    )
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
     TEXTO
  ========================================================= */

  function limitarTexto(
    texto,
    tamanho
  ) {

    const valor =
      String(
        texto ||
        ''
      );


    if (
      valor.length <=
      tamanho
    ) {

      return valor;

    }


    return `${valor.slice(
      0,
      tamanho - 1
    )}…`;

  }


  function normalizarNomeArquivo(
    texto
  ) {

    return String(
      texto ||
      'competencia'
    )
      .normalize(
        'NFD'
      )
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .replace(
        /[^a-zA-Z0-9]+/g,
        '_'
      );

  }


  /* =========================================================
     ERROS
  ========================================================= */

  function obterMensagemErro(
    error,
    fallback
  ) {

    if (
      error &&
      error.message
    ) {

      return error.message;

    }


    if (
      typeof error ===
      'string'
    ) {

      return error;

    }


    return fallback;

  }


  /* =========================================================
     TOAST
  ========================================================= */

  function mostrarToast(
    mensagem,
    tipo = 'success'
  ) {

    let toast =
      document.getElementById(
        'competenciasToast'
      );


    if (!toast) {

      toast =
        document.createElement(
          'div'
        );

      toast.id =
        'competenciasToast';


      toast.style.position =
        'fixed';

      toast.style.right =
        '24px';

      toast.style.bottom =
        '24px';

      toast.style.zIndex =
        '2000';

      toast.style.maxWidth =
        '420px';

      toast.style.padding =
        '13px 16px';

      toast.style.borderRadius =
        '10px';

      toast.style.fontSize =
        '13px';

      toast.style.fontWeight =
        '600';

      toast.style.boxShadow =
        '0 12px 30px rgba(15, 23, 42, .16)';

      toast.style.border =
        '1px solid #e2e8f0';

      toast.style.background =
        '#ffffff';

      document.body.appendChild(
        toast
      );

    }


    toast.textContent =
      mensagem;


    if (
      tipo === 'error'
    ) {

      toast.style.color =
        '#b91c1c';

      toast.style.borderColor =
        '#fecaca';

      toast.style.background =
        '#fff7f7';

    } else {

      toast.style.color =
        '#166534';

      toast.style.borderColor =
        '#bbf7d0';

      toast.style.background =
        '#f0fdf4';

    }


    clearTimeout(
      toast._timeout
    );


    toast._timeout =
      setTimeout(
        () => {

          toast.remove();

        },
        3600
      );

  }


  /* =========================================================
     API PÚBLICA
  ========================================================= */

  return {
    init,

    /*
     * Expostas para outros módulos,
     * caso o Dashboard precise usar
     * exatamente a mesma regra.
     */

    obterDivergenciasFinais,

    obterChaveProduto

  };

})();