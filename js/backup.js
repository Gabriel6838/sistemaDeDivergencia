/* =========================================================
   STOCKVISION — BACKUP
   Controle de Backup e Restauração
   ========================================================= */

(function () {
  'use strict';

  const VERSAO_BACKUP = '1.0';

  /*
   * Tabelas que fazem parte do backup.
   */
  const TABELAS_BACKUP = [
    'competencias',
    'produtos',
    'divergencias',
    'trocas'
  ];

  /*
   * ORDEM OBRIGATÓRIA DE EXCLUSÃO.
   *
   * trocas possui FK para divergencias.
   * divergencias possui relação com produtos/competencias.
   *
   * Portanto:
   *
   * trocas
   * ↓
   * divergencias
   * ↓
   * produtos
   * ↓
   * competencias
   */
  const TABELAS_EXCLUSAO = [
    'trocas',
    'divergencias',
    'produtos',
    'competencias'
  ];

  /*
   * Ordem de restauração.
   */
  const TABELAS_RESTAURACAO = [
    'competencias',
    'produtos',
    'divergencias',
    'trocas'
  ];

  let backupSelecionado = null;

  let restauracaoEmAndamento = false;

  let exclusaoEmAndamento = false;

  let botaoQueAbriuModalRestauracao = null;

  let botaoQueAbriuModalExclusao = null;


  /* =========================================================
     SUPABASE
     ========================================================= */

  function obterSupabase() {

    const candidatos = [
      window.supabaseClient,
      window.SupabaseClient,
      window.sb,
      window.db,
      window.supabase
    ];

    for (const candidato of candidatos) {

      if (
        candidato &&
        typeof candidato.from === 'function'
      ) {
        return candidato;
      }

      if (
        candidato &&
        candidato.client &&
        typeof candidato.client.from === 'function'
      ) {
        return candidato.client;
      }
    }

    throw new Error(
      'Cliente Supabase não encontrado.'
    );
  }


  /* =========================================================
     PÁGINA
     ========================================================= */

  function obterPagina() {

    return document.getElementById(
      'backupPage'
    );
  }


  function obterElementos() {

    const pagina =
      obterPagina();

    if (!pagina) {
      return {};
    }

    return {

      pagina,

      status:
        pagina.querySelector(
          '#backupStatus'
        ),

      statusTexto:
        pagina.querySelector(
          '#backupStatusTexto'
        ),

      btnCriar:
        pagina.querySelector(
          '#btnCriarBackup'
        ),

      btnSelecionar:
        pagina.querySelector(
          '#btnSelecionarBackup'
        ),

      inputArquivo:
        pagina.querySelector(
          '#inputArquivoBackup'
        ),

      dropzone:
        pagina.querySelector(
          '#backupDropzone'
        ),

      preview:
        pagina.querySelector(
          '#backupPreview'
        ),

      previewNome:
        pagina.querySelector(
          '#backupPreviewNome'
        ),

      previewVersao:
        pagina.querySelector(
          '#backupPreviewVersao'
        ),

      previewData:
        pagina.querySelector(
          '#backupPreviewData'
        ),

      previewCompetencias:
        pagina.querySelector(
          '#backupPreviewCompetencias'
        ),

      previewProdutos:
        pagina.querySelector(
          '#backupPreviewProdutos'
        ),

      previewDivergencias:
        pagina.querySelector(
          '#backupPreviewDivergencias'
        ),

      previewTrocas:
        pagina.querySelector(
          '#backupPreviewTrocas'
        ),

      previewAviso:
        pagina.querySelector(
          '#backupPreviewAviso'
        ),

      btnRestaurar:
        pagina.querySelector(
          '#btnRestaurarBackup'
        ),

      btnRemover:
        pagina.querySelector(
          '#btnRemoverBackupSelecionado'
        ),

      btnApagar:
        pagina.querySelector(
          '#btnApagarTudoBanco'
        ),

      ultimo:
        pagina.querySelector(
          '#backupUltimo'
        ),

      ultimosRegistros:
        pagina.querySelector(
          '#backupUltimosRegistros'
        ),

      ultimoArquivo:
        pagina.querySelector(
          '#backupUltimoArquivo'
        )
    };
  }


  /* =========================================================
     STATUS
     ========================================================= */

  function atualizarStatus(
    mensagem,
    tipo = 'normal'
  ) {

    const elementos =
      obterElementos();

    if (
      elementos.statusTexto
    ) {
      elementos.statusTexto.textContent =
        mensagem;
    }

    if (
      elementos.status
    ) {

      elementos.status.dataset.status =
        tipo;

      elementos.status.classList.remove(
        'sucesso',
        'erro',
        'aviso',
        'processando'
      );

      if (tipo) {

        elementos.status.classList.add(
          tipo
        );
      }
    }

    console.log(
      '[BACKUP]',
      mensagem
    );
  }


  /* =========================================================
     TOAST
     ========================================================= */

  function garantirToast() {

    let toast =
      document.getElementById(
        'backupToast'
      );

    if (toast) {
      return toast;
    }

    toast =
      document.createElement(
        'div'
      );

    toast.id =
      'backupToast';

    toast.className =
      'backup-toast';

    toast.innerHTML = `
      <div class="backup-toast-conteudo">

        <span
          id="backupToastMensagem"
          class="backup-toast-mensagem"
        ></span>

      </div>
    `;

    document.body.appendChild(
      toast
    );

    return toast;
  }


  function mostrarToast(
    mensagem,
    tipo = 'sucesso'
  ) {

    const toast =
      garantirToast();

    const texto =
      toast.querySelector(
        '#backupToastMensagem'
      );

    if (texto) {
      texto.textContent =
        mensagem;
    }

    toast.classList.remove(
      'sucesso',
      'erro',
      'aviso'
    );

    toast.classList.add(
      tipo
    );

    toast.classList.add(
      'ativo'
    );

    clearTimeout(
      mostrarToast.timer
    );

    mostrarToast.timer =
      setTimeout(
        function () {

          toast.classList.remove(
            'ativo'
          );

        },
        4500
      );
  }


  /* =========================================================
     MODAL RESTAURAÇÃO
     ========================================================= */

  function garantirModalRestauracao() {

    let modal =
      document.getElementById(
        'modalConfirmacaoBackup'
      );

    if (modal) {
      return modal;
    }

    modal =
      document.createElement(
        'div'
      );

    modal.id =
      'modalConfirmacaoBackup';

    modal.className =
      'backup-modal hidden';

    modal.hidden = true;

    modal.setAttribute(
      'role',
      'dialog'
    );

    modal.setAttribute(
      'aria-modal',
      'true'
    );

    modal.setAttribute(
      'aria-hidden',
      'true'
    );

    modal.setAttribute(
      'aria-labelledby',
      'backupRestauracaoTitulo'
    );

    modal.innerHTML = `

      <div
        class="backup-modal-overlay"
        data-fechar-modal="restauracao"
      ></div>

      <div
        class="backup-modal-dialog"
        role="document"
      >

        <div class="backup-modal-header">

          <div>

            <span class="backup-modal-kicker">
              RESTAURAÇÃO
            </span>

            <h2
              id="backupRestauracaoTitulo"
              class="backup-modal-titulo"
            >
              Restaurar backup
            </h2>

          </div>

          <button
            type="button"
            class="backup-modal-fechar"
            id="btnFecharRestauracaoBackup"
            aria-label="Fechar"
          >
            ×
          </button>

        </div>


        <div class="backup-modal-body">

          <div
            class="backup-confirmacao-icone"
            aria-hidden="true"
          >
            !
          </div>

          <p
            id="backupConfirmacaoMensagem"
            class="backup-modal-mensagem"
          >
            Os dados atuais serão substituídos
            pelos dados presentes neste backup.
          </p>

          <div
            class="backup-modal-alerta"
          >

            <strong>
              Atenção
            </strong>

            <span>
              Esta operação altera os dados
              armazenados no Supabase.
              Não feche a página durante a restauração.
            </span>

          </div>

        </div>


        <div class="backup-modal-footer">

          <button
            type="button"
            class="backup-button backup-button-secondary"
            id="btnCancelarRestauracao"
          >
            Cancelar
          </button>

          <button
            type="button"
            class="backup-button backup-button-primary"
            id="btnConfirmarRestauracao"
          >
            Restaurar backup
          </button>

        </div>

      </div>
    `;

    document.body.appendChild(
      modal
    );

    return modal;
  }


  /* =========================================================
     MODAL APAGAR TUDO
     ========================================================= */

  function garantirModalApagarTudo() {

    let modal =
      document.getElementById(
        'modalApagarTudoBanco'
      );

    if (modal) {
      return modal;
    }

    modal =
      document.createElement(
        'div'
      );

    modal.id =
      'modalApagarTudoBanco';

    modal.className =
      'backup-modal hidden';

    modal.hidden = true;

    modal.setAttribute(
      'role',
      'dialog'
    );

    modal.setAttribute(
      'aria-modal',
      'true'
    );

    modal.setAttribute(
      'aria-hidden',
      'true'
    );

    modal.setAttribute(
      'aria-labelledby',
      'tituloApagarTudoBanco'
    );

    modal.innerHTML = `

      <div
        class="backup-modal-overlay"
        data-fechar-modal="exclusao"
      ></div>

      <div
        class="backup-modal-dialog"
        role="document"
      >

        <div class="backup-modal-header">

          <div>

            <span class="backup-modal-kicker">
              ZONA DE PERIGO
            </span>

            <h2
              id="tituloApagarTudoBanco"
              class="backup-modal-titulo"
            >
              Apagar todos os dados
            </h2>

          </div>

          <button
            type="button"
            class="backup-modal-fechar"
            id="btnFecharApagarTudo"
            aria-label="Fechar"
          >
            ×
          </button>

        </div>


        <div class="backup-modal-body">

          <div
            class="backup-confirmacao-icone perigo"
            aria-hidden="true"
          >
            !
          </div>

          <p class="backup-modal-mensagem">
            Todos os registros do StockVision
            serão removidos do banco de dados.
          </p>

          <div
            class="backup-modal-alerta perigo"
          >

            <strong>
              Atenção
            </strong>

            <span>
              Esta operação não pode ser desfeita.
              Faça um backup antes de continuar.
            </span>

          </div>

        </div>


        <div class="backup-modal-footer">

          <button
            type="button"
            class="backup-button backup-button-secondary"
            id="btnCancelarApagarTudo"
          >
            Cancelar
          </button>

          <button
            type="button"
            class="backup-button backup-button-danger"
            id="btnConfirmarApagarTudo"
          >
            Apagar todos os dados
          </button>

        </div>

      </div>
    `;

    document.body.appendChild(
      modal
    );

    return modal;
  }


  /* =========================================================
     COMPONENTES
     ========================================================= */

  function garantirComponentes() {

    garantirToast();

    garantirModalRestauracao();

    garantirModalApagarTudo();
  }


  /* =========================================================
     ABRIR RESTAURAÇÃO
     ========================================================= */

  function abrirModalRestauracao() {

    if (
      restauracaoEmAndamento
    ) {
      return;
    }

    if (
      !backupSelecionado
    ) {

      mostrarToast(
        'Selecione um arquivo de backup primeiro.',
        'aviso'
      );

      return;
    }

    const modal =
      garantirModalRestauracao();

    botaoQueAbriuModalRestauracao =
      document.activeElement;

    const mensagem =
      modal.querySelector(
        '#backupConfirmacaoMensagem'
      );

    if (mensagem) {

      mensagem.textContent =
        `O backup "${backupSelecionado.nome}" será restaurado. ` +
        'Os dados atuais do banco serão substituídos.';
    }

    modal.hidden =
      false;

    modal.classList.remove(
      'hidden'
    );

    modal.setAttribute(
      'aria-hidden',
      'false'
    );

    document.body.classList.add(
      'backup-modal-aberto'
    );

    setTimeout(
      function () {

        const confirmar =
          modal.querySelector(
            '#btnConfirmarRestauracao'
          );

        if (confirmar) {
          confirmar.focus();
        }

      },
      0
    );
  }


  /* =========================================================
     FECHAR RESTAURAÇÃO
     ========================================================= */

  function fecharModalRestauracao() {

    const modal =
      document.getElementById(
        'modalConfirmacaoBackup'
      );

    if (!modal) {
      return;
    }

    /*
     * PRIMEIRO tira o foco.
     *
     * Só depois colocamos aria-hidden=true.
     *
     * Isso elimina o erro:
     *
     * Blocked aria-hidden on an element because
     * its descendant retained focus.
     */

    const focoAtual =
      document.activeElement;

    if (
      focoAtual &&
      modal.contains(
        focoAtual
      ) &&
      typeof focoAtual.blur ===
        'function'
    ) {

      focoAtual.blur();
    }

    modal.setAttribute(
      'aria-hidden',
      'true'
    );

    modal.classList.add(
      'hidden'
    );

    modal.hidden =
      true;

    document.body.classList.remove(
      'backup-modal-aberto'
    );

    const botaoRetorno =
      botaoQueAbriuModalRestauracao;

    botaoQueAbriuModalRestauracao =
      null;

    if (
      botaoRetorno &&
      document.contains(
        botaoRetorno
      ) &&
      typeof botaoRetorno.focus ===
        'function'
    ) {

      setTimeout(
        function () {
          botaoRetorno.focus();
        },
        0
      );
    }
  }


  /* =========================================================
     ABRIR APAGAR TUDO
     ========================================================= */

  function abrirModalApagarTudo() {

    if (
      exclusaoEmAndamento
    ) {
      return;
    }

    const modal =
      garantirModalApagarTudo();

    botaoQueAbriuModalExclusao =
      document.activeElement;

    modal.hidden =
      false;

    modal.classList.remove(
      'hidden'
    );

    modal.setAttribute(
      'aria-hidden',
      'false'
    );

    document.body.classList.add(
      'backup-modal-aberto'
    );

    setTimeout(
      function () {

        const confirmar =
          modal.querySelector(
            '#btnConfirmarApagarTudo'
          );

        if (confirmar) {
          confirmar.focus();
        }

      },
      0
    );
  }


  /* =========================================================
     FECHAR APAGAR TUDO
     ========================================================= */

  function fecharModalApagarTudo() {

    const modal =
      document.getElementById(
        'modalApagarTudoBanco'
      );

    if (!modal) {
      return;
    }

    /*
     * Primeiro remove o foco.
     */
    const focoAtual =
      document.activeElement;

    if (
      focoAtual &&
      modal.contains(
        focoAtual
      ) &&
      typeof focoAtual.blur ===
        'function'
    ) {

      focoAtual.blur();
    }

    /*
     * Depois oculta.
     */
    modal.setAttribute(
      'aria-hidden',
      'true'
    );

    modal.classList.add(
      'hidden'
    );

    modal.hidden =
      true;

    document.body.classList.remove(
      'backup-modal-aberto'
    );

    const botaoRetorno =
      botaoQueAbriuModalExclusao;

    botaoQueAbriuModalExclusao =
      null;

    if (
      botaoRetorno &&
      document.contains(
        botaoRetorno
      ) &&
      typeof botaoRetorno.focus ===
        'function'
    ) {

      setTimeout(
        function () {
          botaoRetorno.focus();
        },
        0
      );
    }
  }


  /* =========================================================
     EVENTOS DOS MODAIS
     ========================================================= */

  function configurarEventosModais() {

    const modalRestauracao =
      garantirModalRestauracao();

    const modalExclusao =
      garantirModalApagarTudo();


    const fecharRestauracao =
      modalRestauracao.querySelector(
        '#btnFecharRestauracaoBackup'
      );

    const cancelarRestauracao =
      modalRestauracao.querySelector(
        '#btnCancelarRestauracao'
      );

    const confirmarRestauracao =
      modalRestauracao.querySelector(
        '#btnConfirmarRestauracao'
      );


    const fecharExclusao =
      modalExclusao.querySelector(
        '#btnFecharApagarTudo'
      );

    const cancelarExclusao =
      modalExclusao.querySelector(
        '#btnCancelarApagarTudo'
      );

    const confirmarExclusao =
      modalExclusao.querySelector(
        '#btnConfirmarApagarTudo'
      );


    if (
      fecharRestauracao
    ) {

      fecharRestauracao.onclick =
        fecharModalRestauracao;
    }

    if (
      cancelarRestauracao
    ) {

      cancelarRestauracao.onclick =
        fecharModalRestauracao;
    }

    if (
      confirmarRestauracao
    ) {

      confirmarRestauracao.onclick =
        restaurarBackup;
    }


    if (
      fecharExclusao
    ) {

      fecharExclusao.onclick =
        fecharModalApagarTudo;
    }

    if (
      cancelarExclusao
    ) {

      cancelarExclusao.onclick =
        fecharModalApagarTudo;
    }

    if (
      confirmarExclusao
    ) {

      confirmarExclusao.onclick =
        apagarTudoBanco;
    }


    const overlayRestauracao =
      modalRestauracao.querySelector(
        '[data-fechar-modal="restauracao"]'
      );

    if (
      overlayRestauracao
    ) {

      overlayRestauracao.onclick =
        fecharModalRestauracao;
    }


    const overlayExclusao =
      modalExclusao.querySelector(
        '[data-fechar-modal="exclusao"]'
      );

    if (
      overlayExclusao
    ) {

      overlayExclusao.onclick =
        fecharModalApagarTudo;
    }
  }


  /* =========================================================
     CONSULTAR TABELA
     ========================================================= */

  async function consultarTabela(
    tabela
  ) {

    const supabase =
      obterSupabase();

    const resultado =
      await supabase
        .from(tabela)
        .select('*');

    if (
      resultado.error
    ) {

      throw new Error(
        `Erro ao consultar ${tabela}: ${resultado.error.message}`
      );
    }

    return (
      resultado.data || []
    );
  }


  /* =========================================================
     CRIAR BACKUP
     ========================================================= */

  async function criarBackup() {

    const elementos =
      obterElementos();

    if (
      elementos.btnCriar?.disabled
    ) {
      return;
    }

    try {

      if (
        elementos.btnCriar
      ) {
        elementos.btnCriar.disabled =
          true;
      }

      atualizarStatus(
        'Preparando backup...',
        'processando'
      );

      const tabelas = {};

      for (
        const tabela of
        TABELAS_BACKUP
      ) {

        atualizarStatus(
          `Lendo ${tabela}...`,
          'processando'
        );

        tabelas[tabela] =
          await consultarTabela(
            tabela
          );
      }


      const resumo = {

        competencias:
          tabelas.competencias.length,

        produtos:
          tabelas.produtos.length,

        divergencias:
          tabelas.divergencias.length,

        trocas:
          tabelas.trocas.length
      };


      const backup = {

        sistema:
          'StockVision',

        tipo:
          'backup-completo',

        versao:
          VERSAO_BACKUP,

        gerado_em:
          new Date().toISOString(),

        resumo,

        tabelas
      };


      const conteudo =
        JSON.stringify(
          backup,
          null,
          2
        );


      const blob =
        new Blob(
          [conteudo],
          {
            type:
              'application/json;charset=utf-8'
          }
        );


      const url =
        URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          'a'
        );

      const nomeArquivo =
        `stockvision-backup-${formatarDataArquivo(new Date())}.json`;

      link.href =
        url;

      link.download =
        nomeArquivo;

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      URL.revokeObjectURL(
        url
      );


      try {

        localStorage.setItem(
          'stockvisionUltimoBackup',
          JSON.stringify({

            data:
              new Date().toISOString(),

            arquivo:
              nomeArquivo,

            resumo

          })
        );

      } catch (erro) {

        console.warn(
          '[BACKUP] Não foi possível salvar informações do último backup.',
          erro
        );
      }


      atualizarInformacoesUltimoBackup();

      atualizarStatus(
        'Backup criado com sucesso.',
        'sucesso'
      );

      mostrarToast(
        'Backup criado com sucesso.',
        'sucesso'
      );

    } catch (erro) {

      console.error(
        '[BACKUP] Erro ao criar backup:',
        erro
      );

      atualizarStatus(
        erro.message ||
        'Não foi possível criar o backup.',
        'erro'
      );

      mostrarToast(
        erro.message ||
        'Não foi possível criar o backup.',
        'erro'
      );

    } finally {

      if (
        elementos.btnCriar
      ) {
        elementos.btnCriar.disabled =
          false;
      }
    }
  }


  /* =========================================================
     ÚLTIMO BACKUP
     ========================================================= */

  function atualizarInformacoesUltimoBackup() {

    const elementos =
      obterElementos();

    let ultimo =
      null;

    try {

      const armazenado =
        localStorage.getItem(
          'stockvisionUltimoBackup'
        );

      if (armazenado) {

        ultimo =
          JSON.parse(
            armazenado
          );
      }

    } catch (erro) {

      ultimo =
        null;
    }


    if (!ultimo) {

      if (
        elementos.ultimo
      ) {

        elementos.ultimo.textContent =
          'Nenhum backup registrado';
      }

      if (
        elementos.ultimoArquivo
      ) {

        elementos.ultimoArquivo.textContent =
          'Nenhum backup criado nesta sessão.';
      }

      if (
        elementos.ultimosRegistros
      ) {

        elementos.ultimosRegistros.textContent =
          '—';
      }

      return;
    }


    if (
      elementos.ultimo
    ) {

      elementos.ultimo.textContent =
        formatarDataHora(
          ultimo.data
        );
    }


    if (
      elementos.ultimoArquivo
    ) {

      elementos.ultimoArquivo.textContent =
        ultimo.arquivo ||
        'Backup realizado.';
    }


    if (
      elementos.ultimosRegistros &&
      ultimo.resumo
    ) {

      elementos.ultimosRegistros.textContent =
        `${ultimo.resumo.competencias || 0} competências • ` +
        `${ultimo.resumo.produtos || 0} produtos • ` +
        `${ultimo.resumo.divergencias || 0} divergências • ` +
        `${ultimo.resumo.trocas || 0} trocas`;
    }
  }


  /* =========================================================
     SELECIONAR ARQUIVO
     ========================================================= */

  function abrirSeletorArquivo() {

    const elementos =
      obterElementos();

    if (
      elementos.inputArquivo
    ) {

      elementos.inputArquivo.click();
    }
  }


  /* =========================================================
     PROCESSAR ARQUIVO
     ========================================================= */

  async function processarArquivo(
    arquivo
  ) {

    if (!arquivo) {
      return;
    }

    try {

      atualizarStatus(
        'Lendo arquivo de backup...',
        'processando'
      );


      const texto =
        await arquivo.text();


      if (
        !texto.trim()
      ) {

        throw new Error(
          'O arquivo está vazio.'
        );
      }


      let dados;

      try {

        dados =
          JSON.parse(
            texto
          );

      } catch (erro) {

        throw new Error(
          'O arquivo selecionado não contém um JSON válido.'
        );
      }


      validarBackup(
        dados
      );


      backupSelecionado = {

        nome:
          arquivo.name,

        tamanho:
          arquivo.size,

        tipo:
          arquivo.type,

        dados

      };


      mostrarPreview(
        backupSelecionado
      );


      atualizarStatus(
        'Arquivo de backup carregado.',
        'sucesso'
      );


      mostrarToast(
        'Arquivo de backup carregado.',
        'sucesso'
      );


      console.log(
        '[BACKUP] Arquivo de backup carregado.'
      );

    } catch (erro) {

      console.error(
        '[BACKUP] Erro ao ler arquivo:',
        erro
      );


      backupSelecionado =
        null;


      limparBackupSelecionado(
        false
      );


      atualizarStatus(
        erro.message ||
        'Não foi possível ler o backup.',
        'erro'
      );


      mostrarToast(
        erro.message ||
        'Não foi possível ler o backup.',
        'erro'
      );
    }
  }


  /* =========================================================
     VALIDAR BACKUP
     ========================================================= */

  function validarBackup(
    dados
  ) {

    if (
      !dados ||
      typeof dados !== 'object' ||
      Array.isArray(dados)
    ) {

      throw new Error(
        'O arquivo não contém um objeto JSON válido.'
      );
    }


    let tabelas =
      null;


    /*
     * FORMATO ATUAL
     *
     * {
     *   tabelas: {
     *     competencias: [],
     *     produtos: [],
     *     divergencias: [],
     *     trocas: []
     *   }
     * }
     */

    if (
      dados.tabelas &&
      typeof dados.tabelas === 'object' &&
      !Array.isArray(dados.tabelas)
    ) {

      tabelas =
        dados.tabelas;
    }


    /*
     * FORMATO DIRETO NA RAIZ
     *
     * {
     *   competencias: [],
     *   produtos: [],
     *   divergencias: [],
     *   trocas: []
     * }
     */

    if (!tabelas) {

      const possuiTabelaNaRaiz =
        TABELAS_BACKUP.some(
          function (tabela) {

            return Array.isArray(
              dados[tabela]
            );
          }
        );


      if (
        possuiTabelaNaRaiz
      ) {

        tabelas =
          dados;
      }
    }


    /*
     * FORMATO ANTIGO
     *
     * {
     *   dados: {
     *     competencias: [],
     *     produtos: [],
     *     divergencias: [],
     *     trocas: []
     *   }
     * }
     */

    if (
      !tabelas &&
      dados.dados &&
      typeof dados.dados === 'object' &&
      !Array.isArray(dados.dados)
    ) {

      const dadosInternos =
        dados.dados;


      const possuiTabelaInterna =
        TABELAS_BACKUP.some(
          function (tabela) {

            return Array.isArray(
              dadosInternos[tabela]
            );
          }
        );


      if (
        possuiTabelaInterna
      ) {

        tabelas =
          dadosInternos;
      }
    }


    /*
     * Nenhuma estrutura reconhecida.
     */

    if (!tabelas) {

      console.error(
        '[BACKUP] Estrutura recebida:',
        dados
      );

      console.error(
        '[BACKUP] Chaves encontradas:',
        Object.keys(dados)
      );


      throw new Error(
        'Não foi possível localizar as tabelas do backup. Verifique se o arquivo foi gerado pelo StockVision.'
      );
    }


    /*
     * Validação individual.
     */

    for (
      const tabela of
      TABELAS_BACKUP
    ) {

      if (
        tabelas[tabela] !== undefined &&
        !Array.isArray(
          tabelas[tabela]
        )
      ) {

        throw new Error(
          `A tabela "${tabela}" possui formato inválido.`
        );
      }
    }


    /*
     * Normalização.
     *
     * Depois disso, o sistema sempre trabalha
     * com dados.tabelas.
     */

    const tabelasNormalizadas =
      {};


    for (
      const tabela of
      TABELAS_BACKUP
    ) {

      tabelasNormalizadas[tabela] =
        Array.isArray(
          tabelas[tabela]
        )
          ? tabelas[tabela]
          : [];
    }


    dados.tabelas =
      tabelasNormalizadas;


    console.log(
      '[BACKUP] Backup validado com sucesso.'
    );


    console.log(
      '[BACKUP] Quantidades:',
      {

        competencias:
          dados.tabelas.competencias.length,

        produtos:
          dados.tabelas.produtos.length,

        divergencias:
          dados.tabelas.divergencias.length,

        trocas:
          dados.tabelas.trocas.length

      }
    );


    return true;
  }


  /* =========================================================
     PREVIEW
     ========================================================= */

  function mostrarPreview(
    backup
  ) {

    const elementos =
      obterElementos();

    if (!backup) {
      return;
    }


    const dados =
      backup.dados;


    const tabelas =
      dados.tabelas || {};


    if (
      elementos.preview
    ) {

      elementos.preview.hidden =
        false;

      elementos.preview.classList.add(
        'ativo'
      );
    }


    if (
      elementos.previewNome
    ) {

      elementos.previewNome.textContent =
        backup.nome ||
        'Arquivo de backup';
    }


    if (
      elementos.previewVersao
    ) {

      elementos.previewVersao.textContent =
        dados.versao ||
        VERSAO_BACKUP;
    }


    if (
      elementos.previewData
    ) {

      elementos.previewData.textContent =
        dados.gerado_em
          ? formatarDataHora(
              dados.gerado_em
            )
          : 'Não informada';
    }


    if (
      elementos.previewCompetencias
    ) {

      elementos.previewCompetencias.textContent =
        (
          tabelas.competencias ||
          []
        ).length;
    }


    if (
      elementos.previewProdutos
    ) {

      elementos.previewProdutos.textContent =
        (
          tabelas.produtos ||
          []
        ).length;
    }


    if (
      elementos.previewDivergencias
    ) {

      elementos.previewDivergencias.textContent =
        (
          tabelas.divergencias ||
          []
        ).length;
    }


    if (
      elementos.previewTrocas
    ) {

      elementos.previewTrocas.textContent =
        (
          tabelas.trocas ||
          []
        ).length;
    }


    if (
      elementos.previewAviso
    ) {

      elementos.previewAviso.textContent =
        'A restauração substituirá os dados atuais do banco.';
    }


    if (
      elementos.btnRestaurar
    ) {

      elementos.btnRestaurar.disabled =
        false;
    }


    if (
      elementos.btnRemover
    ) {

      elementos.btnRemover.disabled =
        false;
    }
  }


  /* =========================================================
     LIMPAR BACKUP
     ========================================================= */

  function limparBackupSelecionado(
    atualizarStatusAgora = true
  ) {

    backupSelecionado =
      null;


    const elementos =
      obterElementos();


    if (
      elementos.inputArquivo
    ) {

      elementos.inputArquivo.value =
        '';
    }


    if (
      elementos.preview
    ) {

      elementos.preview.hidden =
        true;

      elementos.preview.classList.remove(
        'ativo'
      );
    }


    if (
      elementos.btnRestaurar
    ) {

      elementos.btnRestaurar.disabled =
        true;
    }


    if (
      elementos.btnRemover
    ) {

      elementos.btnRemover.disabled =
        true;
    }


    if (
      atualizarStatusAgora
    ) {

      atualizarStatus(
        'Nenhum backup selecionado.',
        'normal'
      );
    }
  }


  /* =========================================================
     PREPARAR REGISTROS
     ========================================================= */

  function prepararRegistros(
    registros
  ) {

    if (
      !Array.isArray(
        registros
      )
    ) {

      return [];
    }


    return registros
      .filter(
        function (registro) {

          return (
            registro &&
            typeof registro ===
              'object' &&
            !Array.isArray(
              registro
            )
          );
        }
      )
      .map(
        function (registro) {

          const copia =
            {
              ...registro
            };


          Object.keys(
            copia
          ).forEach(
            function (chave) {

              if (
                copia[chave] ===
                undefined
              ) {

                delete copia[chave];
              }
            }
          );


          return copia;
        }
      );
  }


  /* =========================================================
     INSERIR EM LOTES
     ========================================================= */

  async function inserirEmLotes(
    tabela,
    registros,
    tamanhoLote = 100
  ) {

    const supabase =
      obterSupabase();


    if (
      !Array.isArray(
        registros
      ) ||
      registros.length === 0
    ) {

      return [];
    }


    const resultadoFinal =
      [];


    for (
      let inicio = 0;
      inicio < registros.length;
      inicio += tamanhoLote
    ) {

      const lote =
        registros.slice(
          inicio,
          inicio + tamanhoLote
        );


      atualizarStatus(
        `Restaurando ${tabela}: ${Math.min(
          inicio + lote.length,
          registros.length
        )}/${registros.length}...`,
        'processando'
      );


      const resultado =
        await supabase
          .from(tabela)
          .insert(lote)
          .select('*');


      if (
        resultado.error
      ) {

        throw new Error(
          `Erro ao restaurar ${tabela}: ${resultado.error.message}`
        );
      }


      if (
        Array.isArray(
          resultado.data
        )
      ) {

        resultadoFinal.push(
          ...resultado.data
        );
      }
    }


    return resultadoFinal;
  }


  /* =========================================================
     APAGAR UMA TABELA
     ========================================================= */

  async function apagarTabela(
    tabela
  ) {

    const supabase =
      obterSupabase();


    atualizarStatus(
      `Limpando ${tabela}...`,
      'processando'
    );


    const resultado =
      await supabase
        .from(tabela)
        .delete()
        .not(
          'id',
          'is',
          null
        )
        .select('id');


    if (
      resultado.error
    ) {

      throw new Error(
        `Erro ao apagar ${tabela}: ${resultado.error.message}`
      );
    }


    return (
      resultado.data || []
    ).length;
  }


  /* =========================================================
     APAGAR TUDO
     ========================================================= */

  async function apagarTudoBanco() {

    if (
      exclusaoEmAndamento
    ) {
      return;
    }


    exclusaoEmAndamento =
      true;


    const modal =
      document.getElementById(
        'modalApagarTudoBanco'
      );


    const botao =
      modal?.querySelector(
        '#btnConfirmarApagarTudo'
      );


    try {

      if (
        botao
      ) {

        botao.disabled =
          true;

        botao.textContent =
          'Apagando...';
      }


      atualizarStatus(
        'Iniciando exclusão dos dados...',
        'processando'
      );


      let total =
        0;


      for (
        const tabela of
        TABELAS_EXCLUSAO
      ) {

        total +=
          await apagarTabela(
            tabela
          );
      }


      fecharModalApagarTudo();


      limparBackupSelecionado(
        false
      );


      atualizarStatus(
        'Todos os dados foram apagados.',
        'sucesso'
      );


      mostrarToast(
        `${total} registro(s) apagado(s) com sucesso.`,
        'sucesso'
      );


    } catch (erro) {

      console.error(
        '[BACKUP] Erro ao apagar banco:',
        erro
      );


      atualizarStatus(
        erro.message ||
        'Não foi possível apagar os dados.',
        'erro'
      );


      mostrarToast(
        erro.message ||
        'Não foi possível apagar os dados.',
        'erro'
      );


    } finally {

      exclusaoEmAndamento =
        false;


      if (
        botao
      ) {

        botao.disabled =
          false;

        botao.textContent =
          'Apagar todos os dados';
      }
    }
  }


  /* =========================================================
     RESTAURAR BACKUP
     ========================================================= */

  async function restaurarBackup() {

    if (
      restauracaoEmAndamento
    ) {
      return;
    }


    if (
      !backupSelecionado
    ) {

      fecharModalRestauracao();

      mostrarToast(
        'Nenhum backup selecionado.',
        'aviso'
      );

      return;
    }


    restauracaoEmAndamento =
      true;


    const modal =
      document.getElementById(
        'modalConfirmacaoBackup'
      );


    const botao =
      modal?.querySelector(
        '#btnConfirmarRestauracao'
      );


    try {

      if (
        botao
      ) {

        botao.disabled =
          true;

        botao.textContent =
          'Restaurando...';
      }


      const dados =
        backupSelecionado.dados;


      validarBackup(
        dados
      );


      const tabelas =
        dados.tabelas;


      /*
       * Fecha o modal ANTES da operação.
       *
       * Assim o botão não permanece focado
       * enquanto aria-hidden=true é aplicado.
       */

      fecharModalRestauracao();


      atualizarStatus(
        'Iniciando restauração...',
        'processando'
      );


      /*
       * =====================================================
       * 1. LIMPAR BANCO
       * =====================================================
       */

      for (
        const tabela of
        TABELAS_EXCLUSAO
      ) {

        await apagarTabela(
          tabela
        );
      }


      /*
       * =====================================================
       * 2. RESTAURAR
       * =====================================================
       */

      for (
        const tabela of
        TABELAS_RESTAURACAO
      ) {

        const registros =
          prepararRegistros(
            tabelas[tabela]
          );


        await inserirEmLotes(
          tabela,
          registros
        );
      }


      /*
       * =====================================================
       * 3. SUCESSO
       * =====================================================
       */

      atualizarStatus(
        'Restauração concluída com sucesso.',
        'sucesso'
      );


      mostrarToast(
        'Backup restaurado com sucesso.',
        'sucesso'
      );


      console.log(
        '[BACKUP] Restauração concluída.',
        {

          competencias:
            tabelas.competencias.length,

          produtos:
            tabelas.produtos.length,

          divergencias:
            tabelas.divergencias.length,

          trocas:
            tabelas.trocas.length

        }
      );


      /*
       * Recarrega o StockVision para que os
       * demais módulos busquem os dados restaurados.
       */

      setTimeout(
        function () {

          window.location.reload();

        },
        1200
      );


    } catch (erro) {

      console.error(
        '[BACKUP] Erro durante restauração:',
        erro
      );


      atualizarStatus(
        erro.message ||
        'Não foi possível restaurar o backup.',
        'erro'
      );


      mostrarToast(
        erro.message ||
        'Não foi possível restaurar o backup.',
        'erro'
      );


      console.error(
        '[BACKUP] A restauração pode ter ficado parcial. Verifique o banco antes de realizar nova operação.'
      );


    } finally {

      restauracaoEmAndamento =
        false;


      if (
        botao
      ) {

        botao.disabled =
          false;

        botao.textContent =
          'Restaurar backup';
      }
    }
  }


  /* =========================================================
     DRAG & DROP
     ========================================================= */

  function configurarDropzone(
    dropzone
  ) {

    if (!dropzone) {
      return;
    }


    dropzone.addEventListener(
      'dragover',
      function (evento) {

        evento.preventDefault();

        dropzone.classList.add(
          'arrastando'
        );
      }
    );


    dropzone.addEventListener(
      'dragleave',
      function () {

        dropzone.classList.remove(
          'arrastando'
        );
      }
    );


    dropzone.addEventListener(
      'drop',
      function (evento) {

        evento.preventDefault();

        dropzone.classList.remove(
          'arrastando'
        );


        const arquivo =
          evento.dataTransfer?.files?.[0];


        if (!arquivo) {
          return;
        }


        const ehJson =
          arquivo.type ===
            'application/json' ||
          arquivo.name
            .toLowerCase()
            .endsWith(
              '.json'
            );


        if (!ehJson) {

          mostrarToast(
            'Selecione um arquivo JSON.',
            'aviso'
          );

          return;
        }


        processarArquivo(
          arquivo
        );
      }
    );
  }


  /* =========================================================
     EVENTOS
     ========================================================= */

  function configurarEventos() {

    const elementos =
      obterElementos();


    if (
      !elementos.pagina
    ) {

      console.warn(
        '[BACKUP] backupPage não encontrado.'
      );

      return;
    }


    /*
     * O HTML é inserido dinamicamente pelo app.js.
     *
     * A marcação pertence à própria página,
     * portanto pode ser configurada novamente
     * quando o módulo for carregado.
     */

    if (
      elementos.pagina.dataset.backupEventos ===
      'true'
    ) {

      return;
    }


    elementos.pagina.dataset.backupEventos =
      'true';


    /* Criar backup */

    if (
      elementos.btnCriar
    ) {

      elementos.btnCriar.addEventListener(
        'click',
        criarBackup
      );
    }


    /* Selecionar arquivo */

    if (
      elementos.btnSelecionar
    ) {

      elementos.btnSelecionar.addEventListener(
        'click',
        abrirSeletorArquivo
      );
    }


    /* Input */

    if (
      elementos.inputArquivo
    ) {

      elementos.inputArquivo.addEventListener(
        'change',
        function (evento) {

          const arquivo =
            evento.target.files?.[0];


          if (
            arquivo
          ) {

            processarArquivo(
              arquivo
            );
          }
        }
      );
    }


    /* Dropzone */

    configurarDropzone(
      elementos.dropzone
    );


    /* Restaurar */

    if (
      elementos.btnRestaurar
    ) {

      elementos.btnRestaurar.addEventListener(
        'click',
        abrirModalRestauracao
      );
    }


    /* Remover seleção */

    if (
      elementos.btnRemover
    ) {

      elementos.btnRemover.addEventListener(
        'click',
        function () {

          limparBackupSelecionado();

          mostrarToast(
            'Backup removido da seleção.',
            'sucesso'
          );
        }
      );
    }


    /* Apagar tudo */

    if (
      elementos.btnApagar
    ) {

      elementos.btnApagar.addEventListener(
        'click',
        abrirModalApagarTudo
      );
    }


    configurarEventosModais();


    console.log(
      '[BACKUP] Eventos configurados.'
    );
  }


  /* =========================================================
     ESC
     ========================================================= */

  function configurarEscape() {

    if (
      document.body.dataset.backupEscape ===
      'true'
    ) {

      return;
    }


    document.body.dataset.backupEscape =
      'true';


    document.addEventListener(
      'keydown',
      function (evento) {

        if (
          evento.key !==
          'Escape'
        ) {

          return;
        }


        const modalRestauracao =
          document.getElementById(
            'modalConfirmacaoBackup'
          );


        const modalExclusao =
          document.getElementById(
            'modalApagarTudoBanco'
          );


        if (
          modalRestauracao &&
          !modalRestauracao.hidden
        ) {

          fecharModalRestauracao();

          return;
        }


        if (
          modalExclusao &&
          !modalExclusao.hidden
        ) {

          fecharModalApagarTudo();
        }
      }
    );
  }


  /* =========================================================
     FORMATAÇÃO
     ========================================================= */

  function formatarDataHora(
    valor
  ) {

    if (!valor) {
      return 'Não informado';
    }


    const data =
      valor instanceof Date
        ? valor
        : new Date(
            valor
          );


    if (
      Number.isNaN(
        data.getTime()
      )
    ) {

      return 'Não informado';
    }


    return new Intl.DateTimeFormat(
      'pt-BR',
      {
        dateStyle:
          'short',

        timeStyle:
          'medium'
      }
    ).format(
      data
    );
  }


  function formatarDataArquivo(
    valor
  ) {

    const data =
      valor instanceof Date
        ? valor
        : new Date(
            valor
          );


    const ano =
      data.getFullYear();


    const mes =
      String(
        data.getMonth() + 1
      ).padStart(
        2,
        '0'
      );


    const dia =
      String(
        data.getDate()
      ).padStart(
        2,
        '0'
      );


    const hora =
      String(
        data.getHours()
      ).padStart(
        2,
        '0'
      );


    const minuto =
      String(
        data.getMinutes()
      ).padStart(
        2,
        '0'
      );


    const segundo =
      String(
        data.getSeconds()
      ).padStart(
        2,
        '0'
      );


    return (
      `${ano}-${mes}-${dia}_` +
      `${hora}-${minuto}-${segundo}`
    );
  }


  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  function init() {

    const pagina =
      obterPagina();


    if (!pagina) {

      console.warn(
        '[BACKUP] backupPage não encontrado.'
      );

      return;
    }


    garantirComponentes();


    configurarEventos();


    configurarEscape();


    atualizarInformacoesUltimoBackup();


    const elementos =
      obterElementos();


    console.log(
      '[BACKUP] Verificação:',
      {

        pagina:
          !!elementos.pagina,

        botaoCriar:
          !!elementos.btnCriar,

        botaoSelecionar:
          !!elementos.btnSelecionar,

        botaoApagar:
          !!elementos.btnApagar,

        modalApagar:
          !!document.getElementById(
            'modalApagarTudoBanco'
          ),

        modalRestauracao:
          !!document.getElementById(
            'modalConfirmacaoBackup'
          )

      }
    );


    console.log(
      '[BACKUP] Página inicializada.'
    );
  }


  /* =========================================================
     API GLOBAL
     ========================================================= */

  window.StockVisionBackup = {

    init,

    inicializar:
      init,

    criarBackup,

    processarArquivo,

    validarBackup,

    restaurarBackup,

    apagarTudoBanco,

    abrirModalRestauracao,

    fecharModalRestauracao,

    abrirModalApagarTudo,

    fecharModalApagarTudo,

    limparBackupSelecionado
  };


})();