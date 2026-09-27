
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

      const registros = data || [];

      this.renderIndicadores(registros);
      this.renderTabela(registros);

    } catch (error) {

      console.error(error);

      this.renderErro();

      StockVisionApp.toast(
        'Erro ao carregar o dashboard.',
        'error'
      );

    }
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
      status.textContent = 'Nenhuma aberta';
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
        element.textContent = 'R$ 0,00';
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
      StockVisionApp.formatMoney(faltas)
    );

    this.setText(
      'dashboardSobras',
      StockVisionApp.formatMoney(sobras)
    );

    this.setText(
      'dashboardSaldo',
      StockVisionApp.formatMoney(saldo)
    );

    this.setText(
      'dashboardResumoRegistros',
      total
    );

    this.setText(
      'dashboardResumoFaltas',
      StockVisionApp.formatMoney(faltas)
    );

    this.setText(
      'dashboardResumoSobras',
      StockVisionApp.formatMoney(sobras)
    );

    this.setText(
      'dashboardResumoSaldo',
      StockVisionApp.formatMoney(saldo)
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
      recentes.map(item => {

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
                    produto.descricao || 'Produto não informado'
                  )}
                </strong>

                <span>
                  ${StockVisionApp.escapeHtml(
                    produto.codigo || 'Sem código'
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

      }).join('');
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

