'use strict';

const StockVisionDashboard = {

  async init() {
    await this.carregar();
  },

  async carregar() {

    const competencia =
      await StockVisionApp.updateCompetenciaGlobal();

    if (!competencia) {
      this.mostrarSemCompetencia();
      return;
    }

    const competenciaFormatada =
      StockVisionApp.formatCompetencia(
        competencia.competencia
      );

    const competenciaEl =
      document.getElementById(
        'dashboardCompetencia'
      );

    const competenciaGrandeEl =
      document.getElementById(
        'dashboardCompetenciaGrande'
      );

    const statusEl =
      document.getElementById(
        'dashboardStatusCompetencia'
      );

    const alertaEl =
      document.getElementById(
        'dashboardAlerta'
      );

    if (competenciaEl) {
      competenciaEl.textContent =
        competenciaFormatada;
    }

    if (competenciaGrandeEl) {
      competenciaGrandeEl.textContent =
        competenciaFormatada;
    }

    if (statusEl) {
      statusEl.textContent =
        competencia.status === 'aberta'
          ? 'Aberta'
          : competencia.status;
    }

    if (alertaEl) {
      alertaEl.classList.add('hidden');
    }

    try {

      /*
       * IMPORTANTE:
       *
       * Buscamos TODOS os registros da competência.
       *
       * Não fazemos LIMIT aqui porque precisamos conhecer
       * todos os lançamentos para descobrir qual é o último
       * lançamento de cada produto.
       */
      const {
        data,
        error
      } = await window.supabaseClient
        .from('divergencias')
        .select(`
          *,
          produtos (
            codigo,
            descricao,
            secao
          )
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

      if (error) {
        throw error;
      }

      const registros =
        data || [];

      /*
       * Mantém todos os registros carregados,
       * mas cria uma visão atual da competência.
       *
       * Para cada produto:
       * somente o lançamento mais recente permanece.
       */
      const registrosAtuais =
        this.obterRegistrosAtuais(
          registros
        );

      /*
       * Os indicadores usam SOMENTE os registros atuais.
       */
      this.renderIndicadores(
        registrosAtuais
      );

      /*
       * A tabela também usa somente os registros atuais.
       */
      this.renderTabela(
        registrosAtuais
      );

    } catch (error) {

      console.error(
        'StockVision Dashboard:',
        error
      );

      this.renderErro();

      StockVisionApp.toast(
        'Erro ao carregar o dashboard.',
        'error'
      );

    }
  },

  /*
   * =========================================================
   * REGISTROS ATUAIS DA COMPETÊNCIA
   * =========================================================
   *
   * Regra:
   *
   * Produto A:
   *   01/09 → -R$ 100
   *   05/09 → -R$ 80
   *
   * Dashboard:
   *   -R$ 80
   *
   * Produto B:
   *   02/09 → +R$ 50
   *
   * Dashboard:
   *   +R$ 50
   *
   * Resultado:
   *   -R$ 30
   *
   * O histórico continua no banco.
   * Aqui apenas criamos uma visão atual.
   */
  obterRegistrosAtuais(registros) {

    if (!Array.isArray(registros)) {
      return [];
    }

    const mapa =
      new Map();

    /*
     * A consulta já vem ordenada por created_at DESC.
     *
     * Portanto, o primeiro registro encontrado para
     * cada produto é o lançamento mais recente.
     */
    registros.forEach(registro => {

      const chave =
        this.obterChaveProduto(
          registro
        );

      /*
       * Se já encontramos esse produto,
       * ignoramos os lançamentos antigos.
       */
      if (mapa.has(chave)) {
        return;
      }

      mapa.set(
        chave,
        registro
      );

    });

    /*
     * O Map preserva a ordem em que os registros
     * foram inseridos.
     *
     * Como recebemos do mais recente para o mais antigo,
     * o resultado continua ordenado do mais recente
     * para o mais antigo.
     */
    return Array.from(
      mapa.values()
    );
  },

  /*
   * Cria uma chave estável para identificar o produto.
   *
   * Normalmente será produto_id.
   *
   * O fallback existe para evitar que registros antigos
   * sem produto_id sejam todos tratados como o mesmo produto.
   */
  obterChaveProduto(registro) {

    if (
      registro &&
      registro.produto_id !== null &&
      registro.produto_id !== undefined
    ) {
      return `produto:${registro.produto_id}`;
    }

    /*
     * Fallback para registros antigos.
     */
    const codigo =
      registro &&
      registro.produtos &&
      registro.produtos.codigo
        ? String(
            registro.produtos.codigo
          ).trim()
        : '';

    if (codigo) {
      return `codigo:${codigo}`;
    }

    /*
     * Se não houver nenhuma identificação,
     * usamos o ID da própria divergência.
     *
     * Assim não agrupamos registros diferentes
     * indevidamente.
     */
    return `registro:${registro?.id || Math.random()}`;
  },

  mostrarSemCompetencia() {

    const alerta =
      document.getElementById(
        'dashboardAlerta'
      );

    if (alerta) {
      alerta.classList.remove('hidden');
    }

    const competencia =
      document.getElementById(
        'dashboardCompetencia'
      );

    const competenciaGrande =
      document.getElementById(
        'dashboardCompetenciaGrande'
      );

    const status =
      document.getElementById(
        'dashboardStatusCompetencia'
      );

    if (competencia) {
      competencia.textContent = '—';
    }

    if (competenciaGrande) {
      competenciaGrande.textContent = '—';
    }

    if (status) {
      status.textContent =
        'Nenhuma aberta';

      status.className =
        'status-pill status-warning';
    }

    [
      'dashboardTotal',
      'dashboardResumoRegistros'
    ].forEach(id => {

      const element =
        document.getElementById(id);

      if (element) {
        element.textContent = '0';
      }

    });

    [
      'dashboardFaltas',
      'dashboardSobras',
      'dashboardSaldo',
      'dashboardResumoFaltas',
      'dashboardResumoSobras',
      'dashboardResumoSaldo'
    ].forEach(id => {

      const element =
        document.getElementById(id);

      if (element) {
        element.textContent =
          'R$ 0,00';
      }

    });

    const tabela =
      document.getElementById(
        'dashboardTabela'
      );

    if (tabela) {

      tabela.innerHTML = `
        <tr>
          <td colspan="5">

            <div class="dashboard-empty">

              <strong>
                Nenhuma competência aberta.
              </strong>

              <span>
                Abra uma competência para visualizar os registros.
              </span>

            </div>

          </td>
        </tr>
      `;

    }
  },

  renderIndicadores(registros) {

    /*
     * ATENÇÃO:
     *
     * "registros" aqui já contém somente
     * o último lançamento de cada produto.
     *
     * Portanto não devemos buscar novamente
     * os registros antigos.
     */

    const total =
      registros.length;

    const faltas =
      registros
        .filter(item =>
          Number(
            item.divergencia_valor || 0
          ) < 0
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(
              item.divergencia_valor || 0
            ),
          0
        );

    const sobras =
      registros
        .filter(item =>
          Number(
            item.divergencia_valor || 0
          ) > 0
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(
              item.divergencia_valor || 0
            ),
          0
        );

    const saldo =
      faltas + sobras;

    this.setText(
      'dashboardTotal',
      total
    );

    this.setText(
      'dashboardFaltas',
      StockVisionApp.formatMoney(
        faltas
      )
    );

    this.setText(
      'dashboardSobras',
      StockVisionApp.formatMoney(
        sobras
      )
    );

    this.setText(
      'dashboardSaldo',
      StockVisionApp.formatMoney(
        saldo
      )
    );

    this.setText(
      'dashboardResumoRegistros',
      total
    );

    this.setText(
      'dashboardResumoFaltas',
      StockVisionApp.formatMoney(
        faltas
      )
    );

    this.setText(
      'dashboardResumoSobras',
      StockVisionApp.formatMoney(
        sobras
      )
    );

    this.setText(
      'dashboardResumoSaldo',
      StockVisionApp.formatMoney(
        saldo
      )
    );

    this.aplicarCorSaldo(
      'dashboardSaldo',
      saldo
    );

    this.aplicarCorSaldo(
      'dashboardResumoSaldo',
      saldo
    );
  },

  renderTabela(registros) {

    const tabela =
      document.getElementById(
        'dashboardTabela'
      );

    if (!tabela) {
      return;
    }

    /*
     * A tabela mostra no máximo 10 registros,
     * mas agora são 10 registros ATUAIS.
     *
     * Ou seja:
     *
     * Produto A:
     *   antigo → não aparece
     *   último → aparece
     *
     * Produto B:
     *   último → aparece
     */
    const recentes =
      registros.slice(0, 10);

    if (!recentes.length) {

      tabela.innerHTML = `
        <tr>
          <td colspan="5">

            <div class="dashboard-empty">

              <strong>
                Nenhuma divergência nesta competência.
              </strong>

              <span>
                Os novos registros aparecerão aqui.
              </span>

            </div>

          </td>
        </tr>
      `;

      return;
    }

    tabela.innerHTML =
      recentes
        .map(item => {

          const valor =
            Number(
              item.divergencia_valor || 0
            );

          const quantidade =
            Number(
              item.divergencia_quantidade || 0
            );

          const produto =
            item.produtos || {};

          const quantidadeClasse =
            quantidade < 0
              ? 'text-danger'
              : quantidade > 0
                ? 'text-success'
                : '';

          const valorClasse =
            valor < 0
              ? 'text-danger'
              : valor > 0
                ? 'text-success'
                : '';

          const quantidadeFormatada =
            quantidade > 0
              ? `+${quantidade}`
              : quantidade;

          const status =
            item.status ||
            'pendente';

          return `
            <tr>

              <td>

                <div class="dashboard-product">

                  <strong>
                    ${StockVisionApp.escapeHtml(
                      produto.descricao ||
                      'Produto não informado'
                    )}
                  </strong>

                  <span>
                    ${StockVisionApp.escapeHtml(
                      produto.codigo ||
                      'Sem código'
                    )}
                  </span>

                </div>

              </td>

              <td>

                <span class="dashboard-section">

                  ${StockVisionApp.escapeHtml(
                    produto.secao || '—'
                  )}

                </span>

              </td>

              <td class="${quantidadeClasse}">

                ${quantidadeFormatada}

              </td>

              <td class="${valorClasse}">

                ${StockVisionApp.formatMoney(
                  valor
                )}

              </td>

              <td>

                <span class="status-pill status-warning">

                  ${StockVisionApp.escapeHtml(
                    status
                  )}

                </span>

              </td>

            </tr>
          `;

        })
        .join('');
  },

  renderErro() {

    const tabela =
      document.getElementById(
        'dashboardTabela'
      );

    if (!tabela) {
      return;
    }

    tabela.innerHTML = `
      <tr>
        <td colspan="5">

          <div class="dashboard-error">

            <strong>
              Não foi possível carregar as divergências.
            </strong>

            <span>
              Tente atualizar a página.
            </span>

          </div>

        </td>
      </tr>
    `;
  },

  setText(id, value) {

    const element =
      document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  },

  aplicarCorSaldo(id, valor) {

    const element =
      document.getElementById(id);

    if (!element) {
      return;
    }

    element.classList.remove(
      'text-danger',
      'text-success'
    );

    if (valor < 0) {
      element.classList.add(
        'text-danger'
      );
    }

    if (valor > 0) {
      element.classList.add(
        'text-success'
      );
    }
  }

};

window.StockVisionDashboard =
  StockVisionDashboard;