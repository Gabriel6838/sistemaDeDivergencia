'use strict';

/* ============================================================
   STOCKVISION
   TRATAMENTO DE DIVERGÊNCIAS
   ============================================================ */

(function () {

  const estado = {

    inicializado: false,

    divergencias: [],
    produtos: [],
    competencias: [],
    trocas: [],

    resultados: [],
    selecionados: new Set(),

    resolucaoAtual: null,
    exclusaoAtual: null,
    trocaAtual: null

  };


  /* ==========================================================
     UTILITÁRIOS
     ========================================================== */

  function $(id) {
    return document.getElementById(id);
  }


  function texto(valor) {

    if (
      valor === null ||
      valor === undefined
    ) {
      return '';
    }

    return String(valor).trim();

  }


  function normalizar(valor) {

    return texto(valor)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  }


  function escaparHtml(valor) {

    return texto(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  }


  function numero(valor) {

    const resultado = Number(valor);

    return Number.isFinite(resultado)
      ? resultado
      : 0;

  }


  function formatarNumero(valor) {

    return numero(valor).toLocaleString(
      'pt-BR',
      {
        maximumFractionDigits: 2
      }
    );

  }


  function formatarMoeda(valor) {

    return numero(valor).toLocaleString(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL'
      }
    );

  }


  function formatarCompetencia(valor) {

    const partes =
      texto(valor).split('-');


    if (partes.length !== 2) {
      return texto(valor);
    }


    return `${partes[1]}/${partes[0]}`;

  }


  /* ==========================================================
     PRODUTOS
     ========================================================== */

  function obterProduto(produtoId) {

    if (!produtoId) {
      return null;
    }


    return estado.produtos.find(
      produto =>
        String(produto.id) ===
        String(produtoId)
    ) || null;

  }


  function obterProdutoDaDivergencia(
    divergencia
  ) {

    if (!divergencia) {
      return null;
    }


    return (
      obterProduto(
        divergencia.produto_id
      ) ||

      obterProduto(
        divergencia.produtoId
      )
    );

  }


  function obterCodigoProduto(
    divergencia
  ) {

    const produto =
      obterProdutoDaDivergencia(
        divergencia
      );


    return texto(
      produto?.codigo ||
      divergencia?.codigo ||
      divergencia?.codigo_produto
    );

  }


  function obterDescricaoProduto(
    divergencia
  ) {

    const produto =
      obterProdutoDaDivergencia(
        divergencia
      );


    return texto(
      produto?.descricao ||
      divergencia?.descricao ||
      divergencia?.produto_descricao ||
      'Produto não identificado'
    );

  }


  function obterSecaoProduto(
    divergencia
  ) {

    const produto =
      obterProdutoDaDivergencia(
        divergencia
      );


    return texto(
      produto?.secao ||
      divergencia?.secao ||
      '—'
    );

  }


  function obterTipoDivergencia(
    divergencia
  ) {

    const quantidade =
      numero(
        divergencia?.divergencia_quantidade
      );


    if (quantidade < 0) {
      return 'negativa';
    }


    if (quantidade > 0) {
      return 'positiva';
    }


    return 'zero';

  }


  /* ==========================================================
     TOAST
     ========================================================== */

  function mostrarToast(
    mensagem,
    tipo = 'info'
  ) {

    const toast =
      $('tratamentoToast');


    if (!toast) {
      return;
    }


    toast.textContent =
      mensagem;


    toast.className =
      `tratamento-toast tratamento-toast-${tipo}`;


    toast.classList.remove(
      'hidden'
    );


    clearTimeout(
      mostrarToast.timer
    );


    mostrarToast.timer =
      setTimeout(
        () => {

          toast.classList.add(
            'hidden'
          );

        },
        3000
      );

  }


  /* ==========================================================
     MODAIS
     ========================================================== */

  function abrirModal(id) {

    const modal = $(id);


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


  function fecharModal(id) {

    const modal = $(id);


    if (!modal) {
      return;
    }


    /*
     * Fechamento imediato.
     */

    modal.classList.add(
      'hidden'
    );


    modal.setAttribute(
      'aria-hidden',
      'true'
    );


    document.body.classList.remove(
      'modal-open'
    );

  }


  function fecharTodasModais() {

    document
      .querySelectorAll(
        '#tratamentoPage .modal-overlay'
      )
      .forEach(
        modal => {

          modal.classList.add(
            'hidden'
          );


          modal.setAttribute(
            'aria-hidden',
            'true'
          );

        }
      );


    document.body.classList.remove(
      'modal-open'
    );

  }


  /* ==========================================================
     SUPABASE
     ========================================================== */

  async function carregarDados() {

    const supabase =
      window.supabaseClient;


    if (!supabase) {

      throw new Error(
        'Conexão com o banco de dados não encontrada.'
      );

    }


    const [

      divergenciasResponse,

      produtosResponse,

      competenciasResponse,

      trocasResponse

    ] = await Promise.all([

      supabase
        .from('divergencias')
        .select('*')
        .order(
          'created_at',
          {
            ascending: false
          }
        ),

      supabase
        .from('produtos')
        .select('*')
        .order(
          'descricao',
          {
            ascending: true
          }
        ),

      supabase
        .from('competencias')
        .select('*')
        .order(
          'competencia',
          {
            ascending: false
          }
        ),

      supabase
        .from('trocas')
        .select('*')
        .order(
          'created_at',
          {
            ascending: false
          }
        )

    ]);


    if (divergenciasResponse.error) {
      throw divergenciasResponse.error;
    }


    if (produtosResponse.error) {
      throw produtosResponse.error;
    }


    if (competenciasResponse.error) {
      throw competenciasResponse.error;
    }


    if (trocasResponse.error) {
      throw trocasResponse.error;
    }


    estado.divergencias =
      divergenciasResponse.data || [];


    estado.produtos =
      produtosResponse.data || [];


    estado.competencias =
      competenciasResponse.data || [];


    estado.trocas =
      trocasResponse.data || [];

  }


  /* ==========================================================
     COMPETÊNCIAS
     ========================================================== */

  function preencherCompetencias() {

    const select =
      $('tratamentoCompetencia');


    if (!select) {
      return;
    }


    const valorAtual =
      select.value;


    select.innerHTML =
      '<option value="">Todas</option>';


    estado.competencias.forEach(
      competencia => {

        const option =
          document.createElement(
            'option'
          );


        option.value =
          competencia.competencia;


        option.textContent =
          formatarCompetencia(
            competencia.competencia
          );


        select.appendChild(
          option
        );

      }
    );


    select.value =
      valorAtual;

  }


  /* ==========================================================
     FILTROS
     ========================================================== */

  function aplicarFiltros() {

    const codigo =
      normalizar(
        $('tratamentoCodigo')?.value
      );


    const descricao =
      normalizar(
        $('tratamentoDescricao')?.value
      );


    const competencia =
      texto(
        $('tratamentoCompetencia')?.value
      );


    const status =
      normalizar(
        $('tratamentoStatus')?.value
      );


    const tipo =
      texto(
        $('tratamentoTipo')?.value
      );


    estado.resultados =
      estado.divergencias.filter(
        divergencia => {

          const codigoProduto =
            normalizar(
              obterCodigoProduto(
                divergencia
              )
            );


          const descricaoProduto =
            normalizar(
              obterDescricaoProduto(
                divergencia
              )
            );


          const competenciaProduto =
            texto(
              divergencia.competencia
            );


          const statusProduto =
            normalizar(
              divergencia.status
            );


          const tipoProduto =
            obterTipoDivergencia(
              divergencia
            );


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
            competencia &&
            competenciaProduto !==
            competencia
          ) {
            return false;
          }


          if (
            status &&
            statusProduto !==
            status
          ) {
            return false;
          }


          if (
            tipo &&
            tipoProduto !==
            tipo
          ) {
            return false;
          }


          return true;

        }
      );


    renderizarTabela();
    atualizarResumo();

  }


  function limparFiltros() {

    if ($('tratamentoCodigo')) {
      $('tratamentoCodigo').value = '';
    }


    if ($('tratamentoDescricao')) {
      $('tratamentoDescricao').value = '';
    }


    if ($('tratamentoCompetencia')) {
      $('tratamentoCompetencia').value = '';
    }


    if ($('tratamentoStatus')) {
      $('tratamentoStatus').value = '';
    }


    if ($('tratamentoTipo')) {
      $('tratamentoTipo').value = '';
    }


    estado.selecionados.clear();


    aplicarFiltros();

  }


  /* ==========================================================
     TROCAS
     ========================================================== */

  function obterTrocaDaDivergencia(
    divergenciaId
  ) {

    if (!divergenciaId) {
      return null;
    }


    return estado.trocas.find(
      troca => {

        return (

          String(
            troca.divergencia_origem_id
          ) ===
          String(divergenciaId)

          ||

          String(
            troca.divergencia_destino_id
          ) ===
          String(divergenciaId)

          ||

          String(
            troca.divergencia_id
          ) ===
          String(divergenciaId)

          ||

          String(
            troca.origem_divergencia_id
          ) ===
          String(divergenciaId)

          ||

          String(
            troca.destino_divergencia_id
          ) ===
          String(divergenciaId)

        );

      }
    ) || null;

  }


  function obterDivergenciaVinculada(
    troca,
    atual
  ) {

    if (
      !troca ||
      !atual
    ) {
      return null;
    }


    const atualId =
      String(atual.id);


    const origemId =
      troca.divergencia_origem_id ??
      troca.origem_divergencia_id;


    const destinoId =
      troca.divergencia_destino_id ??
      troca.destino_divergencia_id;


    if (
      origemId &&
      String(origemId) ===
      atualId
    ) {

      return estado.divergencias.find(
        divergencia =>
          String(divergencia.id) ===
          String(destinoId)
      ) || null;

    }


    if (
      destinoId &&
      String(destinoId) ===
      atualId
    ) {

      return estado.divergencias.find(
        divergencia =>
          String(divergencia.id) ===
          String(origemId)
      ) || null;

    }


    const outraId =
      troca.divergencia_relacionada_id ??
      troca.divergencia_vinculada_id;


    if (outraId) {

      return estado.divergencias.find(
        divergencia =>
          String(divergencia.id) ===
          String(outraId)
      ) || null;

    }


    return null;

  }


  function montarCardProdutoTroca(
    titulo,
    divergencia,
    classe
  ) {

    if (!divergencia) {

      return `

        <div class="
          troca-produto-card
          troca-produto-vazio
        ">

          <div class="troca-produto-card-topo">

            <span class="troca-produto-tipo">
              ${escaparHtml(titulo)}
            </span>

          </div>

          <div class="troca-produto-vazio-texto">

            Produto vinculado não encontrado.

          </div>

        </div>

      `;

    }


    const codigo =
      obterCodigoProduto(
        divergencia
      );


    const descricao =
      obterDescricaoProduto(
        divergencia
      );


    const secao =
      obterSecaoProduto(
        divergencia
      );


    const quantidade =
      numero(
        divergencia.divergencia_quantidade
      );


    const valor =
      numero(
        divergencia.divergencia_valor
      );


    return `

      <div class="
        troca-produto-card
        ${classe}
      ">

        <div class="troca-produto-card-topo">

          <span class="troca-produto-tipo">
            ${escaparHtml(titulo)}
          </span>

          <span class="troca-produto-codigo">
            ${escaparHtml(
              codigo || '—'
            )}
          </span>

        </div>


        <strong class="troca-produto-descricao">

          ${escaparHtml(
            descricao
          )}

        </strong>


        <div class="troca-produto-meta">

          <span>

            <small>
              Seção
            </small>

            <strong>
              ${escaparHtml(
                secao
              )}
            </strong>

          </span>


          <span>

            <small>
              Divergência
            </small>

            <strong>
              ${quantidade > 0 ? '+' : ''}
              ${formatarNumero(
                quantidade
              )}
            </strong>

          </span>


          <span>

            <small>
              Valor
            </small>

            <strong>
              ${formatarMoeda(
                valor
              )}
            </strong>

          </span>

        </div>

      </div>

    `;

  }


  function abrirModalTroca(
    divergencia
  ) {

    const troca =
      obterTrocaDaDivergencia(
        divergencia.id
      );


    if (!troca) {

      mostrarToast(
        'Nenhuma troca vinculada foi encontrada.',
        'warning'
      );

      return;

    }


    const vinculada =
      obterDivergenciaVinculada(
        troca,
        divergencia
      );


    estado.trocaAtual = {
      troca,
      divergencia,
      vinculada
    };


    const origemId =
      troca.divergencia_origem_id ??
      troca.origem_divergencia_id;


    const atualEhOrigem =
      origemId &&
      String(origemId) ===
      String(divergencia.id);


    const tituloAtual =
      atualEhOrigem
        ? 'Produto de origem'
        : 'Produto relacionado';


    const tituloVinculado =
      atualEhOrigem
        ? 'Produto de destino'
        : 'Produto de origem';


    const conteudo =
      $('modalTrocaTratamentoConteudo');


    if (!conteudo) {
      return;
    }


    conteudo.innerHTML = `

      <div class="troca-modal-resumo">

        <div class="troca-modal-status">

          <span class="troca-status-label">
            Status da troca
          </span>

          <strong class="
            troca-status-pill
            troca-status-${normalizar(
              troca.status ||
              'pendente'
            ).replace(
              /\s+/g,
              '-'
            )}
          ">

            ${escaparHtml(
              troca.status ||
              'Não informado'
            )}

          </strong>

        </div>


        <div class="troca-produtos-grid">

          ${montarCardProdutoTroca(
            tituloAtual,
            divergencia,
            'troca-produto-origem'
          )}


          <div class="troca-produto-conector">

            <span class="troca-conector-icon">
              ⇄
            </span>

          </div>


          ${montarCardProdutoTroca(
            tituloVinculado,
            vinculada,
            'troca-produto-destino'
          )}

        </div>


        ${
          troca.observacao
            ? `

              <div class="troca-modal-observacao">

                <span>
                  Observação da troca
                </span>

                <p>
                  ${escaparHtml(
                    troca.observacao
                  )}
                </p>

              </div>

            `
            : ''
        }

      </div>

    `;


    abrirModal(
      'modalTrocaTratamento'
    );

  }


  /* ==========================================================
     TABELA
     ========================================================== */

  function obterStatusClasse(
    status
  ) {

    const valor =
      normalizar(status);


    if (
      valor ===
      'resolvida'
    ) {
      return 'status-success';
    }


    if (
      valor ===
      'aguardando confirmacao'
    ) {
      return 'status-warning';
    }


    return 'status-danger';

  }


  function renderizarTabela() {

    const tbody =
      $('tratamentoTabela');


    if (!tbody) {
      return;
    }


    if (
      estado.resultados.length === 0
    ) {

      tbody.innerHTML = `

        <tr>

          <td
            colspan="8"
            class="tratamento-empty-cell"
          >

            <div class="tratamento-empty">

              <strong>
                Nenhuma divergência encontrada
              </strong>

              <span>
                Ajuste os filtros ou limpe a pesquisa.
              </span>

            </div>

          </td>

        </tr>

      `;

      return;

    }


    tbody.innerHTML =
      estado.resultados
        .map(
          divergencia => {

            const id =
              String(
                divergencia.id
              );


            const quantidade =
              numero(
                divergencia.divergencia_quantidade
              );


            const valor =
              numero(
                divergencia.divergencia_valor
              );


            const status =
              texto(
                divergencia.status
              ) || 'pendente';


            const selecionado =
              estado.selecionados.has(
                id
              );


            const troca =
              obterTrocaDaDivergencia(
                divergencia.id
              );


            const valorClasse =
              quantidade < 0
                ? 'valor-negativo'
                : quantidade > 0
                  ? 'valor-positivo'
                  : 'valor-neutro';


            return `

              <tr
                data-id="${escaparHtml(id)}"
                class="${
                  selecionado
                    ? 'is-selected'
                    : ''
                }"
              >

                <td class="tratamento-selection-column">

                  <input
                    type="checkbox"
                    class="tratamento-checkbox"
                    data-id="${escaparHtml(id)}"
                    ${
                      selecionado
                        ? 'checked'
                        : ''
                    }
                    aria-label="Selecionar divergência"
                  >

                </td>


                <td>

                  <div class="tratamento-produto">

                    <strong>
                      ${escaparHtml(
                        obterDescricaoProduto(
                          divergencia
                        )
                      )}
                    </strong>

                    <span>
                      Código:
                      ${escaparHtml(
                        obterCodigoProduto(
                          divergencia
                        ) || '—'
                      )}
                    </span>

                  </div>

                </td>


                <td>
                  ${escaparHtml(
                    obterSecaoProduto(
                      divergencia
                    )
                  )}
                </td>


                <td>
                  ${escaparHtml(
                    formatarCompetencia(
                      divergencia.competencia
                    )
                  )}
                </td>


                <td>

                  <strong class="${valorClasse}">

                    ${
                      quantidade > 0
                        ? '+'
                        : ''
                    }

                    ${formatarNumero(
                      quantidade
                    )}

                  </strong>

                </td>


                <td>

                  <strong class="${valorClasse}">

                    ${
                      quantidade > 0
                        ? '+'
                        : ''
                    }

                    ${formatarMoeda(
                      valor
                    )}

                  </strong>

                </td>


                <td>

                  <span class="
                    status-pill
                    ${obterStatusClasse(
                      status
                    )}
                  ">

                    ${escaparHtml(
                      status
                    )}

                  </span>

                </td>


                <td class="text-right">

                  <div class="table-actions">

                    ${
                      troca
                        ? `

                          <button
                            type="button"
                            class="
                              btn
                              btn-sm
                              btn-tratamento-troca
                            "
                            data-action="ver-troca"
                            data-id="${escaparHtml(id)}"
                          >
                            Ver troca
                          </button>

                        `
                        : ''
                    }


                    ${
                      normalizar(
                        status
                      ) !== 'resolvida'
                        ? `

                          <button
                            type="button"
                            class="
                              btn
                              btn-sm
                              btn-tratamento-resolver
                            "
                            data-action="resolver"
                            data-id="${escaparHtml(id)}"
                          >
                            Marcar como resolvida
                          </button>

                        `
                        : ''
                    }


                    <button
                      type="button"
                      class="
                        btn
                        btn-sm
                        btn-tratamento-excluir
                      "
                      data-action="excluir"
                      data-id="${escaparHtml(id)}"
                    >
                      Excluir
                    </button>

                  </div>

                </td>

              </tr>

            `;

          }
        )
        .join('');

  }


  /* ==========================================================
     RESUMO
     ========================================================== */

  function atualizarResumo() {

    const total =
      estado.resultados.length;


    const selecionados =
      estado.selecionados.size;


    if (
      $('tratamentoQuantidade')
    ) {

      $('tratamentoQuantidade')
        .textContent =
        `${total} ${
          total === 1
            ? 'registro'
            : 'registros'
        }`;

    }


    if (
      $('tratamentoResumoTotal')
    ) {

      $('tratamentoResumoTotal')
        .textContent =
        formatarNumero(
          total
        );

    }


    if (
      $('tratamentoSelecionados')
    ) {

      $('tratamentoSelecionados')
        .textContent =
        `${selecionados} ${
          selecionados === 1
            ? 'selecionada'
            : 'selecionadas'
        }`;


      $('tratamentoSelecionados')
        .classList.toggle(
          'hidden',
          selecionados === 0
        );

    }


    if (
      $('tratamentoSelecionadosVazio')
    ) {

      $('tratamentoSelecionadosVazio')
        .classList.toggle(
          'hidden',
          selecionados > 0
        );

    }


    if (
      $('tratamentoSelecionadosTopo')
    ) {

      $('tratamentoSelecionadosTopo')
        .textContent =
        selecionados > 0
          ? `${selecionados} selecionada${
              selecionados === 1
                ? ''
                : 's'
            }`
          : 'Nenhuma selecionada';

    }


    if (
      $('btnExcluirSelecionadas')
    ) {

      $('btnExcluirSelecionadas')
        .disabled =
        selecionados === 0;

    }


    if (
      $('tratamentoSelecionarTodos')
    ) {

      const marcados =
        estado.resultados.filter(
          item =>
            estado.selecionados.has(
              String(item.id)
            )
        ).length;


      $('tratamentoSelecionarTodos')
        .checked =
        total > 0 &&
        marcados === total;


      $('tratamentoSelecionarTodos')
        .indeterminate =
        marcados > 0 &&
        marcados < total;

    }

  }


  /* ==========================================================
     RESOLUÇÃO
     ========================================================== */

  function abrirModalResolucao(
    divergencia
  ) {

    estado.resolucaoAtual =
      divergencia;


    const produto =
      $('tratamentoProdutoResolucao');


    if (produto) {

      produto.textContent =
        `${obterCodigoProduto(
          divergencia
        ) || '—'} — ${
          obterDescricaoProduto(
            divergencia
          )
        }`;

    }


    const campo =
      $('tratamentoObservacaoResolucao');


    if (campo) {

      campo.value =
        texto(
          divergencia.observacao_resolucao
        );

    }


    abrirModal(
      'modalConfirmacaoTratamento'
    );

  }


  async function confirmarResolucao() {

    const divergencia =
      estado.resolucaoAtual;


    if (!divergencia) {
      return;
    }


    const supabase =
      window.supabaseClient;


    if (!supabase) {

      mostrarToast(
        'Conexão com o banco não encontrada.',
        'error'
      );

      return;

    }


    const observacao =
      texto(
        $('tratamentoObservacaoResolucao')
          ?.value
      );


    const botao =
      $('btnConfirmarTratamento');


    if (botao) {

      botao.disabled = true;

      botao.textContent =
        'Salvando...';

    }


    try {

      const resposta =
        await supabase
          .from('divergencias')
          .update({

            status:
              'resolvida',

            observacao_resolucao:
              observacao,

            resolvido_em:
              new Date().toISOString()

          })
          .eq(
            'id',
            divergencia.id
          );


      if (resposta.error) {
        throw resposta.error;
      }


      const troca =
        obterTrocaDaDivergencia(
          divergencia.id
        );


      if (troca) {

        const vinculada =
          obterDivergenciaVinculada(
            troca,
            divergencia
          );


        if (vinculada) {

          const respostaVinculada =
            await supabase
              .from('divergencias')
              .update({

                status:
                  'resolvida',

                observacao_resolucao:
                  observacao,

                resolvido_em:
                  new Date().toISOString()

              })
              .eq(
                'id',
                vinculada.id
              );


          if (
            respostaVinculada.error
          ) {

            throw respostaVinculada.error;

          }

        }


        const respostaTroca =
          await supabase
            .from('trocas')
            .update({
              status:
                'concluida'
            })
            .eq(
              'id',
              troca.id
            );


        if (
          respostaTroca.error
        ) {

          throw respostaTroca.error;

        }

      }


      fecharModal(
        'modalConfirmacaoTratamento'
      );


      estado.resolucaoAtual =
        null;


      await carregarDados();


      preencherCompetencias();
      aplicarFiltros();


      mostrarToast(
        troca
          ? 'Divergência e troca concluídas com sucesso.'
          : 'Divergência marcada como resolvida.',
        'success'
      );


    } catch (erro) {

      console.error(
        '[TRATAMENTO] Erro ao resolver:',
        erro
      );


      mostrarToast(
        erro.message ||
        'Não foi possível concluir a resolução.',
        'error'
      );


    } finally {

      if (botao) {

        botao.disabled =
          false;

        botao.textContent =
          'Confirmar resolução';

      }

    }

  }


  /* ==========================================================
     EXCLUSÃO
     ========================================================== */

  function abrirModalExclusao(
    divergencia
  ) {

    estado.exclusaoAtual =
      divergencia;


    const produto =
      $('tratamentoProdutoExclusao');


    if (produto) {

      produto.textContent =
        `${obterCodigoProduto(
          divergencia
        ) || '—'} — ${
          obterDescricaoProduto(
            divergencia
          )
        }`;

    }


    const troca =
      obterTrocaDaDivergencia(
        divergencia.id
      );


    const mensagem =
      $('tratamentoMensagemExclusao');


    if (mensagem) {

      mensagem.innerHTML = `

        <strong>
          Excluir esta divergência?
        </strong>

        <span>
          Esta ação removerá o registro
          permanentemente e não poderá ser desfeita.
        </span>

      `;

    }


    const aviso =
      $('tratamentoAvisoExclusao');


    if (aviso) {

      if (troca) {

        aviso.textContent =
          'Esta divergência possui uma troca vinculada e não pode ser excluída enquanto esse vínculo existir.';

        aviso.classList.remove(
          'hidden'
        );

      } else {

        aviso.textContent = '';

        aviso.classList.add(
          'hidden'
        );

      }

    }


    const botao =
      $('btnConfirmarExclusaoTratamento');


    if (botao) {

      botao.disabled =
        Boolean(troca);

    }


    abrirModal(
      'modalExclusaoTratamento'
    );

  }


async function confirmarExclusao() {

  const divergencia =
    estado.exclusaoAtual;


  if (!divergencia) {
    return;
  }


  /*
   * Verifica se existe uma troca vinculada.
   * Divergências vinculadas não podem ser excluídas.
   */

  const troca =
    obterTrocaDaDivergencia(
      divergencia.id
    );


  if (troca) {

    mostrarToast(
      'Não é possível excluir uma divergência vinculada a uma troca.',
      'warning'
    );

    return;

  }


  const supabase =
    window.supabaseClient;


  if (!supabase) {

    mostrarToast(
      'Conexão com o banco não encontrada.',
      'error'
    );

    return;

  }


  const botao =
    $('btnConfirmarExclusaoTratamento');


  if (botao) {

    botao.disabled = true;

    botao.textContent =
      'Excluindo...';

  }


  try {

    /*
     * O select('id') é proposital.
     *
     * Ele permite confirmar se o DELETE
     * realmente removeu o registro.
     */

    const resposta =
      await supabase
        .from('divergencias')
        .delete()
        .eq(
          'id',
          divergencia.id
        )
        .select('id');


    if (resposta.error) {
      throw resposta.error;
    }


    const removidos =
      resposta.data || [];


    /*
     * Nenhuma linha removida.
     *
     * Isso normalmente indica:
     * - política RLS impedindo DELETE;
     * - ID inexistente;
     * - ou alguma outra regra do banco.
     */

    if (!removidos.length) {

      throw new Error(
        'O banco não confirmou a exclusão da divergência. Verifique a permissão DELETE da tabela divergencias no Supabase.'
      );

    }


    /*
     * Fecha o modal somente depois
     * da confirmação real do banco.
     */

    fecharModal(
      'modalExclusaoTratamento'
    );


    estado.exclusaoAtual =
      null;


    estado.selecionados.delete(
      String(
        divergencia.id
      )
    );


    /*
     * Recarrega os dados do banco.
     */

    await carregarDados();


    preencherCompetencias();

    aplicarFiltros();


    mostrarToast(
      'Divergência excluída com sucesso.',
      'success'
    );


  } catch (erro) {

    console.error(
      '[TRATAMENTO] Erro ao excluir divergência:',
      erro
    );


    let mensagem =
      'Não foi possível excluir a divergência.';


    if (erro?.message) {

      mensagem =
        erro.message;

    }


    /*
     * Mensagens mais amigáveis
     * para problemas comuns do Supabase.
     */

    if (
      erro?.code === '42501'
    ) {

      mensagem =
        'O banco não permite excluir divergências. Verifique a política de DELETE da tabela divergencias no Supabase.';

    }


    if (
      erro?.code === '23503'
    ) {

      mensagem =
        'Esta divergência possui um registro relacionado no banco e não pode ser excluída.';

    }


    mostrarToast(
      mensagem,
      'error'
    );


  } finally {

    if (botao) {

      botao.disabled =
        false;

      botao.textContent =
        'Excluir divergência';

    }

  }

}


  /* ==========================================================
     EXCLUSÃO EM LOTE
     ========================================================== */

  async function excluirSelecionadas() {

    const ids =
      Array.from(
        estado.selecionados
      );


    if (!ids.length) {
      return;
    }


    const registros =
      estado.divergencias.filter(
        item =>
          ids.includes(
            String(item.id)
          )
      );


    const permitidas =
      registros.filter(
        item =>
          !obterTrocaDaDivergencia(
            item.id
          )
      );


    const bloqueadas =
      registros.filter(
        item =>
          obterTrocaDaDivergencia(
            item.id
          )
      );


    if (!permitidas.length) {

      mostrarToast(
        'Nenhuma das divergências selecionadas pode ser excluída porque possui troca vinculada.',
        'warning'
      );

      return;

    }


    estado.exclusaoAtual = {
      lote: true,
      ids: permitidas.map(
        item =>
          item.id
      )
    };


    const mensagem =
      $('tratamentoMensagemExclusao');


    if (mensagem) {

      mensagem.innerHTML = `

        <strong>
          Excluir ${
            permitidas.length
          } ${
            permitidas.length === 1
              ? 'divergência'
              : 'divergências'
          }?
        </strong>

        <span>
          ${
            bloqueadas.length
              ? `${
                  bloqueadas.length
                } ${
                  bloqueadas.length === 1
                    ? 'registro possui'
                    : 'registros possuem'
                } troca vinculada e será preservado.`
              : 'Os registros serão removidos permanentemente.'
          }
        </span>

      `;

    }


    const aviso =
      $('tratamentoAvisoExclusao');


    if (aviso) {

      if (bloqueadas.length) {

        aviso.textContent =
          'Os registros vinculados a trocas não serão excluídos.';

        aviso.classList.remove(
          'hidden'
        );

      } else {

        aviso.classList.add(
          'hidden'
        );

      }

    }


    const botao =
      $('btnConfirmarExclusaoTratamento');


    if (botao) {

      botao.disabled =
        false;

      botao.textContent =
        'Excluir selecionadas';

    }


    abrirModal(
      'modalExclusaoTratamento'
    );

  }


  async function confirmarExclusaoAtual() {

    if (
      estado.exclusaoAtual?.lote
    ) {

      await confirmarExclusaoLote();

      return;

    }


    await confirmarExclusao();

  }


  async function confirmarExclusaoLote() {

    const ids =
      estado.exclusaoAtual?.ids ||
      [];


    if (!ids.length) {
      return;
    }


    const supabase =
      window.supabaseClient;


    if (!supabase) {
      return;
    }


    const botao =
      $('btnConfirmarExclusaoTratamento');


    if (botao) {

      botao.disabled =
        true;

      botao.textContent =
        'Excluindo...';

    }


    try {

      const resposta =
        await supabase
          .from('divergencias')
          .delete()
          .in(
            'id',
            ids
          );


      if (resposta.error) {
        throw resposta.error;
      }


      fecharModal(
        'modalExclusaoTratamento'
      );


      estado.selecionados.clear();

      estado.exclusaoAtual =
        null;


      await carregarDados();


      preencherCompetencias();
      aplicarFiltros();


      mostrarToast(
        `${ids.length} ${
          ids.length === 1
            ? 'divergência excluída'
            : 'divergências excluídas'
        } com sucesso.`,
        'success'
      );


    } catch (erro) {

      console.error(
        '[TRATAMENTO] Erro na exclusão em lote:',
        erro
      );


      mostrarToast(
        erro.message ||
        'Não foi possível excluir os registros.',
        'error'
      );


    } finally {

      if (botao) {

        botao.disabled =
          false;

        botao.textContent =
          'Excluir selecionadas';

      }

    }

  }


  /* ==========================================================
     EVENTOS
     ========================================================== */

  function configurarEventos() {

    const page =
      $('tratamentoPage');


    if (!page) {
      return;
    }


    if (
      page.dataset.eventosConfigurados ===
      'true'
    ) {
      return;
    }


    page.dataset.eventosConfigurados =
      'true';


    /* --------------------------------------------------------
       FILTROS
       -------------------------------------------------------- */

    $('btnExecutarTratamento')
      ?.addEventListener(
        'click',
        aplicarFiltros
      );


    $('btnLimparTratamentoFiltros')
      ?.addEventListener(
        'click',
        limparFiltros
      );


    $('btnLimparTratamento')
      ?.addEventListener(
        'click',
        limparFiltros
      );


    $('tratamentoCodigo')
      ?.addEventListener(
        'keydown',
        event => {

          if (
            event.key ===
            'Enter'
          ) {

            aplicarFiltros();

          }

        }
      );


    $('tratamentoDescricao')
      ?.addEventListener(
        'keydown',
        event => {

          if (
            event.key ===
            'Enter'
          ) {

            aplicarFiltros();

          }

        }
      );


    /* --------------------------------------------------------
       SELECIONAR TODOS
       -------------------------------------------------------- */

    $('tratamentoSelecionarTodos')
      ?.addEventListener(
        'change',
        event => {

          const marcado =
            event.target.checked;


          estado.resultados.forEach(
            divergencia => {

              const id =
                String(
                  divergencia.id
                );


              if (marcado) {

                estado.selecionados.add(
                  id
                );

              } else {

                estado.selecionados.delete(
                  id
                );

              }

            }
          );


          renderizarTabela();
          atualizarResumo();

        }
      );


    /* --------------------------------------------------------
       EXCLUSÃO EM LOTE
       -------------------------------------------------------- */

    $('btnExcluirSelecionadas')
      ?.addEventListener(
        'click',
        excluirSelecionadas
      );


    /* --------------------------------------------------------
       RESOLUÇÃO
       -------------------------------------------------------- */

    $('btnConfirmarTratamento')
      ?.addEventListener(
        'click',
        confirmarResolucao
      );


    /* --------------------------------------------------------
       EXCLUSÃO
       -------------------------------------------------------- */

    $('btnConfirmarExclusaoTratamento')
      ?.addEventListener(
        'click',
        confirmarExclusaoAtual
      );


    /* --------------------------------------------------------
       TABELA
       -------------------------------------------------------- */

    const tabela =
      $('tratamentoTabela');


    tabela?.addEventListener(
      'change',
      event => {

        const checkbox =
          event.target.closest(
            '.tratamento-checkbox'
          );


        if (!checkbox) {
          return;
        }


        const id =
          String(
            checkbox.dataset.id
          );


        if (
          checkbox.checked
        ) {

          estado.selecionados.add(
            id
          );

        } else {

          estado.selecionados.delete(
            id
          );

        }


        renderizarTabela();
        atualizarResumo();

      }
    );


    tabela?.addEventListener(
      'click',
      event => {

        const botao =
          event.target.closest(
            'button[data-action]'
          );


        if (!botao) {
          return;
        }


        const id =
          botao.dataset.id;


        const divergencia =
          estado.divergencias.find(
            item =>
              String(item.id) ===
              String(id)
          );


        if (!divergencia) {
          return;
        }


        const action =
          botao.dataset.action;


        if (
          action ===
          'ver-troca'
        ) {

          abrirModalTroca(
            divergencia
          );

          return;

        }


        if (
          action ===
          'resolver'
        ) {

          abrirModalResolucao(
            divergencia
          );

          return;

        }


        if (
          action ===
          'excluir'
        ) {

          abrirModalExclusao(
            divergencia
          );

        }

      }
    );


    /* --------------------------------------------------------
       MODAIS
       -------------------------------------------------------- */

    page.addEventListener(
      'click',
      event => {

        /*
         * Botão X / Cancelar / Fechar
         */

        const botaoFechar =
          event.target.closest(
            '[data-modal-close]'
          );


        if (botaoFechar) {

          event.preventDefault();
          event.stopPropagation();


          fecharModal(
            botaoFechar.dataset.modalClose
          );


          return;

        }


        /*
         * Clique no fundo escuro.
         */

        const modal =
          event.target.closest(
            '.modal-overlay'
          );


        if (
          modal &&
          event.target === modal
        ) {

          event.preventDefault();


          fecharModal(
            modal.id
          );

        }

      }
    );

  }


  /* ==========================================================
     ESC
     ========================================================== */

  function configurarEscape() {

    if (
      document.body.dataset
        .tratamentoEscapeConfigurado ===
      'true'
    ) {
      return;
    }


    document.body.dataset
      .tratamentoEscapeConfigurado =
      'true';


    document.addEventListener(
      'keydown',
      event => {

        if (
          event.key !==
          'Escape'
        ) {
          return;
        }


        document
          .querySelectorAll(
            '#tratamentoPage .modal-overlay:not(.hidden)'
          )
          .forEach(
            modal => {

              fecharModal(
                modal.id
              );

            }
          );

      }
    );

  }


  /* ==========================================================
     INICIALIZAÇÃO
     ========================================================== */

  async function inicializar() {

    const page =
      $('tratamentoPage');


    if (!page) {
      return;
    }


    configurarEventos();
    configurarEscape();


    try {

      await carregarDados();


      preencherCompetencias();


      aplicarFiltros();


      estado.inicializado =
        true;


      console.log(
        '[TRATAMENTO] Inicializado com sucesso.'
      );


    } catch (erro) {

      console.error(
        '[TRATAMENTO] Erro:',
        erro
      );


      const tabela =
        $('tratamentoTabela');


      if (tabela) {

        tabela.innerHTML = `

          <tr>

            <td
              colspan="8"
              class="tratamento-empty-cell"
            >

              <div class="
                tratamento-empty
                tratamento-empty-error
              ">

                <strong>
                  Não foi possível carregar as divergências.
                </strong>

                <span>
                  ${escaparHtml(
                    erro.message ||
                    'Erro desconhecido.'
                  )}
                </span>

              </div>

            </td>

          </tr>

        `;

      }

    }

  }


  async function recarregar() {

    try {

      await carregarDados();


      preencherCompetencias();


      aplicarFiltros();


    } catch (erro) {

      console.error(
        '[TRATAMENTO] Erro ao recarregar:',
        erro
      );

    }

  }


  /* ==========================================================
     EVENTO DO APP
     ========================================================== */

  window.addEventListener(
    'stockvision:page-loaded',
    event => {

      if (
        event.detail?.page ===
        'tratamento'
      ) {

        inicializar();

      }

    }
  );


  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      inicializar
    );

  } else {

    inicializar();

  }


  /* ==========================================================
     API PÚBLICA
     ========================================================== */

  window.StockVisionTratamento = {

    init:
      inicializar,

    recarregar:
      recarregar

  };

})();