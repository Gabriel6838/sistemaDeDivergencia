(function () {

'use strict';

const produtosController = {


produtos: [],

async init() {

  this.bindEvents();

  await this.carregar();

},

bindEvents() {

  const pesquisa =
    document.getElementById(
      'produtoPesquisa'
    );

  const filtro =
    document.getElementById(
      'produtoSecaoFiltro'
    );

  const formulario =
    document.getElementById(
      'formProduto'
    );

  if (pesquisa) {

    pesquisa.oninput = () => {
      this.render();
    };

  }

  if (filtro) {

    filtro.onchange = () => {
      this.render();
    };

  }

  if (formulario) {

    formulario.onsubmit = event => {

      event.preventDefault();

      this.salvar();

    };

  }

},

async carregar() {

  try {

    if (
      !window.supabaseClient
    ) {
      throw new Error(
        'Supabase não foi inicializado.'
      );
    }

    const resposta =
      await window.supabaseClient
        .from('produtos')
        .select('*')
        .order(
          'descricao',
          {
            ascending: true
          }
        );

    if (resposta.error) {
      throw resposta.error;
    }

    this.produtos =
      resposta.data || [];

    this.carregarSecoes();

    this.render();

  } catch (error) {

    console.error(
      'StockVision Produtos:',
      error
    );

    if (
      window.StockVisionApp &&
      typeof window.StockVisionApp.toast === 'function'
    ) {

      window.StockVisionApp.toast(
        'Erro ao carregar produtos.',
        'error'
      );

    }

  }

},

carregarSecoes() {

  const select =
    document.getElementById(
      'produtoSecaoFiltro'
    );

  if (!select) {
    return;
  }

  const valorAtual =
    select.value;

  const secoes =
    Array.from(
      new Set(
        this.produtos
          .map(
            produto =>
              String(
                produto.secao || ''
              ).trim()
          )
          .filter(Boolean)
      )
    ).sort(
      (a, b) =>
        a.localeCompare(
          b,
          'pt-BR',
          {
            numeric: true
          }
        )
    );

  select.innerHTML = '';

  const opcaoTodas =
    document.createElement(
      'option'
    );

  opcaoTodas.value = '';

  opcaoTodas.textContent =
    'Todas as seções';

  select.appendChild(
    opcaoTodas
  );

  secoes.forEach(secao => {

    const option =
      document.createElement(
        'option'
      );

    option.value =
      secao;

    option.textContent =
      secao;

    select.appendChild(
      option
    );

  });

  if (
    secoes.includes(
      valorAtual
    )
  ) {

    select.value =
      valorAtual;

  }

},

getFiltrados() {

  const pesquisa =
    document.getElementById(
      'produtoPesquisa'
    );

  const filtro =
    document.getElementById(
      'produtoSecaoFiltro'
    );

  const termo =
    pesquisa?.value
      ?.trim()
      ?.toLowerCase() || '';

  const secao =
    filtro?.value || '';

  return this.produtos.filter(
    produto => {

      const codigo =
        String(
          produto.codigo ?? ''
        )
        .toLowerCase();

      const descricao =
        String(
          produto.descricao ?? ''
        )
        .toLowerCase();

      const textoOk =
        !termo ||
        codigo.includes(termo) ||
        descricao.includes(termo);

      const secaoOk =
        !secao ||
        produto.secao === secao;

      return textoOk && secaoOk;

    }
  );

},

render() {

  const tabela =
    document.getElementById(
      'produtosTabela'
    );

  if (!tabela) {
    return;
  }

  const produtos =
    this.getFiltrados();

  const quantidade =
    document.getElementById(
      'produtosQuantidade'
    );

  if (quantidade) {

    quantidade.textContent =
      `${produtos.length} ${
        produtos.length === 1
          ? 'produto'
          : 'produtos'
      }`;

  }

  if (!produtos.length) {

    tabela.innerHTML = `
      <tr>
        <td colspan="5">

          <div class="empty-state">

            <strong>
              Nenhum produto encontrado
            </strong>

            <span>
              Cadastre um produto ou altere os filtros.
            </span>

          </div>

        </td>
      </tr>
    `;

    return;

  }

  tabela.innerHTML =
    produtos
      .map(produto => {

        const id =
          String(
            produto.id
          );

        const codigo =
          window.StockVisionApp
            ?.escapeHtml
            ? window.StockVisionApp.escapeHtml(
                produto.codigo ?? ''
              )
            : String(
                produto.codigo ?? ''
              );

        const descricao =
          window.StockVisionApp
            ?.escapeHtml
            ? window.StockVisionApp.escapeHtml(
                produto.descricao ?? ''
              )
            : String(
                produto.descricao ?? ''
              );

        const secao =
          window.StockVisionApp
            ?.escapeHtml
            ? window.StockVisionApp.escapeHtml(
                produto.secao || 'Sem seção'
              )
            : String(
                produto.secao || 'Sem seção'
              );

        const data =
          window.StockVisionApp
            ?.formatDate
            ? window.StockVisionApp.formatDate(
                produto.created_at
              )
            : '';

        return `
          <tr>

            <td>
              <strong class="table-code">
                ${codigo}
              </strong>
            </td>

            <td>
              ${descricao}
            </td>

            <td>
              <span class="section-badge">
                ${secao}
              </span>
            </td>

            <td>
              ${data}
            </td>

            <td class="text-right">

              <div class="table-actions">

                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  data-editar-produto="${id}"
                  onclick="window.StockVisionProdutos && window.StockVisionProdutos.editarPorId('${id}')"
                >
                  Editar
                </button>

              </div>

            </td>

          </tr>
        `;

      })
      .join('');

},

editarPorId(id) {

  const produto =
    this.produtos.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!produto) {

    if (
      window.StockVisionApp &&
      typeof window.StockVisionApp.toast === 'function'
    ) {

      window.StockVisionApp.toast(
        'Produto não encontrado.',
        'warning'
      );

    }

    return;
  }

  this.abrirModal(
    produto
  );

},

abrirModal(produto = null) {

  const modal =
    document.getElementById(
      'modalProduto'
    );

  if (!modal) {

    console.error(
      'Modal de produto não encontrada.'
    );

    return;

  }

  const formulario =
    document.getElementById(
      'formProduto'
    );

  const titulo =
    document.getElementById(
      'modalProdutoTitulo'
    );

  const id =
    document.getElementById(
      'produtoId'
    );

  const codigo =
    document.getElementById(
      'produtoCodigo'
    );

  const descricao =
    document.getElementById(
      'produtoDescricao'
    );

  const secao =
    document.getElementById(
      'produtoSecao'
    );

  if (formulario) {
    formulario.reset();
  }

  if (id) {

    id.value =
      produto
        ? String(produto.id)
        : '';

  }

  if (codigo) {

    codigo.value =
      produto?.codigo || '';

  }

  if (descricao) {

    descricao.value =
      produto?.descricao || '';

  }

  if (secao) {

    secao.value =
      produto?.secao || '';

  }

  if (titulo) {

    titulo.textContent =
      produto
        ? 'Editar produto'
        : 'Novo produto';

  }

  modal.classList.remove(
    'hidden'
  );

  modal.style.display =
    'flex';

  modal.setAttribute(
    'aria-hidden',
    'false'
  );

  document.body.classList.add(
    'modal-open'
  );

  setTimeout(() => {

    if (codigo) {
      codigo.focus();
    }

  }, 100);

},

fecharModal() {

  const modal =
    document.getElementById(
      'modalProduto'
    );

  if (!modal) {
    return;
  }

  modal.classList.add(
    'hidden'
  );

  modal.style.display =
    'none';

  modal.setAttribute(
    'aria-hidden',
    'true'
  );

  document.body.classList.remove(
    'modal-open'
  );

  const formulario =
    document.getElementById(
      'formProduto'
    );

  if (formulario) {
    formulario.reset();
  }

  const id =
    document.getElementById(
      'produtoId'
    );

  if (id) {
    id.value = '';
  }

  const titulo =
    document.getElementById(
      'modalProdutoTitulo'
    );

  if (titulo) {

    titulo.textContent =
      'Novo produto';

  }

},

async salvar() {

  const id =
    document.getElementById(
      'produtoId'
    )?.value
      ?.trim() || '';

  const codigo =
    document.getElementById(
      'produtoCodigo'
    )?.value
      ?.trim() || '';

  const descricao =
    document.getElementById(
      'produtoDescricao'
    )?.value
      ?.trim() || '';

  const secao =
    document.getElementById(
      'produtoSecao'
    )?.value
      ?.trim() || '';

  if (!codigo) {

    this.mensagem(
      'Informe o código do produto.',
      'warning'
    );

    return;

  }

  if (!descricao) {

    this.mensagem(
      'Informe a descrição do produto.',
      'warning'
    );

    return;

  }

  if (!secao) {

    this.mensagem(
      'Selecione a seção do produto.',
      'warning'
    );

    return;

  }

  const botao =
    document.getElementById(
      'btnSalvarProduto'
    );

  if (botao) {

    botao.disabled =
      true;

    botao.textContent =
      'Salvando...';

  }

  try {

    const payload = {
      codigo,
      descricao,
      secao
    };

    let resposta;

    if (id) {

      resposta =
        await window.supabaseClient
          .from('produtos')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

    } else {

      resposta =
        await window.supabaseClient
          .from('produtos')
          .insert(payload)
          .select()
          .single();

    }

    if (resposta.error) {
      throw resposta.error;
    }

    this.mensagem(
      id
        ? 'Produto atualizado com sucesso.'
        : 'Produto cadastrado com sucesso.',
      'success'
    );

    this.fecharModal();

    await this.carregar();

  } catch (error) {

    console.error(
      'Erro ao salvar produto:',
      error
    );

    if (
      error?.code === '23505'
    ) {

      this.mensagem(
        'Esse código já está cadastrado.',
        'warning'
      );

    } else {

      this.mensagem(
        'Não foi possível salvar o produto.',
        'error'
      );

    }

  } finally {

    if (botao) {

      botao.disabled =
        false;

      botao.textContent =
        'Salvar produto';

    }

  }

},

mensagem(texto, tipo) {

  if (
    window.StockVisionApp &&
    typeof window.StockVisionApp.toast === 'function'
  ) {

    window.StockVisionApp.toast(
      texto,
      tipo
    );

  }

}


};

window.StockVisionProdutos =
produtosController;

if (
document.getElementById(
'produtosPage'
)
) {


produtosController.init();


}

})();
