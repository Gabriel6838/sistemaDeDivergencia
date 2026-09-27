'use strict';

const StockVisionTrocas = {

  competenciaAtual: null,

  divergencias: [],

  trocasExistentes: [],

  divergenciaOrigemTroca: null,

  divergenciaDestinoTroca: null,

  listeners: [],

  inicializado: false,

  async init() {

    this.destroy();

    this.listeners = [];
    this.inicializado = true;

    this.cacheElementos();

    this.bindEventos();

    await this.carregarCompetencia();

    if (!this.competenciaAtual) {
      this.renderSemCompetencia();
      return;
    }

    await this.carregarDivergencias();

    await this.carregarHistorico();

    this.renderEstadoInicial();

  },


  destroy() {

    this.listeners.forEach(({ element, event, handler }) => {

      element.removeEventListener(
        event,
        handler
      );

    });

    this.listeners = [];

    this.divergenciaOrigemTroca = null;

    this.divergenciaDestinoTroca = null;

    this.inicializado = false;

  },


  cacheElementos() {

    this.el = {

      competencia:
        document.getElementById(
          'trocasCompetenciaAtual'
        ),

      buscaOrigem:
        document.getElementById(
          'buscaDivergenciaOrigem'
        ),

      resultadosOrigem:
        document.getElementById(
          'resultadosDivergenciaOrigem'
        ),

      origemSelecionada:
        document.getElementById(
          'divergenciaOrigemSelecionada'
        ),

      avisoOrigem:
        document.getElementById(
          'avisoSelecionarOrigem'
        ),

      buscaDestinoContainer:
        document.getElementById(
          'buscaDestinoContainer'
        ),

      buscaDestino:
        document.getElementById(
          'buscaDivergenciaDestino'
        ),

      resultadosDestino:
        document.getElementById(
          'resultadosDivergenciaDestino'
        ),

      destinoSelecionada:
        document.getElementById(
          'divergenciaDestinoSelecionada'
        ),

      previewSection:
        document.getElementById(
          'trocaPreviewSection'
        ),

      previewOrigem:
        document.getElementById(
          'trocaPreviewOrigem'
        ),

      previewDestino:
        document.getElementById(
          'trocaPreviewDestino'
        ),

      observacaoSection:
        document.getElementById(
          'trocaObservacaoSection'
        ),

      observacao:
        document.getElementById(
          'trocaObservacao'
        ),

      observacaoContador:
        document.getElementById(
          'trocaObservacaoContador'
        ),

      actions:
        document.getElementById(
          'trocaActions'
        ),

      btnSalvar:
        document.getElementById(
          'btnSalvarTroca'
        ),

      btnLimpar:
        document.getElementById(
          'btnLimparTroca'
        ),

      btnAtualizar:
        document.getElementById(
          'btnAtualizarHistoricoTrocas'
        ),

      historico:
        document.getElementById(
          'trocasListaHistorico'
        ),

      modal:
        document.getElementById(
          'modalConfirmarTroca'
        ),

      modalConteudo:
        document.getElementById(
          'modalConfirmarTrocaConteudo'
        ),

      btnFecharModal:
        document.getElementById(
          'btnFecharModalTroca'
        ),

      btnCancelarModal:
        document.getElementById(
          'btnCancelarModalTroca'
        ),

      btnConfirmarModal:
        document.getElementById(
          'btnConfirmarModalTroca'
        )

    };

  },


  bind(element, event, handler) {

    if (!element) return;

    element.addEventListener(
      event,
      handler
    );

    this.listeners.push({
      element,
      event,
      handler
    });

  },


  bindEventos() {

    this.bind(
      this.el.buscaOrigem,
      'input',
      () => this.pesquisarOrigem()
    );

    this.bind(
      this.el.buscaDestino,
      'input',
      () => this.pesquisarDestino()
    );

    this.bind(
      this.el.resultadosOrigem,
      'click',
      event => {

        const item =
          event.target.closest(
            '[data-origem-id]'
          );

        if (!item) return;

        this.selecionarOrigem(
          item.dataset.origemId
        );

      }
    );

    this.bind(
      this.el.resultadosDestino,
      'click',
      event => {

        const item =
          event.target.closest(
            '[data-destino-id]'
          );

        if (!item) return;

        this.selecionarDestino(
          item.dataset.destinoId
        );

      }
    );

    this.bind(
      this.el.origemSelecionada,
      'click',
      event => {

        if (
          event.target.closest(
            '[data-remover-origem]'
          )
        ) {

          this.removerOrigem();

        }

      }
    );

    this.bind(
      this.el.destinoSelecionada,
      'click',
      event => {

        if (
          event.target.closest(
            '[data-remover-destino]'
          )
        ) {

          this.removerDestino();

        }

      }
    );

    this.bind(
      this.el.observacao,
      'input',
      () => this.atualizarContador()
    );

    this.bind(
      this.el.btnSalvar,
      'click',
      () => this.abrirModalConfirmacao()
    );

    this.bind(
      this.el.btnLimpar,
      'click',
      () => this.limparTroca()
    );

    this.bind(
      this.el.btnAtualizar,
      'click',
      () => this.atualizarHistorico()
    );

    this.bind(
      this.el.btnFecharModal,
      'click',
      () => this.fecharModal()
    );

    this.bind(
      this.el.btnCancelarModal,
      'click',
      () => this.fecharModal()
    );

    this.bind(
      this.el.modal,
      'click',
      event => {

        if (
          event.target.dataset.closeModal === 'true'
        ) {

          this.fecharModal();

        }

      }
    );

    this.bind(
      this.el.btnConfirmarModal,
      'click',
      () => this.salvarTroca()
    );

  },


  async carregarCompetencia() {

    try {

      let competencia = null;

      if (
        window.StockVisionApp &&
        typeof window.StockVisionApp.updateCompetenciaGlobal === 'function'
      ) {

        competencia =
          await window.StockVisionApp
            .updateCompetenciaGlobal();

      }

      if (!competencia) {

        const {
          data,
          error
        } = await window.supabaseClient
          .from('competencias')
          .select('*')
          .eq('status', 'aberta')
          .order(
            'competencia',
            {
              ascending: false
            }
          )
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        competencia = data;

      }

      this.competenciaAtual =
        competencia || null;

      window.competenciaAtual =
        this.competenciaAtual;

      window.StockVisionCompetenciaAtual =
        this.competenciaAtual;

      if (this.el.competencia) {

        this.el.competencia.textContent =
          this.competenciaAtual
            ? this.formatarCompetencia(
                this.competenciaAtual.competencia
              )
            : 'Nenhuma aberta';

      }

    } catch (error) {

      console.error(
        '[TROCAS] Erro ao carregar competência:',
        error
      );

      this.competenciaAtual = null;

      if (this.el.competencia) {

        this.el.competencia.textContent =
          'Erro ao carregar';

      }

    }

  },


  async carregarDivergencias() {

    if (!this.competenciaAtual) return;

    try {

      const {
        data,
        error
      } = await window.supabaseClient
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
          this.competenciaAtual.id
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        );

      if (error) throw error;

      this.divergencias =
        Array.isArray(data)
          ? data
          : [];

    } catch (error) {

      console.error(
        '[TROCAS] Erro ao carregar divergências:',
        error
      );

      this.divergencias = [];

      this.toast(
        'Não foi possível carregar as divergências.',
        'error'
      );

    }

  },


  async carregarHistorico() {

    if (!this.competenciaAtual) return;

    try {

      const {
        data,
        error
      } = await window.supabaseClient
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
        .eq(
          'competencia_id',
          this.competenciaAtual.id
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        );

      if (error) throw error;

      this.trocasExistentes =
        Array.isArray(data)
          ? data
          : [];

      this.renderHistorico();

    } catch (error) {

      console.error(
        '[TROCAS] Erro ao carregar histórico:',
        error
      );

      this.trocasExistentes = [];

      this.renderHistorico();

    }

  },


  renderEstadoInicial() {

    if (!this.el.resultadosOrigem) return;

    this.el.resultadosOrigem.innerHTML = `
      <div class="empty-state compact">
        <div class="empty-state-icon">⌕</div>
        <strong>Pesquise uma divergência</strong>
        <span>
          Digite o código, produto ou seção para começar.
        </span>
      </div>
    `;

    this.el.resultadosDestino.innerHTML = '';

    this.el.origemSelecionada.innerHTML = '';

    this.el.destinoSelecionada.innerHTML = '';

    this.el.avisoOrigem.classList.remove(
      'hidden'
    );

    this.el.buscaDestinoContainer.classList.add(
      'hidden'
    );

    this.el.previewSection.classList.add(
      'hidden'
    );

    this.el.observacaoSection.classList.add(
      'hidden'
    );

    this.el.actions.classList.add(
      'hidden'
    );

  },


  renderSemCompetencia() {

    this.el.resultadosOrigem.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">!</div>
        <strong>Nenhuma competência aberta</strong>
        <span>
          Abra uma competência antes de registrar uma troca.
        </span>
      </div>
    `;

    this.el.avisoOrigem.classList.add(
      'hidden'
    );

    this.el.buscaDestinoContainer.classList.add(
      'hidden'
    );

  },


  pesquisarOrigem() {

    const termo =
      this.normalizar(
        this.el.buscaOrigem.value
      );

    if (!termo) {

      this.renderEstadoInicial();

      return;

    }

    const resultados =
      this.filtrarDivergencias(
        termo
      );

    this.renderResultados(
      resultados,
      'origem'
    );

  },


  pesquisarDestino() {

    if (!this.divergenciaOrigemTroca) {

      return;

    }

    const termo =
      this.normalizar(
        this.el.buscaDestino.value
      );

    if (!termo) {

      this.el.resultadosDestino.innerHTML = '';

      return;

    }

    let resultados =
      this.filtrarDivergencias(
        termo
      );

    resultados =
      resultados.filter(
        divergencia =>
          this.podeRelacionar(
            divergencia
          )
      );

    this.renderResultados(
      resultados,
      'destino'
    );

  },


  filtrarDivergencias(termo) {

    return this.divergencias.filter(
      divergencia => {

        const produto =
          divergencia.produtos || {};

        const texto = [
          produto.codigo,
          produto.descricao,
          produto.secao,
          divergencia.id
        ]
          .map(valor =>
            this.normalizar(valor)
          )
          .join(' ');

        return texto.includes(termo);

      }
    );

  },


  podeRelacionar(divergencia) {

    if (!this.divergenciaOrigemTroca) {

      return false;

    }

    if (
      String(divergencia.id) ===
      String(
        this.divergenciaOrigemTroca.id
      )
    ) {

      return false;

    }

    if (
      String(divergencia.produto_id) ===
      String(
        this.divergenciaOrigemTroca.produto_id
      )
    ) {

      return false;

    }

    if (
      this.parExiste(
        this.divergenciaOrigemTroca.id,
        divergencia.id
      )
    ) {

      return false;

    }

    return true;

  },


  parExiste(idA, idB) {

    return this.trocasExistentes.some(
      troca => {

        const origem =
          String(
            troca.divergencia_origem_id
          );

        const destino =
          String(
            troca.divergencia_destino_id
          );

        const a = String(idA);
        const b = String(idB);

        return (
          (origem === a && destino === b) ||
          (origem === b && destino === a)
        );

      }
    );

  },


  renderResultados(
    resultados,
    tipo
  ) {

    const container =
      tipo === 'origem'
        ? this.el.resultadosOrigem
        : this.el.resultadosDestino;

    if (!resultados.length) {

      container.innerHTML = `
        <div class="empty-state compact">
          <div class="empty-state-icon">⌕</div>
          <strong>Nenhuma divergência encontrada</strong>
          <span>
            Tente pesquisar por outro código ou descrição.
          </span>
        </div>
      `;

      return;

    }

    container.innerHTML =
      resultados
        .slice(0, 30)
        .map(
          divergencia =>
            this.criarResultadoHTML(
              divergencia,
              tipo
            )
        )
        .join('');

  },


  criarResultadoHTML(
    divergencia,
    tipo
  ) {

    const produto =
      divergencia.produtos || {};

    const idAttr =
      tipo === 'origem'
        ? 'data-origem-id'
        : 'data-destino-id';

    const quantidade =
      Number(
        divergencia.divergencia_quantidade || 0
      );

    const valor =
      Number(
        divergencia.divergencia_valor || 0
      );

    const classe =
      quantidade >= 0
        ? 'positive'
        : 'negative';

    return `
      <button
        type="button"
        class="selection-item"
        ${idAttr}="${this.escapeHtml(
          divergencia.id
        )}"
      >

        <div class="selection-item-main">

          <strong class="selection-item-title">
            ${this.escapeHtml(
              produto.descricao ||
              'Produto sem descrição'
            )}
          </strong>

          <div class="selection-item-meta">

            <span>
              Código:
              <strong>
                ${this.escapeHtml(
                  produto.codigo || '-'
                )}
              </strong>
            </span>

            <span>
              ${this.escapeHtml(
                produto.secao || 'Sem seção'
              )}
            </span>

          </div>

        </div>

        <div class="selection-item-value">

          <strong class="selection-item-divergencia ${classe}">
            ${this.formatarQuantidade(
              quantidade
            )}
          </strong>

          <span>
            ${this.formatarMoeda(valor)}
          </span>

        </div>

      </button>
    `;

  },


  selecionarOrigem(id) {

    const divergencia =
      this.divergencias.find(
        item =>
          String(item.id) === String(id)
      );

    if (!divergencia) return;

    this.divergenciaOrigemTroca =
      divergencia;

    this.divergenciaDestinoTroca =
      null;

    this.el.buscaOrigem.value = '';

    this.el.resultadosOrigem.innerHTML =
      '';

    this.renderOrigemSelecionada();

    this.el.avisoOrigem.classList.add(
      'hidden'
    );

    this.el.buscaDestinoContainer.classList.remove(
      'hidden'
    );

    this.el.buscaDestino.value = '';

    this.el.resultadosDestino.innerHTML =
      '';

    this.el.destinoSelecionada.innerHTML =
      '';

    this.ocultarResumo();

    this.el.buscaDestino.focus();

  },


  selecionarDestino(id) {

    const divergencia =
      this.divergencias.find(
        item =>
          String(item.id) === String(id)
      );

    if (!divergencia) return;

    if (!this.podeRelacionar(divergencia)) {

      this.toast(
        'Essa divergência não pode ser relacionada.',
        'error'
      );

      return;

    }

    this.divergenciaDestinoTroca =
      divergencia;

    this.el.buscaDestino.value = '';

    this.el.resultadosDestino.innerHTML =
      '';

    this.renderDestinoSelecionada();

    this.renderResumo();

  },


  renderOrigemSelecionada() {

    if (!this.divergenciaOrigemTroca) {

      this.el.origemSelecionada.innerHTML =
        '';

      return;

    }

    this.el.origemSelecionada.innerHTML =
      this.criarCardSelecionado(
        this.divergenciaOrigemTroca,
        'origem'
      );

  },


  renderDestinoSelecionada() {

    if (!this.divergenciaDestinoTroca) {

      this.el.destinoSelecionada.innerHTML =
        '';

      return;

    }

    this.el.destinoSelecionada.innerHTML =
      this.criarCardSelecionado(
        this.divergenciaDestinoTroca,
        'destino'
      );

  },


  criarCardSelecionado(
    divergencia,
    tipo
  ) {

    const produto =
      divergencia.produtos || {};

    const quantidade =
      Number(
        divergencia.divergencia_quantidade || 0
      );

    const valor =
      Number(
        divergencia.divergencia_valor || 0
      );

    const classe =
      quantidade >= 0
        ? 'positive'
        : 'negative';

    const remover =
      tipo === 'origem'
        ? 'data-remover-origem'
        : 'data-remover-destino';

    const label =
      tipo === 'origem'
        ? 'Primeira divergência'
        : 'Divergência relacionada';

    return `
      <div class="troca-selected-card">

        <div class="troca-selected-header">

          <div>
            <span class="troca-selected-label">
              ${label}
            </span>

            <strong>
              Selecionada
            </strong>
          </div>

          <button
            type="button"
            class="troca-remove-selection"
            ${remover}
            aria-label="Remover seleção"
          >
            ×
          </button>

        </div>

        <div class="troca-selected-content">

          <div class="troca-divergencia-info">

            <strong class="troca-divergencia-produto">
              ${this.escapeHtml(
                produto.descricao ||
                'Produto sem descrição'
              )}
            </strong>

            <span class="troca-divergencia-codigo">
              Código:
              ${this.escapeHtml(
                produto.codigo || '-'
              )}
            </span>

            <span class="troca-divergencia-meta">
              ${this.escapeHtml(
                produto.secao || 'Sem seção'
              )}
            </span>

          </div>

          <div class="troca-divergencia-valor">

            <strong class="${classe}">
              ${this.formatarQuantidade(
                quantidade
              )}
            </strong>

            <span>
              ${this.formatarMoeda(valor)}
            </span>

          </div>

        </div>

      </div>
    `;

  },


  renderResumo() {

    if (
      !this.divergenciaOrigemTroca ||
      !this.divergenciaDestinoTroca
    ) {

      this.ocultarResumo();

      return;

    }

    this.el.previewOrigem.innerHTML =
      this.criarPreview(
        this.divergenciaOrigemTroca,
        '01'
      );

    this.el.previewDestino.innerHTML =
      this.criarPreview(
        this.divergenciaDestinoTroca,
        '02'
      );

    this.el.previewSection.classList.remove(
      'hidden'
    );

    this.el.observacaoSection.classList.remove(
      'hidden'
    );

    this.el.actions.classList.remove(
      'hidden'
    );

    this.atualizarContador();

  },


  criarPreview(
    divergencia,
    numero
  ) {

    const produto =
      divergencia.produtos || {};

    const quantidade =
      Number(
        divergencia.divergencia_quantidade || 0
      );

    const valor =
      Number(
        divergencia.divergencia_valor || 0
      );

    const classe =
      quantidade >= 0
        ? 'positive'
        : 'negative';

    return `
      <div class="troca-preview-number">
        ${numero}
      </div>

      <div class="troca-preview-content">

        <span class="troca-preview-label">
          Divergência
        </span>

        <strong>
          ${this.escapeHtml(
            produto.descricao ||
            'Produto sem descrição'
          )}
        </strong>

        <span>
          Código:
          ${this.escapeHtml(
            produto.codigo || '-'
          )}
        </span>

        <span>
          ${this.escapeHtml(
            produto.secao || 'Sem seção'
          )}
        </span>

        <div class="troca-preview-values">

          <strong class="${classe}">
            ${this.formatarQuantidade(
              quantidade
            )}
          </strong>

          <span>
            ${this.formatarMoeda(valor)}
          </span>

        </div>

      </div>
    `;

  },


  ocultarResumo() {

    this.el.previewSection.classList.add(
      'hidden'
    );

    this.el.observacaoSection.classList.add(
      'hidden'
    );

    this.el.actions.classList.add(
      'hidden'
    );

  },


  removerOrigem() {

    this.divergenciaOrigemTroca =
      null;

    this.divergenciaDestinoTroca =
      null;

    this.el.buscaOrigem.value = '';

    this.el.buscaDestino.value = '';

    this.el.resultadosOrigem.innerHTML =
      '';

    this.el.resultadosDestino.innerHTML =
      '';

    this.el.origemSelecionada.innerHTML =
      '';

    this.el.destinoSelecionada.innerHTML =
      '';

    this.el.avisoOrigem.classList.remove(
      'hidden'
    );

    this.el.buscaDestinoContainer.classList.add(
      'hidden'
    );

    this.ocultarResumo();

    this.renderEstadoInicial();

    this.el.buscaOrigem.focus();

  },


  removerDestino() {

    this.divergenciaDestinoTroca =
      null;

    this.el.buscaDestino.value = '';

    this.el.resultadosDestino.innerHTML =
      '';

    this.el.destinoSelecionada.innerHTML =
      '';

    this.ocultarResumo();

    this.el.buscaDestino.focus();

  },


  atualizarContador() {

    if (!this.el.observacao) return;

    const tamanho =
      this.el.observacao.value.length;

    this.el.observacaoContador.textContent =
      `${tamanho}/500`;

  },


  abrirModalConfirmacao() {

    if (
      !this.divergenciaOrigemTroca ||
      !this.divergenciaDestinoTroca
    ) {

      this.toast(
        'Selecione as duas divergências antes de continuar.',
        'error'
      );

      return;

    }

    if (
      !this.podeRelacionar(
        this.divergenciaDestinoTroca
      )
    ) {

      this.toast(
        'As divergências selecionadas não podem ser relacionadas.',
        'error'
      );

      return;

    }

    const origem =
      this.divergenciaOrigemTroca;

    const destino =
      this.divergenciaDestinoTroca;

    const produtoOrigem =
      origem.produtos || {};

    const produtoDestino =
      destino.produtos || {};

    this.el.modalConteudo.innerHTML = `
      <div class="confirmacao-troca">

        <p class="confirmacao-troca-texto">
          Você está prestes a registrar esta relação:
        </p>

        <div class="confirmacao-troca-item">

          <span>01</span>

          <div>
            <strong>
              ${this.escapeHtml(
                produtoOrigem.descricao || '-'
              )}
            </strong>

            <small>
              Código:
              ${this.escapeHtml(
                produtoOrigem.codigo || '-'
              )}
            </small>
          </div>

        </div>

        <div class="confirmacao-troca-separador">
          ⇄
        </div>

        <div class="confirmacao-troca-item">

          <span>02</span>

          <div>
            <strong>
              ${this.escapeHtml(
                produtoDestino.descricao || '-'
              )}
            </strong>

            <small>
              Código:
              ${this.escapeHtml(
                produtoDestino.codigo || '-'
              )}
            </small>
          </div>

        </div>

        <div class="confirmacao-troca-observacao">

          <span>Observação</span>

          <p>
            ${
              this.el.observacao.value.trim()
                ? this.escapeHtml(
                    this.el.observacao.value.trim()
                  )
                : 'Nenhuma observação informada.'
            }
          </p>

        </div>

      </div>
    `;

    this.el.modal.classList.remove(
      'hidden'
    );

    this.el.modal.setAttribute(
      'aria-hidden',
      'false'
    );

    document.body.classList.add(
      'troca-modal-open'
    );

  },


  fecharModal() {

    if (!this.el.modal) return;

    this.el.modal.classList.add(
      'hidden'
    );

    this.el.modal.setAttribute(
      'aria-hidden',
      'true'
    );

    document.body.classList.remove(
      'troca-modal-open'
    );

  },


  async salvarTroca() {

    if (
      !this.divergenciaOrigemTroca ||
      !this.divergenciaDestinoTroca
    ) {

      return;

    }

    if (!this.competenciaAtual) {

      this.fecharModal();

      this.toast(
        'Nenhuma competência aberta.',
        'error'
      );

      return;

    }

    if (
      this.parExiste(
        this.divergenciaOrigemTroca.id,
        this.divergenciaDestinoTroca.id
      )
    ) {

      this.fecharModal();

      this.toast(
        'Essa troca já foi registrada.',
        'error'
      );

      return;

    }

    const dados = {

      competencia_id:
        this.competenciaAtual.id,

      divergencia_origem_id:
        this.divergenciaOrigemTroca.id,

      divergencia_destino_id:
        this.divergenciaDestinoTroca.id,

      status:
        'pendente',

      observacao:
        this.el.observacao.value.trim() ||
        null

    };

    const botao =
      this.el.btnConfirmarModal;

    const textoOriginal =
      botao.textContent;

    try {

      botao.disabled = true;

      botao.textContent =
        'Salvando...';

      const {
        error
      } = await window.supabaseClient
        .from('trocas')
        .insert(dados);

      if (error) throw error;

      this.fecharModal();

      this.toast(
        'Troca registrada com sucesso.',
        'success'
      );

      await this.carregarHistorico();

      this.limparTroca();

    } catch (error) {

      console.error(
        '[TROCAS] Erro ao salvar:',
        error
      );

      this.fecharModal();

      this.toast(
        error?.message ||
        'Não foi possível registrar a troca.',
        'error'
      );

    } finally {

      botao.disabled = false;

      botao.textContent =
        textoOriginal;

    }

  },


  limparTroca() {

    this.divergenciaOrigemTroca =
      null;

    this.divergenciaDestinoTroca =
      null;

    this.el.buscaOrigem.value = '';

    this.el.buscaDestino.value = '';

    this.el.observacao.value = '';

    this.el.resultadosOrigem.innerHTML =
      '';

    this.el.resultadosDestino.innerHTML =
      '';

    this.el.origemSelecionada.innerHTML =
      '';

    this.el.destinoSelecionada.innerHTML =
      '';

    this.el.avisoOrigem.classList.remove(
      'hidden'
    );

    this.el.buscaDestinoContainer.classList.add(
      'hidden'
    );

    this.el.observacaoSection.classList.add(
      'hidden'
    );

    this.el.actions.classList.add(
      'hidden'
    );

    this.el.previewSection.classList.add(
      'hidden'
    );

    this.atualizarContador();

    this.renderEstadoInicial();

  },


  async atualizarHistorico() {

    const botao =
      this.el.btnAtualizar;

    const texto =
      botao.textContent;

    try {

      botao.disabled = true;

      botao.textContent =
        'Atualizando...';

      await this.carregarDivergencias();

      await this.carregarHistorico();

      this.toast(
        'Histórico atualizado.',
        'success'
      );

    } finally {

      botao.disabled = false;

      botao.textContent =
        texto;

    }

  },


  renderHistorico() {

    if (!this.el.historico) return;

    if (!this.trocasExistentes.length) {

      this.el.historico.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⇄</div>
          <strong>Nenhuma troca registrada</strong>
          <span>
            As trocas desta competência aparecerão aqui.
          </span>
        </div>
      `;

      return;

    }

    this.el.historico.innerHTML =
      this.trocasExistentes
        .map(
          troca =>
            this.criarHistoricoHTML(
              troca
            )
        )
        .join('');

  },


  criarHistoricoHTML(troca) {

    const origem =
      this.divergencias.find(
        divergencia =>
          String(divergencia.id) ===
          String(
            troca.divergencia_origem_id
          )
      );

    const destino =
      this.divergencias.find(
        divergencia =>
          String(divergencia.id) ===
          String(
            troca.divergencia_destino_id
          )
      );

    const produtoOrigem =
      origem?.produtos || {};

    const produtoDestino =
      destino?.produtos || {};

    return `
      <article class="troca-history-item">

        <div class="troca-history-product">

          <span class="troca-history-number">
            01
          </span>

          <div>
            <strong>
              ${this.escapeHtml(
                produtoOrigem.descricao ||
                'Produto não encontrado'
              )}
            </strong>

            <small>
              ${this.escapeHtml(
                produtoOrigem.codigo || '-'
              )}
            </small>
          </div>

        </div>

        <div class="troca-history-arrow">
          ⇄
        </div>

        <div class="troca-history-product">

          <span class="troca-history-number">
            02
          </span>

          <div>
            <strong>
              ${this.escapeHtml(
                produtoDestino.descricao ||
                'Produto não encontrado'
              )}
            </strong>

            <small>
              ${this.escapeHtml(
                produtoDestino.codigo || '-'
              )}
            </small>
          </div>

        </div>

        <div class="troca-history-meta">

          <span
            class="troca-history-status ${this.statusClasse(
              troca.status
            )}"
          >
            ${this.escapeHtml(
              this.formatarStatus(
                troca.status
              )
            )}
          </span>

          <span class="troca-history-date">
            ${this.formatarData(
              troca.created_at
            )}
          </span>

        </div>

        ${
          troca.observacao
            ? `
              <p class="troca-history-observation">
                ${this.escapeHtml(
                  troca.observacao
                )}
              </p>
            `
            : ''
        }

      </article>
    `;

  },


  statusClasse(status) {

    const valor =
      this.normalizar(status);

    if (valor === 'concluida') {
      return 'success';
    }

    if (valor === 'cancelada') {
      return 'danger';
    }

    return 'pending';

  },


  formatarStatus(status) {

    const mapa = {

      pendente:
        'Pendente',

      concluida:
        'Concluída',

      concluído:
        'Concluído',

      cancelada:
        'Cancelada',

      cancelado:
        'Cancelado'

    };

    return mapa[
      String(status || '')
        .toLowerCase()
    ] || status || 'Pendente';

  },


  formatarQuantidade(valor) {

    const numero =
      Number(valor || 0);

    const sinal =
      numero > 0
        ? '+'
        : '';

    return `${sinal}${numero} un.`;

  },


  formatarMoeda(valor) {

    return new Intl.NumberFormat(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL'
      }
    ).format(
      Number(valor || 0)
    );

  },


  formatarCompetencia(valor) {

    if (!valor) {
      return 'Nenhuma aberta';
    }

    const texto =
      String(valor);

    if (
      /^\d{4}-\d{2}$/.test(texto)
    ) {

      const [
        ano,
        mes
      ] =
        texto.split('-');

      return `${mes}/${ano}`;

    }

    return texto;

  },


  formatarData(valor) {

    if (!valor) return '-';

    const data =
      new Date(valor);

    if (
      Number.isNaN(
        data.getTime()
      )
    ) {

      return '-';

    }

    return new Intl.DateTimeFormat(
      'pt-BR',
      {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    ).format(data);

  },


  normalizar(valor) {

    return String(
      valor ?? ''
    )
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .toLowerCase()
      .trim();

  },


  escapeHtml(valor) {

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

  },


  toast(
    mensagem,
    tipo = 'success'
  ) {

    if (
      window.StockVisionApp &&
      typeof window.StockVisionApp.toast === 'function'
    ) {

      window.StockVisionApp.toast(
        mensagem,
        tipo
      );

      return;

    }

    console.log(
      `[TROCAS] ${mensagem}`
    );

  }

};


window.StockVisionTrocas =
  StockVisionTrocas;