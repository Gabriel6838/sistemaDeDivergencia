const StockVisionPesquisa = {

  resultados: [],

  competencias: [],

  divergenciaSelecionada: null,

  elementos: {},

  listeners: [],


  async init() {

    this.cachearElementos();

    this.registrarEventos();

    await this.carregarCompetencias();

    await this.executarPesquisa();

  },


  obterSupabase() {

    if (
      window.StockVisionSupabase &&
      window.StockVisionSupabase.client
    ) {
      return window.StockVisionSupabase.client;
    }

    if (
      window.supabase &&
      window.supabaseClient
    ) {
      return window.supabaseClient;
    }

    if (
      window.supabase &&
      typeof window.supabase.from === 'function'
    ) {
      return window.supabase;
    }

    throw new Error(
      'Cliente Supabase não encontrado.'
    );

  },


  cachearElementos() {

    this.elementos = {

      codigo:
        document.getElementById(
          'pesquisaCodigo'
        ),

      descricao:
        document.getElementById(
          'pesquisaDescricao'
        ),

      secao:
        document.getElementById(
          'pesquisaSecao'
        ),

      competencia:
        document.getElementById(
          'pesquisaCompetencia'
        ),

      status:
        document.getElementById(
          'pesquisaStatus'
        ),

      tipo:
        document.getElementById(
          'pesquisaTipo'
        ),

      btnPesquisar:
        document.getElementById(
          'btnExecutarPesquisa'
        ),

      btnLimpar:
        document.getElementById(
          'btnLimparPesquisa'
        ),

      quantidade:
        document.getElementById(
          'pesquisaQuantidade'
        ),

      tabela:
        document.getElementById(
          'pesquisaTabela'
        ),

      modalHistorico:
        document.getElementById(
          'modalHistorico'
        ),

      modalHistoricoTitulo:
        document.getElementById(
          'modalHistoricoTitulo'
        ),

      modalHistoricoSubtitulo:
        document.getElementById(
          'modalHistoricoSubtitulo'
        ),

      historicoResumo:
        document.getElementById(
          'historicoResumo'
        ),

      historicoTimeline:
        document.getElementById(
          'historicoTimeline'
        ),

      btnFecharHistorico:
        document.getElementById(
          'btnFecharHistorico'
        ),

      btnFecharHistoricoRodape:
        document.getElementById(
          'btnFecharHistoricoRodape'
        )

    };

  },


  registrarEventos() {

    this.elementos.btnPesquisar
      ?.addEventListener(
        'click',
        () => this.executarPesquisa()
      );


    this.elementos.btnLimpar
      ?.addEventListener(
        'click',
        () => this.limparFiltros()
      );


    this.elementos.btnFecharHistorico
      ?.addEventListener(
        'click',
        () => this.fecharHistorico()
      );


    this.elementos.btnFecharHistoricoRodape
      ?.addEventListener(
        'click',
        () => this.fecharHistorico()
      );


    this.elementos.modalHistorico
      ?.addEventListener(
        'click',
        event => {

          if (
            event.target ===
            this.elementos.modalHistorico
          ) {

            this.fecharHistorico();

          }

        }
      );


    [
      this.elementos.codigo,
      this.elementos.descricao,
      this.elementos.secao
    ]
      .filter(Boolean)
      .forEach(
        elemento => {

          elemento.addEventListener(
            'keydown',
            event => {

              if (
                event.key === 'Enter'
              ) {

                event.preventDefault();

                this.executarPesquisa();

              }

            }
          );

        }
      );

  },


  async carregarCompetencias() {

    try {

      const supabase =
        this.obterSupabase();


      const {
        data,
        error
      } = await supabase
        .from('competencias')
        .select(
          'id, competencia, status'
        )
        .order(
          'competencia',
          {
            ascending: false
          }
        );


      if (error) {

        throw error;

      }


      this.competencias =
        data || [];


      const select =
        this.elementos.competencia;


      if (!select) {

        return;

      }


      select.innerHTML = `
        <option value="">
          Todas
        </option>
      `;


      this.competencias.forEach(
        competencia => {

          const option =
            document.createElement(
              'option'
            );


          option.value =
            competencia.competencia;


          option.textContent =
            this.formatarCompetencia(
              competencia.competencia
            );


          select.appendChild(
            option
          );

        }
      );

    } catch (error) {

      console.error(
        'Erro ao carregar competências:',
        error
      );

    }

  },


  async executarPesquisa() {

    const supabase =
      this.obterSupabase();


    this.mostrarCarregando();


    try {

      const {
        data,
        error
      } = await supabase
        .from('divergencias')
        .select(`
          *,
          produtos (
            id,
            codigo,
            descricao,
            secao
          )
        `)
        .order(
          'created_at',
          {
            ascending: false
          }
        );


      if (error) {

        throw error;

      }


      let registros =
        data || [];


      const filtros =
        this.obterFiltros();


      if (
        filtros.competencia
      ) {

        registros =
          registros.filter(
            registro =>
              registro.competencia ===
              filtros.competencia
          );

      }


      if (
        filtros.status
      ) {

        registros =
          registros.filter(
            registro =>
              String(
                registro.status || ''
              ).toLowerCase() ===
              filtros.status.toLowerCase()
          );

      }


      if (
        filtros.codigo
      ) {

        registros =
          registros.filter(
            registro =>
              this.normalizarTexto(
                registro.produtos?.codigo
              )
                .toLowerCase()
                .includes(
                  filtros.codigo
                )
          );

      }


      if (
        filtros.descricao
      ) {

        registros =
          registros.filter(
            registro =>
              this.normalizarTexto(
                registro.produtos?.descricao
              )
                .toLowerCase()
                .includes(
                  filtros.descricao
                )
          );

      }


      if (
        filtros.secao
      ) {

        registros =
          registros.filter(
            registro =>
              this.normalizarTexto(
                registro.produtos?.secao
              )
                .toLowerCase()
                .includes(
                  filtros.secao
                )
          );

      }


      if (
        filtros.tipo
      ) {

        registros =
          registros.filter(
            registro => {

              const quantidade =
                Number(
                  registro.divergencia_quantidade ||
                  0
                );


              if (
                filtros.tipo ===
                'negativa'
              ) {

                return quantidade < 0;

              }


              if (
                filtros.tipo ===
                'positiva'
              ) {

                return quantidade > 0;

              }


              if (
                filtros.tipo ===
                'zero'
              ) {

                return quantidade === 0;

              }


              return true;

            }
          );

      }


      this.resultados =
        registros;


      this.renderizarResultados();

    } catch (error) {

      console.error(
        'Erro na pesquisa:',
        error
      );


      this.elementos.quantidade.textContent =
        'Erro';


      this.elementos.tabela.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state empty-state-error">
              <strong>
                Não foi possível realizar a pesquisa
              </strong>

              <span>
                Verifique a conexão com o banco de dados e tente novamente.
              </span>
            </div>
          </td>
        </tr>
      `;

    }

  },


  obterFiltros() {

    return {

      codigo:
        this.normalizarTexto(
          this.elementos.codigo?.value
        )
          .toLowerCase(),

      descricao:
        this.normalizarTexto(
          this.elementos.descricao?.value
        )
          .toLowerCase(),

      secao:
        this.normalizarTexto(
          this.elementos.secao?.value
        )
          .toLowerCase(),

      competencia:
        this.elementos.competencia?.value ||
        '',

      status:
        this.elementos.status?.value ||
        '',

      tipo:
        this.elementos.tipo?.value ||
        ''

    };

  },


  limparFiltros() {

    if (this.elementos.codigo) {

      this.elementos.codigo.value = '';

    }


    if (this.elementos.descricao) {

      this.elementos.descricao.value = '';

    }


    if (this.elementos.secao) {

      this.elementos.secao.value = '';

    }


    if (this.elementos.competencia) {

      this.elementos.competencia.value = '';

    }


    if (this.elementos.status) {

      this.elementos.status.value = '';

    }


    if (this.elementos.tipo) {

      this.elementos.tipo.value = '';

    }


    this.executarPesquisa();

  },


  mostrarCarregando() {

    this.elementos.quantidade.textContent =
      'Carregando...';


    this.elementos.tabela.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <strong>
              Carregando divergências...
            </strong>

            <span>
              Aguarde enquanto os registros são consultados.
            </span>
          </div>
        </td>
      </tr>
    `;

  },


  renderizarResultados() {

    const quantidade =
      this.resultados.length;


    this.elementos.quantidade.textContent =
      `${quantidade} ${
        quantidade === 1
          ? 'registro'
          : 'registros'
      }`;


    if (!quantidade) {

      this.elementos.tabela.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <strong>
                Nenhuma divergência encontrada
              </strong>

              <span>
                Tente alterar ou remover alguns filtros.
              </span>
            </div>
          </td>
        </tr>
      `;

      return;

    }


    this.elementos.tabela.innerHTML =
      this.resultados
        .map(
          registro =>
            this.renderizarLinha(
              registro
            )
        )
        .join('');


    this.elementos.tabela
      .querySelectorAll(
        '[data-historico-id]'
      )
      .forEach(
        botao => {

          botao.addEventListener(
            'click',
            () => {

              const id =
                botao.dataset.historicoId;


              this.abrirHistorico(
                id
              );

            }
          );

        }
      );

  },


  renderizarLinha(registro) {

    const produto =
      registro.produtos || {};


    const quantidade =
      Number(
        registro.divergencia_quantidade ||
        0
      );


    const valor =
      Number(
        registro.divergencia_valor ||
        0
      );


    const classeQuantidade =
      quantidade < 0
        ? 'negative'
        : quantidade > 0
          ? 'positive'
          : 'zero';


    return `
      <tr>

        <td>
          <span class="table-code">
            ${this.escapeHtml(
              produto.codigo ||
              '—'
            )}
          </span>
        </td>


        <td>
          <div class="pesquisa-produto">

            <strong>
              ${this.escapeHtml(
                produto.descricao ||
                'Produto não identificado'
              )}
            </strong>

          </div>
        </td>


        <td>
          ${this.escapeHtml(
            produto.secao ||
            '—'
          )}
        </td>


        <td>
          <span class="timeline-competencia">
            ${this.escapeHtml(
              this.formatarCompetencia(
                registro.competencia
              )
            )}
          </span>
        </td>


        <td>
          <span
            class="pesquisa-quantidade ${classeQuantidade}"
          >
            ${quantidade > 0 ? '+' : ''}
            ${quantidade}
          </span>
        </td>


        <td>
          <span class="pesquisa-valor">
            ${this.formatarMoeda(
              valor
            )}
          </span>
        </td>


        <td>
          ${this.renderizarStatus(
            registro.status
          )}
        </td>


        <td class="text-right">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            data-historico-id="${this.escapeAttribute(
              registro.produto_id
            )}"
          >
            Histórico
          </button>
        </td>

      </tr>
    `;

  },


  renderizarStatus(status) {

    const valor =
      String(
        status || ''
      )
        .trim()
        .toLowerCase();


    const mapa = {

      pendente: {
        classe: 'status-warning',
        texto: 'Pendente'
      },

      'aguardando confirmação': {
        classe: 'status-info',
        texto: 'Aguardando confirmação'
      },

      resolvida: {
        classe: 'status-success',
        texto: 'Resolvida'
      }

    };


    const configuracao =
      mapa[valor] || {
        classe: 'status-neutral',
        texto:
          status ||
          'Sem status'
      };


    return `
      <span class="status-pill ${configuracao.classe}">
        ${this.escapeHtml(
          configuracao.texto
        )}
      </span>
    `;

  },


  async abrirHistorico(produtoId) {

    if (!produtoId) {

      return;

    }


    this.abrirModal();


    this.elementos.modalHistoricoTitulo.textContent =
      'Carregando histórico...';


    this.elementos.modalHistoricoSubtitulo.textContent =
      '';


    this.elementos.historicoResumo.innerHTML =
      '';


    this.elementos.historicoTimeline.innerHTML = `
      <div class="empty-state">
        Carregando histórico...
      </div>
    `;


    try {

      const supabase =
        this.obterSupabase();


      const {
        data: produto,
        error: erroProduto
      } = await supabase
        .from('produtos')
        .select(
          'id, codigo, descricao, secao'
        )
        .eq(
          'id',
          produtoId
        )
        .single();


      if (erroProduto) {

        throw erroProduto;

      }


      const {
        data: divergencias,
        error: erroDivergencias
      } = await supabase
        .from('divergencias')
        .select('*')
        .eq(
          'produto_id',
          produtoId
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        );


      if (erroDivergencias) {

        throw erroDivergencias;

      }


      const listaDivergencias =
        divergencias || [];


      const ids =
        listaDivergencias
          .map(
            item => item.id
          )
          .filter(Boolean);


      let trocas = [];


      if (ids.length) {

        const {
          data,
          error
        } = await supabase
          .from('trocas')
          .select(`
            id,
            competencia_id,
            divergencia_origem_id,
            divergencia_destino_id,
            status,
            observacao,
            created_at
          `)
          .or(
            `divergencia_origem_id.in.(${ids.join(',')}),divergencia_destino_id.in.(${ids.join(',')})`
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


        trocas =
          data || [];

      }


      const idsOutrasDivergencias =
        trocas
          .flatMap(
            troca => [
              troca.divergencia_origem_id,
              troca.divergencia_destino_id
            ]
          )
          .filter(
            id =>
              id &&
              !ids.includes(id)
          );


      let outrasDivergencias =
        [];


      if (
        idsOutrasDivergencias.length
      ) {

        const {
          data,
          error
        } = await supabase
          .from('divergencias')
          .select(`
            *,
            produtos (
              id,
              codigo,
              descricao,
              secao
            )
          `)
          .in(
            'id',
            idsOutrasDivergencias
          );


        if (error) {

          throw error;

        }


        outrasDivergencias =
          data || [];

      }


      this.renderizarCabecalhoHistorico(
        produto
      );


      this.renderizarResumoHistorico(
        listaDivergencias
      );


      this.renderizarTimeline(
        listaDivergencias,
        trocas,
        outrasDivergencias
      );

    } catch (error) {

      console.error(
        'Erro ao carregar histórico:',
        error
      );


      this.elementos.modalHistoricoTitulo.textContent =
        'Erro ao carregar histórico';


      this.elementos.historicoTimeline.innerHTML = `
        <div class="empty-state empty-state-error">

          <strong>
            Não foi possível carregar o histórico
          </strong>

          <span>
            Verifique a conexão com o banco de dados e tente novamente.
          </span>

        </div>
      `;

    }

  },


  renderizarCabecalhoHistorico(produto) {

    this.elementos.modalHistoricoTitulo.textContent =
      produto.descricao ||
      'Produto';


    this.elementos.modalHistoricoSubtitulo.textContent =
      [
        produto.codigo
          ? `Código: ${produto.codigo}`
          : null,

        produto.secao
          ? `Seção: ${produto.secao}`
          : null

      ]
        .filter(Boolean)
        .join(' • ');

  },


  renderizarResumoHistorico(
    divergencias
  ) {

    const total =
      divergencias.length;


    const quantidadeTotal =
      divergencias.reduce(
        (total, item) =>
          total +
          Number(
            item.divergencia_quantidade ||
            0
          ),
        0
      );


    const valorTotal =
      divergencias.reduce(
        (total, item) =>
          total +
          Number(
            item.divergencia_valor ||
            0
          ),
        0
      );


    const positivas =
      divergencias.filter(
        item =>
          Number(
            item.divergencia_quantidade ||
            0
          ) > 0
      ).length;


    const negativas =
      divergencias.filter(
        item =>
          Number(
            item.divergencia_quantidade ||
            0
          ) < 0
      ).length;


    this.elementos.historicoResumo.innerHTML = `

      <div class="history-stat">

        <span class="history-stat-label">
          Registros
        </span>

        <strong class="history-stat-value">
          ${total}
        </strong>

      </div>


      <div class="history-stat">

        <span class="history-stat-label">
          Divergência total
        </span>

        <strong class="history-stat-value">
          ${quantidadeTotal > 0 ? '+' : ''}
          ${quantidadeTotal}
        </strong>

      </div>


      <div class="history-stat">

        <span class="history-stat-label">
          Valor acumulado
        </span>

        <strong class="history-stat-value">
          ${this.formatarMoeda(
            valorTotal
          )}
        </strong>

      </div>


      <div class="history-stat">

        <span class="history-stat-label">
          Faltas
        </span>

        <strong class="history-stat-value">
          ${negativas}
        </strong>

      </div>


      <div class="history-stat">

        <span class="history-stat-label">
          Sobras
        </span>

        <strong class="history-stat-value">
          ${positivas}
        </strong>

      </div>

    `;

  },


  renderizarTimeline(
    divergencias,
    trocas,
    outrasDivergencias
  ) {

    if (!divergencias.length) {

      this.elementos.historicoTimeline.innerHTML = `
        <div class="empty-state">

          <strong>
            Nenhum histórico encontrado
          </strong>

          <span>
            Este produto ainda não possui divergências registradas.
          </span>

        </div>
      `;

      return;

    }


    const mapaOutras =
      new Map(
        outrasDivergencias.map(
          item => [
            item.id,
            item
          ]
        )
      );


    this.elementos.historicoTimeline.innerHTML =
      divergencias
        .map(
          divergencia => {

            const troca =
              trocas.find(
                item =>
                  item.divergencia_origem_id ===
                    divergencia.id ||
                  item.divergencia_destino_id ===
                    divergencia.id
              );


            let outraDivergencia =
              null;


            if (troca) {

              const outroId =
                troca.divergencia_origem_id ===
                  divergencia.id
                  ? troca.divergencia_destino_id
                  : troca.divergencia_origem_id;


              outraDivergencia =
                mapaOutras.get(
                  outroId
                ) || null;

            }


            return this.renderizarItemTimeline(
              divergencia,
              troca,
              outraDivergencia
            );

          }
        )
        .join('');

  },


  renderizarItemTimeline(
    divergencia,
    troca,
    outraDivergencia
  ) {

    const quantidade =
      Number(
        divergencia.divergencia_quantidade ||
        0
      );


    const valor =
      Number(
        divergencia.divergencia_valor ||
        0
      );


    const classes = [
      'timeline-item'
    ];


    if (
      divergencia.observacao
    ) {

      classes.push(
        'timeline-item-has-note'
      );

    }


    if (troca) {

      classes.push(
        'timeline-item-has-trade'
      );

    }


    const classeDivergencia =
      quantidade < 0
        ? 'negative'
        : quantidade > 0
          ? 'positive'
          : 'zero';


    return `

      <article
        class="${classes.join(' ')}"
      >

        <div class="timeline-marker">
          <span></span>
        </div>


        <div class="timeline-content">

          <div class="timeline-top">

            <div class="timeline-main">

              <span class="timeline-competencia">
                ${this.escapeHtml(
                  this.formatarCompetencia(
                    divergencia.competencia
                  )
                )}
              </span>


              <span class="timeline-date">
                ${this.escapeHtml(
                  this.formatarData(
                    divergencia.created_at
                  )
                )}
              </span>

            </div>


            ${this.renderizarStatus(
              divergencia.status
            )}

          </div>


          <div class="timeline-details">

            <div class="timeline-detail">

              <span class="timeline-detail-label">
                Qtd. sistema
              </span>

              <strong class="timeline-detail-value">
                ${this.formatarNumero(
                  divergencia.quantidade_sistema
                )}
              </strong>

            </div>


            <div class="timeline-detail">

              <span class="timeline-detail-label">
                Qtd. física
              </span>

              <strong class="timeline-detail-value">
                ${this.formatarNumero(
                  divergencia.quantidade_fisica
                )}
              </strong>

            </div>


            <div class="timeline-detail">

              <span class="timeline-detail-label">
                Divergência
              </span>

              <strong
                class="timeline-detail-value ${classeDivergencia}"
              >
                ${quantidade > 0 ? '+' : ''}
                ${this.formatarNumero(
                  quantidade
                )}
              </strong>

            </div>


            <div class="timeline-detail">

              <span class="timeline-detail-label">
                Valor
              </span>

              <strong class="timeline-detail-value">
                ${this.formatarMoeda(
                  valor
                )}
              </strong>

            </div>

          </div>


          ${
            divergencia.observacao
              ? `
                <div class="timeline-note">

                  <span>
                    Observação
                  </span>

                  <p>
                    ${this.escapeHtml(
                      divergencia.observacao
                    )}
                  </p>

                </div>
              `
              : ''
          }


          ${
            troca
              ? this.renderTrocaHistorico(
                  divergencia,
                  troca,
                  outraDivergencia
                )
              : ''
          }

        </div>

      </article>

    `;

  },


  renderTrocaHistorico(
    divergenciaAtual,
    troca,
    outraDivergencia
  ) {

    const origem =
      troca.divergencia_origem_id ===
      divergenciaAtual.id;


    const papel =
      origem
        ? 'Produto de origem'
        : 'Produto de destino';


    const statusTroca =
      this.formatarStatusTroca(
        troca.status
      );


    const produto =
      outraDivergencia?.produtos ||
      {};


    return `

      <div class="timeline-trade">

        <div class="timeline-trade-header">

          <div class="timeline-trade-title">

            <span class="timeline-trade-icon">
              ↔
            </span>

            <div>

              <strong>
                Troca vinculada
              </strong>

              <span>
                ${this.escapeHtml(
                  papel
                )}
              </span>

            </div>

          </div>


          <span
            class="status-pill ${statusTroca.classe}"
          >
            ${this.escapeHtml(
              statusTroca.texto
            )}
          </span>

        </div>


        ${
          outraDivergencia
            ? `

              <div class="timeline-trade-product">

                <span class="timeline-trade-product-label">
                  Produto relacionado
                </span>


                <div class="timeline-trade-product-info">

                  <div class="timeline-trade-product-field">

                    <span>
                      Produto
                    </span>

                    <strong>
                      ${this.escapeHtml(
                        produto.descricao ||
                        'Produto não identificado'
                      )}
                    </strong>

                  </div>


                  <div class="timeline-trade-product-field">

                    <span>
                      Código
                    </span>

                    <strong>
                      ${this.escapeHtml(
                        produto.codigo ||
                        '—'
                      )}
                    </strong>

                  </div>


                  <div class="timeline-trade-product-field">

                    <span>
                      Seção
                    </span>

                    <strong>
                      ${this.escapeHtml(
                        produto.secao ||
                        '—'
                      )}
                    </strong>

                  </div>

                </div>


                <div class="timeline-trade-details">

                  <div class="timeline-trade-detail">

                    <span>
                      Divergência
                    </span>

                    <strong>
                      ${
                        Number(
                          outraDivergencia.divergencia_quantidade ||
                          0
                        ) > 0
                          ? '+'
                          : ''
                      }${this.formatarNumero(
                        outraDivergencia.divergencia_quantidade
                      )}
                    </strong>

                  </div>


                  <div class="timeline-trade-detail">

                    <span>
                      Valor
                    </span>

                    <strong>
                      ${this.formatarMoeda(
                        outraDivergencia.divergencia_valor
                      )}
                    </strong>

                  </div>

                </div>

              </div>

            `
            : `
              <div class="timeline-trade-product-empty">

                <span>
                  Produto relacionado
                </span>

                <strong>
                  Não foi possível localizar a divergência relacionada.
                </strong>

              </div>
            `
        }


        ${
          troca.observacao
            ? `

              <div class="timeline-trade-observation">

                <span>
                  Observação da troca
                </span>

                <p>
                  ${this.escapeHtml(
                    troca.observacao
                  )}
                </p>

              </div>

            `
            : ''
        }


        <div class="timeline-trade-footer">

          <div class="timeline-trade-date">

            <span>
              Data e hora da troca
            </span>

            <strong>
              ${this.escapeHtml(
                this.formatarData(
                  troca.created_at
                )
              )}
            </strong>

          </div>


          <div class="timeline-trade-id">

            <span>
              ID da troca
            </span>

            <strong>
              ${this.escapeHtml(
                String(
                  troca.id
                )
              )}
            </strong>

          </div>

        </div>

      </div>

    `;

  },


  formatarStatusTroca(status) {

    const valor =
      String(
        status || ''
      )
        .trim()
        .toLowerCase();


    const mapa = {

      pendente: {
        classe: 'status-warning',
        texto: 'Pendente'
      },

      concluida: {
        classe: 'status-success',
        texto: 'Concluída'
      },

      concluída: {
        classe: 'status-success',
        texto: 'Concluída'
      },

      cancelada: {
        classe: 'status-danger',
        texto: 'Cancelada'
      },

      recusada: {
        classe: 'status-danger',
        texto: 'Recusada'
      }

    };


    return mapa[valor] || {

      classe: 'status-info',

      texto:
        status ||
        'Sem status'

    };

  },


  abrirModal() {

    this.elementos.modalHistorico
      ?.classList.remove(
        'hidden'
      );


    document.body.classList.add(
      'modal-open'
    );

  },


  fecharHistorico() {

    this.elementos.modalHistorico
      ?.classList.add(
        'hidden'
      );


    document.body.classList.remove(
      'modal-open'
    );

  },


  formatarCompetencia(
    competencia
  ) {

    if (!competencia) {

      return '—';

    }


    const valor =
      String(
        competencia
      );


    const match =
      valor.match(
        /^(\d{4})-(\d{2})/
      );


    if (!match) {

      return valor;

    }


    return `${match[2]}/${match[1]}`;

  },


  formatarData(
    data
  ) {

    if (!data) {

      return '—';

    }


    const dataObj =
      new Date(data);


    if (
      Number.isNaN(
        dataObj.getTime()
      )
    ) {

      return '—';

    }


    return new Intl.DateTimeFormat(
      'pt-BR',
      {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    ).format(
      dataObj
    );

  },


  formatarMoeda(
    valor
  ) {

    const numero =
      Number(
        valor || 0
      );


    return new Intl.NumberFormat(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL'
      }
    ).format(
      numero
    );

  },


  formatarNumero(
    valor
  ) {

    return new Intl.NumberFormat(
      'pt-BR'
    ).format(
      Number(
        valor || 0
      )
    );

  },


  normalizarTexto(
    valor
  ) {

    return String(
      valor ?? ''
    )
      .normalize(
        'NFD'
      )
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .trim();

  },


  escapeHtml(
    valor
  ) {

    return String(
      valor ?? ''
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

  },


  escapeAttribute(
    valor
  ) {

    return this.escapeHtml(
      valor
    );

  }

};


window.StockVisionPesquisa =
  StockVisionPesquisa;