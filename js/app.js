'use strict';


const StockVisionApp = {

  currentPage: 'inicio',

  pages: {

    inicio: {
      title: 'Dashboard',
      file: './pages/inicio.html',
      script: './js/inicio.js',
      style: './css/inicio.css'
    },

    'nova-divergencia': {
      title: 'Nova Divergência',
      file: './pages/nova-divergencia.html',
      script: './js/divergencias.js',
      style: './css/divergencias.css'
    },

    pesquisa: {
      title: 'Pesquisa',
      file: './pages/pesquisa.html',
      script: './js/pesquisa.js',
      style: './css/pesquisa.css'
    },

    produtos: {
      title: 'Produtos',
      file: './pages/produtos.html',
      script: './js/produtos.js',
      style: './css/produtos.css'
    },

    trocas: {
      title: 'Trocas',
      file: './pages/trocas.html',
      script: './js/trocas.js',
      style: './css/trocas.css'
    },

    dashboard: {
      title: 'Dashboard',
      file: './pages/dashboard.html',
      script: './js/dashboard.js',
      style: './css/dashboard.css'
    },

    competencias: {
      title: 'Competências',
      file: './pages/competencias.html',
      script: './js/competencias.js',
      style: './css/competencias.css'
    },
    tratamento: {
      title: 'Tratamento',
      file: './pages/tratamento.html',
      script: './js/tratamento.js',
      style: './css/tratamento.css'
    },
    'backup-dados': {
        title: 'Backup',
        file: './pages/backup.html',
        script: './js/backup.js',
        style: './css/backup.css'
    },

  },


  loadedScripts: new Set(),

  confirmacaoResolver: null,

  navigationId: 0,


  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  async init() {

    this.bindNavigation();

    this.bindSidebar();

    this.bindGlobalModal();

    await this.updateCompetenciaGlobal();

    await this.navigate(
      'inicio'
    );

  },


  /* =========================================================
     NAVEGAÇÃO
     ========================================================= */

  bindNavigation() {

    document.addEventListener(
      'click',
      event => {

        const button =
          event.target.closest(
            '[data-page]'
          );

        if (!button) {
          return;
        }

        event.preventDefault();

        const page =
          button.dataset.page;

        if (
          this.pages[page]
        ) {

          this.navigate(
            page
          );

        }

      }
    );

  },


  async navigate(
    page
  ) {

    const config =
      this.pages[page];


    if (!config) {
      return;
    }


    /*
     * Identificador único da navegação.
     *
     * Se o usuário clicar rapidamente
     * em duas páginas, somente a última
     * navegação continuará válida.
     */

    const navigationId =
      ++this.navigationId;


    this.currentPage =
      page;


    this.setActiveNavigation(
      page
    );


    const content =
      document.getElementById(
        'pageContent'
      );


    const loader =
      document.getElementById(
        'pageLoader'
      );


    if (!content) {
      return;
    }


    loader?.classList.remove(
      'hidden'
    );


    try {

      /*
       * =====================================================
       * 1. CARREGA O CSS
       * =====================================================
       */

      await this.loadPageStyle(
        config.style
      );


      /*
       * Se outra navegação começou
       * enquanto o CSS carregava,
       * abandona esta navegação.
       */

      if (
        navigationId !==
        this.navigationId
      ) {

        return;

      }


      /*
       * =====================================================
       * 2. CARREGA O HTML
       * =====================================================
       */

      const response =
        await fetch(
          config.file,
          {
            cache: 'no-store'
          }
        );


      if (!response.ok) {

        throw new Error(
          `Erro ao carregar ${config.file}`
        );

      }


      const html =
        await response.text();


      /*
       * Outra navegação pode ter
       * acontecido durante o fetch.
       */

      if (
        navigationId !==
        this.navigationId
      ) {

        return;

      }


      /*
       * =====================================================
       * 3. MONTA A PÁGINA
       * =====================================================
       *
       * Usa um template para transformar
       * o HTML em uma estrutura DOM antes
       * de colocar na página.
       */

      const template =
        document.createElement(
          'template'
        );


      template.innerHTML =
        html.trim();


      /*
       * Limpa somente o conteúdo
       * da página atual.
       */

      content.replaceChildren();


      /*
       * Adiciona os elementos da página.
       */

      content.appendChild(
        template.content.cloneNode(
          true
        )
      );


      /*
       * Guarda uma referência ao HTML
       * carregado desta página.
       */

      content.dataset.stockvisionPage =
        page;


      /*
       * =====================================================
       * 4. VERIFICAÇÃO ESPECÍFICA DA PÁGINA
       * =====================================================
       *
       * Para Trocas, confirma imediatamente
       * se a estrutura da modal chegou ao DOM.
       */

      if (
        page === 'trocas'
      ) {

        const modal =
          document.getElementById(
            'modalConfirmarTroca'
          );


        if (!modal) {

          console.error(
            '[APP] #modalConfirmarTroca não foi encontrado após carregar trocas.html.'
          );

        } else {

          console.log(
            '[APP] Modal de Trocas carregada:',
            modal
          );


          console.log(
            '[APP] Dialog encontrado:',
            modal.querySelector(
              '.troca-modal-dialog'
            )
          );


          console.log(
            '[APP] Conteúdo encontrado:',
            modal.querySelector(
              '#modalConfirmarTrocaConteudo'
            )
          );

        }

      }


      /*
       * =====================================================
       * 5. TÍTULO
       * =====================================================
       */

      const heading =
        document.getElementById(
          'pageHeading'
        );


      if (heading) {

        heading.textContent =
          config.title;

      }


      /*
       * =====================================================
       * 6. CARREGA O JAVASCRIPT
       * =====================================================
       */

      await this.loadPageScript(
        config.script
      );


      /*
       * =====================================================
       * 7. CONFERE NOVAMENTE A MODAL
       * =====================================================
       *
       * Esta segunda verificação é proposital.
       *
       * Se ela existir antes do trocas.js
       * e desaparecer depois do init(),
       * teremos a prova de que o problema
       * está dentro do trocas.js.
       */

      if (
        page === 'trocas'
      ) {

        const modalDepois =
          document.getElementById(
            'modalConfirmarTroca'
          );


        console.log(
          '[APP] Estrutura da modal após inicialização:',
          modalDepois?.outerHTML
        );


        if (
          modalDepois &&
          !modalDepois.querySelector(
            '.troca-modal-dialog'
          )
        ) {

          console.error(
            '[APP] ATENÇÃO: .troca-modal-dialog desapareceu durante o inicializador de Trocas.'
          );

        }

      }


      /*
       * =====================================================
       * 8. COMPETÊNCIA GLOBAL
       * =====================================================
       */

      await this.updateCompetenciaGlobal();


      /*
       * =====================================================
       * 9. EVENTO DE PÁGINA CARREGADA
       * =====================================================
       */

      window.dispatchEvent(
        new CustomEvent(
          'stockvision:page-loaded',
          {
            detail: {
              page
            }
          }
        )
      );


      /*
       * =====================================================
       * 10. FECHA MENU MOBILE
       * =====================================================
       */

      this.closeSidebarMobile();


      /*
       * =====================================================
       * 11. TOPO
       * =====================================================
       */

      window.scrollTo({
        top: 0,
        behavior: 'instant'
      });


    } catch (error) {

      console.error(
        'Erro ao navegar:',
        error
      );


      content.innerHTML = `

        <div class="empty-state page-error">

          <div class="empty-state-icon">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >

              <path
                d="M12 9v4"
              ></path>

              <path
                d="M12 17h.01"
              ></path>

              <path
                d="
                  M10.3 3.9
                  2.5 17.4
                  a2 2 0 0 0 1.7 3
                  h15.6
                  a2 2 0 0 0 1.7-3
                  L13.7 3.9
                  a2 2 0 0 0-3.4 0Z
                "
              ></path>

            </svg>

          </div>

          <strong>
            Não foi possível carregar a página.
          </strong>

          <span>
            ${this.escapeHtml(
              error.message
            )}
          </span>

          <button
            type="button"
            class="btn btn-primary"
            data-page="inicio"
          >
            Voltar ao início
          </button>

        </div>

      `;

    } finally {

      /*
       * Só esconde o loader se esta ainda
       * for a navegação atual.
       */

      if (
        navigationId ===
        this.navigationId
      ) {

        loader?.classList.add(
          'hidden'
        );

      }

    }

  },


  /* =========================================================
     CSS DA PÁGINA
     ========================================================= */

  async loadPageStyle(
    style
  ) {

    document
      .querySelectorAll(
        '[data-stockvision-page-style]'
      )
      .forEach(
        link => link.remove()
      );


    if (!style) {
      return;
    }


    await new Promise(
      (
        resolve,
        reject
      ) => {

        const link =
          document.createElement(
            'link'
          );


        link.rel =
          'stylesheet';


        link.href =
          `${style}?v=${Date.now()}`;


        link.dataset
          .stockvisionPageStyle =
          'true';


        link.onload =
          () => resolve();


        link.onerror =
          () => {

            reject(
              new Error(
                `Não foi possível carregar ${style}`
              )
            );

          };


        document.head.appendChild(
          link
        );

      }
    );

  },


  /* =========================================================
     JAVASCRIPT DA PÁGINA
     ========================================================= */

  async loadPageScript(
    src
  ) {

    if (!src) {
      return;
    }


    if (
      !this.loadedScripts.has(
        src
      )
    ) {

      await new Promise(
        (
          resolve,
          reject
        ) => {

          const script =
            document.createElement(
              'script'
            );


          script.src =
            `${src}?v=${Date.now()}`;


          script.dataset
            .stockvisionPageScript =
            'true';


          script.onload =
            () => {

              this.loadedScripts.add(
                src
              );

              resolve();

            };


          script.onerror =
            () => {

              reject(
                new Error(
                  `Não foi possível carregar ${src}`
                )
              );

            };


          document.body.appendChild(
            script
          );

        }
      );

    }


    await this.runPageInitializer(
      src
    );

  },


  /* =========================================================
     INICIALIZADORES
     ========================================================= */

  async runPageInitializer(
    src
  ) {

    const name =
      this.getPageInitializer(
        src
      );


    if (!name) {
      return;
    }


    const target =
      window[name];


    if (!target) {

      throw new Error(
        `Inicializador não encontrado: ${name}`
      );

    }


    if (
      typeof target ===
      'function'
    ) {

      await target();

      return;

    }


    if (
      typeof target.carregar ===
      'function'
    ) {

      await target.carregar();

      return;

    }


    if (
      typeof target.init ===
      'function'
    ) {

      await target.init();

    }

  },


  /* =========================================================
     MAPA DOS INICIALIZADORES
     ========================================================= */

  getPageInitializer(
    src
  ) {

    const map = {

      './js/inicio.js':
        'inicioStockVision',

      './js/divergencias.js':
        'StockVisionDivergencias',

      './js/pesquisa.js':
        'StockVisionPesquisa',

      './js/produtos.js':
        'StockVisionProdutos',

      './js/trocas.js':
        'StockVisionTrocas',

      './js/dashboard.js':
        'StockVisionDashboard',

      './js/competencias.js':
        'StockVisionCompetencias',

      './js/tratamento.js':
        'StockVisionTratamento',

      './js/backup.js':
        'StockVisionBackup',

    };


    return map[src] || null;

  },


  /* =========================================================
     NAVEGAÇÃO ATIVA
     ========================================================= */

  setActiveNavigation(
    page
  ) {

    document
      .querySelectorAll(
        '[data-page]'
      )
      .forEach(
        button => {

          const active =
            button.dataset.page ===
            page;


          button.classList.toggle(
            'active',
            active
          );


          if (active) {

            button.setAttribute(
              'aria-current',
              'page'
            );

          } else {

            button.removeAttribute(
              'aria-current'
            );

          }

        }
      );

  },


  /* =========================================================
     SIDEBAR
     ========================================================= */

  bindSidebar() {

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


    menuToggle?.addEventListener(
      'click',
      () =>
        this.openSidebarMobile()
    );


    sidebarClose?.addEventListener(
      'click',
      () =>
        this.closeSidebarMobile()
    );


    overlay?.addEventListener(
      'click',
      () =>
        this.closeSidebarMobile()
    );

  },


  openSidebarMobile() {

    document.body.classList.add(
      'sidebar-open'
    );

  },


  closeSidebarMobile() {

    document.body.classList.remove(
      'sidebar-open'
    );

  },


  /* =========================================================
     MODAL DE CONFIRMAÇÃO GLOBAL
     ========================================================= */

  bindGlobalModal() {

    const modal =
      document.getElementById(
        'modalConfirmacao'
      );


    const close =
      document.getElementById(
        'btnFecharConfirmacao'
      );


    const cancel =
      document.getElementById(
        'btnCancelarConfirmacao'
      );


    close?.addEventListener(
      'click',
      () =>
        this.closeConfirm(
          false
        )
    );


    cancel?.addEventListener(
      'click',
      () =>
        this.closeConfirm(
          false
        )
    );


    modal?.addEventListener(
      'click',
      event => {

        if (
          event.target === modal
        ) {

          this.closeConfirm(
            false
          );

        }

      }
    );


    document.addEventListener(
      'keydown',
      event => {

        if (
          event.key === 'Escape'
        ) {

          const aberto =
            !modal?.classList.contains(
              'hidden'
            );


          if (aberto) {

            this.closeConfirm(
              false
            );

          }

        }

      }
    );

  },


  confirm({
    title = 'Confirmar ação',
    message = 'Deseja continuar?',
    confirmText = 'Confirmar',
    danger = false
  } = {}) {

    return new Promise(
      resolve => {

        const modal =
          document.getElementById(
            'modalConfirmacao'
          );


        const titleElement =
          document.getElementById(
            'modalConfirmacaoTitulo'
          );


        const messageElement =
          document.getElementById(
            'modalConfirmacaoMensagem'
          );


        const confirmButton =
          document.getElementById(
            'btnConfirmarAcao'
          );


        if (
          !modal ||
          !titleElement ||
          !messageElement ||
          !confirmButton
        ) {

          resolve(false);

          return;

        }


        this.confirmacaoResolver =
          resolve;


        titleElement.textContent =
          title;


        messageElement.textContent =
          message;


        confirmButton.textContent =
          confirmText;


        confirmButton.classList.toggle(
          'btn-danger',
          danger
        );


        confirmButton.classList.toggle(
          'btn-primary',
          !danger
        );


        modal.classList.remove(
          'hidden'
        );


        confirmButton.onclick =
          () => {

            this.closeConfirm(
              true
            );

          };

      }
    );

  },


  closeConfirm(
    result = false
  ) {

    const modal =
      document.getElementById(
        'modalConfirmacao'
      );


    const confirmButton =
      document.getElementById(
        'btnConfirmarAcao'
      );


    modal?.classList.add(
      'hidden'
    );


    if (confirmButton) {

      confirmButton.onclick =
        null;

    }


    if (
      this.confirmacaoResolver
    ) {

      const resolve =
        this.confirmacaoResolver;


      this.confirmacaoResolver =
        null;


      resolve(
        result
      );

    }

  },


  /* =========================================================
     TOAST
     ========================================================= */

  toast(
    message,
    type = 'success'
  ) {

    const container =
      document.getElementById(
        'toastContainer'
      );


    if (!container) {
      return;
    }


    const toast =
      document.createElement(
        'div'
      );


    toast.className =
      `toast toast-${type}`;


    toast.innerHTML = `

      <span
        class="toast-dot"
      ></span>

      <span>
        ${this.escapeHtml(
          message
        )}
      </span>

    `;


    container.appendChild(
      toast
    );


    setTimeout(
      () => {

        toast.classList.add(
          'toast-hide'
        );


        setTimeout(
          () =>
            toast.remove(),
          250
        );

      },
      3500
    );

  },


  /* =========================================================
     COMPETÊNCIA GLOBAL
     ========================================================= */

  async updateCompetenciaGlobal() {

    if (
      !window.supabaseClient
    ) {

      return null;

    }


    try {

      const {
        data,
        error
      } =
        await window.supabaseClient
          .from('competencias')
          .select('*')
          .eq(
            'status',
            'aberta'
          )
          .order(
            'competencia',
            {
              ascending: false
            }
          )
          .limit(1)
          .maybeSingle();


      if (error) {
        throw error;
      }


      const nome =
        data
          ? this.formatCompetencia(
              data.competencia
            )
          : 'Nenhuma aberta';


      const status =
        data
          ? 'Aberta'
          : 'Sem competência';


      const sidebar =
        document.getElementById(
          'sidebarCompetencia'
        );


      const sidebarStatus =
        document.getElementById(
          'sidebarCompetenciaStatus'
        );


      const topbar =
        document.getElementById(
          'topbarCompetencia'
        );


      const topbarStatus =
        document.getElementById(
          'topbarCompetenciaStatus'
        );


      if (sidebar) {

        sidebar.textContent =
          nome;

      }


      if (sidebarStatus) {

        sidebarStatus.textContent =
          status;


        sidebarStatus.classList.toggle(
          'status-success',
          Boolean(data)
        );


        sidebarStatus.classList.toggle(
          'status-warning',
          !data
        );

      }


      if (topbar) {

        topbar.textContent =
          nome;

      }


      if (topbarStatus) {

        topbarStatus.textContent =
          status;


        topbarStatus.classList.toggle(
          'status-success',
          Boolean(data)
        );


        topbarStatus.classList.toggle(
          'status-warning',
          !data
        );

      }


      window.StockVisionCompetenciaAtual =
        data || null;


      /*
       * Mantém também o nome antigo,
       * caso algum módulo ainda utilize
       * window.competenciaAtual.
       */

      window.competenciaAtual =
        data || null;


      return data || null;


    } catch (error) {

      console.error(
        'Erro ao obter competência:',
        error
      );


      window.StockVisionCompetenciaAtual =
        null;


      window.competenciaAtual =
        null;


      return null;

    }

  },


  /* =========================================================
     FORMATAÇÃO DE COMPETÊNCIA
     ========================================================= */

  formatCompetencia(
    value
  ) {

    if (!value) {
      return '—';
    }


    const parts =
      String(value)
        .substring(
          0,
          7
        )
        .split('-');


    if (
      parts.length !== 2
    ) {

      return value;

    }


    return `${parts[1]}/${parts[0]}`;

  },


  /* =========================================================
     DINHEIRO
     ========================================================= */

  formatMoney(
    value
  ) {

    const number =
      Number(
        value || 0
      );


    return number.toLocaleString(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL'
      }
    );

  },


  /* =========================================================
     DATA
     ========================================================= */

  formatDate(
    value
  ) {

    if (!value) {
      return '—';
    }


    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return '—';

    }


    return date.toLocaleDateString(
      'pt-BR'
    );

  },


  /* =========================================================
     ESCAPE HTML
     ========================================================= */

  escapeHtml(
    value
  ) {

    return String(
      value ?? ''
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

};


/* ===========================================================
   DISPONIBILIZAÇÃO GLOBAL
   =========================================================== */

window.StockVisionApp =
  StockVisionApp;


/* ===========================================================
   INICIALIZAÇÃO
   =========================================================== */

document.addEventListener(
  'DOMContentLoaded',
  () => {

    StockVisionApp
      .init();

  }
);