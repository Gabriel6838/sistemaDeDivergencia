'use strict';

const StockVisionDivergencias = {

produtoAtual: null,
competenciaAtual: null,

divergenciaOrigemTroca: null,
divergenciaDestinoTroca: null,

initialized: false,
abortController: null,

async init() {


this.destroy();

this.initialized = true;

this.abortController =
  new AbortController();

this.form =
  document.getElementById(
    'formNovaDivergencia'
  );

/*
 * IMPORTANTE:
 * Sempre que a página Nova Divergência
 * for carregada, todos os modais são
 * fechados à força.
 */
this.fecharTodosModais();

this.bindEvents();

await this.carregarCompetencia();


},

destroy() {


if (this.abortController) {

  this.abortController.abort();

  this.abortController = null;

}

this.initialized = false;


},

/*

* =========================================================
* CONTROLE CENTRAL DOS MODAIS
* =========================================================
  */

obterModal(id) {


return document.getElementById(id);


},

fecharModal(id) {


const modal =
  this.obterModal(id);

if (!modal) {
  return;
}

/*
 * Usa os DOIS mecanismos.
 * Isso evita que o CSS faça o modal
 * reaparecer.
 */
modal.classList.add('hidden');

modal.style.display = 'none';

modal.setAttribute(
  'aria-hidden',
  'true'
);


},

abrirModal(id) {


const modal =
  this.obterModal(id);

if (!modal) {
  return;
}

/*
 * Primeiro fecha TODOS os outros.
 */
this.fecharTodosModais(id);

/*
 * Remove o estado fechado.
 */
modal.classList.remove('hidden');

modal.style.display = 'flex';

modal.setAttribute(
  'aria-hidden',
  'false'
);


},

fecharTodosModais(excecao = null) {


const modais = [
  'modalProdutoRapido',
  'modalTrocas'
];

modais.forEach(id => {

  if (id === excecao) {
    return;
  }

  this.fecharModal(id);

});


},

/*

* =========================================================
* EVENTOS
* =========================================================
  */

bindEvents() {


const signal =
  this.abortController?.signal;


document
  .getElementById(
    'btnBuscarProdutoDivergencia'
  )
  ?.addEventListener(
    'click',
    () => this.buscarProduto(),
    { signal }
  );


document
  .getElementById(
    'divergenciaCodigo'
  )
  ?.addEventListener(
    'keydown',
    event => {

      if (event.key === 'Enter') {

        event.preventDefault();

        this.buscarProduto();

      }

    },
    { signal }
  );


[
  'divergenciaCusto',
  'divergenciaSistema',
  'divergenciaFisico'
].forEach(id => {

  document
    .getElementById(id)
    ?.addEventListener(
      'input',
      () => this.calcular(),
      { signal }
    );

});


this.form?.addEventListener(
  'submit',
  event => {

    event.preventDefault();

    this.salvar();

  },
  { signal }
);


document
  .getElementById(
    'btnLimparDivergencia'
  )
  ?.addEventListener(
    'click',
    () => this.limparFormulario(),
    { signal }
  );


/*
 * CADASTRO RÁPIDO
 */

document
  .getElementById(
    'btnCadastrarProdutoDivergencia'
  )
  ?.addEventListener(
    'click',
    event => {

      event.preventDefault();

      event.stopPropagation();

      this.abrirProdutoRapido();

    },
    { signal }
  );


document
  .getElementById(
    'btnFecharProdutoRapido'
  )
  ?.addEventListener(
    'click',
    event => {

      event.preventDefault();

      event.stopPropagation();

      this.fecharProdutoRapido();

    },
    { signal }
  );


document
  .getElementById(
    'btnCancelarProdutoRapido'
  )
  ?.addEventListener(
    'click',
    event => {

      event.preventDefault();

      event.stopPropagation();

      this.fecharProdutoRapido();

    },
    { signal }
  );


document
  .getElementById(
    'formProdutoRapido'
  )
  ?.addEventListener(
    'submit',
    event => {

      event.preventDefault();

      event.stopPropagation();

      this.salvarProdutoRapido();

    },
    { signal }
  );


/*
 * TROCAS
 */

document
  .getElementById(
    'btnFecharTrocas'
  )
  ?.addEventListener(
    'click',
    event => {

      event.preventDefault();

      event.stopPropagation();

      this.fecharTrocas();

    },
    { signal }
  );


document
  .getElementById(
    'btnCancelarTroca'
  )
  ?.addEventListener(
    'click',
    event => {

      event.preventDefault();

      event.stopPropagation();

      this.fecharTrocas();

    },
    { signal }
  );


document
  .getElementById(
    'trocaBusca'
  )
  ?.addEventListener(
    'input',
    event =>
      this.buscarTrocas(
        event.target.value
      ),
    { signal }
  );


document
  .getElementById(
    'btnConfirmarTroca'
  )
  ?.addEventListener(
    'click',
    event => {

      event.preventDefault();

      event.stopPropagation();

      this.confirmarTroca();

    },
    { signal }
  );


/*
 * Clique no fundo do modal
 */

document
  .getElementById(
    'modalProdutoRapido'
  )
  ?.addEventListener(
    'click',
    event => {

      if (
        event.target ===
        event.currentTarget
      ) {

        this.fecharProdutoRapido();

      }

    },
    { signal }
  );


document
  .getElementById(
    'modalTrocas'
  )
  ?.addEventListener(
    'click',
    event => {

      if (
        event.target ===
        event.currentTarget
      ) {

        this.fecharTrocas();

      }

    },
    { signal }
  );


/*
 * ESC fecha qualquer modal.
 */

document.addEventListener(
  'keydown',
  event => {

    if (event.key !== 'Escape') {
      return;
    }

    this.fecharTodosModais();

  },
  { signal }
);


},

/*

* =========================================================
* COMPETÊNCIA
* =========================================================
  */

async carregarCompetencia() {


const competencia =
  await StockVisionApp
    .updateCompetenciaGlobal();

this.competenciaAtual =
  competencia;


const alerta =
  document.getElementById(
    'novaDivergenciaAlerta'
  );


const form =
  document.getElementById(
    'formNovaDivergencia'
  );


const label =
  document.getElementById(
    'novaDivergenciaCompetencia'
  );


if (!competencia) {

  alerta?.classList.remove(
    'hidden'
  );

  if (form) {

    form.classList.add(
      'form-disabled'
    );

  }

  if (label) {

    label.textContent =
      'Nenhuma aberta';

  }

  return;

}


alerta?.classList.add(
  'hidden'
);

form?.classList.remove(
  'form-disabled'
);


if (label) {

  label.textContent =
    StockVisionApp.formatCompetencia(
      competencia.competencia
    );

}


},

/*

* =========================================================
* BUSCAR PRODUTO
* =========================================================
  */

async buscarProduto() {


const input =
  document.getElementById(
    'divergenciaCodigo'
  );


const codigo =
  input?.value.trim();


if (!codigo) {

  StockVisionApp.toast(
    'Informe o código do produto.',
    'warning'
  );

  input?.focus();

  return;

}


const preview =
  document.getElementById(
    'produtoEncontradoBox'
  );


const notFound =
  document.getElementById(
    'produtoNaoEncontradoBox'
  );


try {

  const {
    data,
    error
  } = await window.supabaseClient
    .from('produtos')
    .select('*')
    .eq('codigo', codigo)
    .maybeSingle();


  if (error) {
    throw error;
  }


  if (!data) {

    this.produtoAtual =
      null;

    preview?.classList.add(
      'hidden'
    );

    notFound?.classList.remove(
      'hidden'
    );

    return;

  }


  this.produtoAtual =
    data;


  notFound?.classList.add(
    'hidden'
  );

  preview?.classList.remove(
    'hidden'
  );


  document.getElementById(
    'produtoEncontradoDescricao'
  ).textContent =
    data.descricao;


  document.getElementById(
    'produtoEncontradoCodigo'
  ).textContent =
    data.codigo;


  document.getElementById(
    'produtoEncontradoSecao'
  ).textContent =
    data.secao ||
    'Sem seção';


  document.getElementById(
    'resumoProduto'
  ).textContent =
    data.descricao;


  StockVisionApp.toast(
    'Produto localizado.',
    'success'
  );


} catch (error) {

  console.error(error);

  StockVisionApp.toast(
    'Erro ao buscar o produto.',
    'error'
  );

}


},

/*

* =========================================================
* CÁLCULO
* =========================================================
  */

calcular() {


const custo =
  Number(
    document.getElementById(
      'divergenciaCusto'
    )?.value || 0
  );


const sistema =
  Number(
    document.getElementById(
      'divergenciaSistema'
    )?.value || 0
  );


const fisico =
  Number(
    document.getElementById(
      'divergenciaFisico'
    )?.value || 0
  );


const quantidade =
  fisico - sistema;


const valor =
  quantidade * custo;


const quantidadeElement =
  document.getElementById(
    'divergenciaQuantidadePreview'
  );


const valorElement =
  document.getElementById(
    'divergenciaValorPreview'
  );


if (quantidadeElement) {

  quantidadeElement.textContent =
    `${quantidade > 0 ? '+' : ''}${quantidade} unidades`;

}


if (valorElement) {

  valorElement.textContent =
    StockVisionApp.formatMoney(
      valor
    );

}


document.getElementById(
  'resumoSistema'
).textContent =
  sistema;


document.getElementById(
  'resumoFisico'
).textContent =
  fisico;


document.getElementById(
  'resumoQuantidade'
).textContent =
  `${quantidade > 0 ? '+' : ''}${quantidade}`;


document.getElementById(
  'resumoValor'
).textContent =
  StockVisionApp.formatMoney(
    valor
  );


quantidadeElement?.classList.toggle(
  'calculation-positive',
  quantidade > 0
);


quantidadeElement?.classList.toggle(
  'calculation-negative',
  quantidade < 0
);


valorElement?.classList.toggle(
  'calculation-positive',
  valor > 0
);


valorElement?.classList.toggle(
  'calculation-negative',
  valor < 0
);


},

/*

* =========================================================
* SALVAR DIVERGÊNCIA
* =========================================================
  */

async salvar() {


if (!this.competenciaAtual) {

  StockVisionApp.toast(
    'Abra uma competência antes de registrar.',
    'warning'
  );

  return;

}


if (!this.produtoAtual) {

  StockVisionApp.toast(
    'Localize o produto antes de registrar.',
    'warning'
  );

  return;

}


const custo =
  Number(
    document.getElementById(
      'divergenciaCusto'
    ).value
  );


const sistema =
  Number(
    document.getElementById(
      'divergenciaSistema'
    ).value
  );


const fisico =
  Number(
    document.getElementById(
      'divergenciaFisico'
    ).value
  );


const observacao =
  document.getElementById(
    'divergenciaObservacao'
  ).value.trim();


const divergenciaQuantidade =
  fisico - sistema;


const divergenciaValor =
  divergenciaQuantidade * custo;


if (
  !Number.isFinite(custo) ||
  custo < 0
) {

  StockVisionApp.toast(
    'Informe um preço de custo válido.',
    'warning'
  );

  return;

}


try {

  const {
    error
  } = await window.supabaseClient
    .from('divergencias')
    .insert({

      produto_id:
        this.produtoAtual.id,

      competencia:
        this.competenciaAtual.competencia,

      competencia_id:
        this.competenciaAtual.id,

      quantidade_sistema:
        sistema,

      quantidade_fisica:
        fisico,

      divergencia_quantidade:
        divergenciaQuantidade,

      custo:
        custo,

      divergencia_valor:
        divergenciaValor,

      observacao:
        observacao || null,

      status:
        'pendente'

    });


  if (error) {
    throw error;
  }


  StockVisionApp.toast(
    'Divergência registrada com sucesso.',
    'success'
  );


  this.limparFormulario();


  await StockVisionApp
    .updateCompetenciaGlobal();


} catch (error) {

  console.error(error);

  StockVisionApp.toast(
    'Não foi possível registrar a divergência.',
    'error'
  );

}


},

/*

* =========================================================
* LIMPAR FORMULÁRIO
* =========================================================
  */

limparFormulario() {


this.fecharTodosModais();


this.form?.reset();

this.produtoAtual =
  null;


document.getElementById(
  'produtoEncontradoBox'
)?.classList.add(
  'hidden'
);


document.getElementById(
  'produtoNaoEncontradoBox'
)?.classList.add(
  'hidden'
);


const resumoProduto =
  document.getElementById(
    'resumoProduto'
  );


if (resumoProduto) {

  resumoProduto.textContent =
    '—';

}


this.calcular();


},

/*

* =========================================================
* ABRIR CADASTRO RÁPIDO
* =========================================================
  */

abrirProdutoRapido() {


/*
 * Fecha obrigatoriamente o modal de trocas.
 */
this.fecharTrocas();


const codigoInput =
  document.getElementById(
    'divergenciaCodigo'
  );


const codigo =
  codigoInput?.value.trim() ||
  '';


const modal =
  document.getElementById(
    'modalProdutoRapido'
  );


const codigoRapido =
  document.getElementById(
    'produtoRapidoCodigo'
  );


if (!modal) {
  return;
}


if (codigoRapido) {

  codigoRapido.value =
    codigo;

}


/*
 * Abre EXCLUSIVAMENTE este modal.
 */
this.abrirModal(
  'modalProdutoRapido'
);


requestAnimationFrame(() => {

  codigoRapido?.focus();

});


},

/*

* =========================================================
* FECHAR CADASTRO RÁPIDO
* =========================================================
  */

fecharProdutoRapido() {


this.fecharModal(
  'modalProdutoRapido'
);


},

/*

* =========================================================
* SALVAR PRODUTO RÁPIDO
* =========================================================
  */

async salvarProdutoRapido() {


const codigo =
  document.getElementById(
    'produtoRapidoCodigo'
  ).value.trim();


const descricao =
  document.getElementById(
    'produtoRapidoDescricao'
  ).value.trim();


const secao =
  document.getElementById(
    'produtoRapidoSecao'
  ).value.trim();


if (!codigo || !descricao) {

  StockVisionApp.toast(
    'Preencha código e descrição.',
    'warning'
  );

  return;

}


try {

  const {
    data,
    error
  } = await window.supabaseClient
    .from('produtos')
    .insert({

      codigo,
      descricao,
      secao:
        secao || null

    })
    .select()
    .single();


  if (error) {
    throw error;
  }


  this.produtoAtual =
    data;


  document.getElementById(
    'divergenciaCodigo'
  ).value =
    data.codigo;


  document.getElementById(
    'produtoEncontradoDescricao'
  ).textContent =
    data.descricao;


  document.getElementById(
    'produtoEncontradoCodigo'
  ).textContent =
    data.codigo;


  document.getElementById(
    'produtoEncontradoSecao'
  ).textContent =
    data.secao ||
    'Sem seção';


  document.getElementById(
    'produtoEncontradoBox'
  ).classList.remove(
    'hidden'
  );


  document.getElementById(
    'produtoNaoEncontradoBox'
  ).classList.add(
    'hidden'
  );


  document.getElementById(
    'resumoProduto'
  ).textContent =
    data.descricao;


  /*
   * Fecha somente o modal de cadastro.
   */
  this.fecharProdutoRapido();


  StockVisionApp.toast(
    'Produto cadastrado e selecionado.',
    'success'
  );


} catch (error) {

  console.error(error);


  if (
    error.code ===
    '23505'
  ) {

    StockVisionApp.toast(
      'Esse código já está cadastrado.',
      'warning'
    );

  } else {

    StockVisionApp.toast(
      'Erro ao cadastrar produto.',
      'error'
    );

  }

}


},

/*

* =========================================================
* TROCAS
* =========================================================
  */

async buscarTrocas(termo) {


const container =
  document.getElementById(
    'trocaResultados'
  );


if (!termo.trim()) {

  container.innerHTML = `
    <div class="empty-state compact">
      <strong>Pesquise uma divergência</strong>
      <span>
        Os resultados aparecerão aqui.
      </span>
    </div>
  `;

  return;

}


try {

  const {
    data,
    error
  } = await window.supabaseClient
    .from('divergencias')
    .select(`
      id,
      competencia,
      divergencia_quantidade,
      divergencia_valor,
      status,
      created_at,
      produtos (
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
    )
    .limit(100);


  if (error) {
    throw error;
  }


  const busca =
    termo.toLowerCase();


  const resultados =
    (data || []).filter(
      item => {

        const produto =
          item.produtos ||
          {};


        return (

          String(
            produto.codigo || ''
          )
            .toLowerCase()
            .includes(busca) ||

          String(
            produto.descricao || ''
          )
            .toLowerCase()
            .includes(busca) ||

          String(
            item.competencia || ''
          )
            .includes(busca)

        );

      }
    );


  if (!resultados.length) {

    container.innerHTML = `
      <div class="empty-state compact">
        <strong>Nenhuma divergência encontrada</strong>
      </div>
    `;

    return;

  }


  container.innerHTML =
    resultados.map(
      item => {

        const produto =
          item.produtos ||
          {};


        const selecionada =
          this.divergenciaDestinoTroca?.id ===
          item.id;


        return `
          <button
            type="button"
            class="selection-item ${
              selecionada
                ? 'selected'
                : ''
            }"
            data-troca-id="${item.id}"
          >

            <div>

              <strong>
                ${StockVisionApp.escapeHtml(
                  produto.descricao ||
                  'Produto'
                )}
              </strong>

              <span>
                ${StockVisionApp.escapeHtml(
                  produto.codigo ||
                  ''
                )}
                ·
                ${StockVisionApp.formatCompetencia(
                  item.competencia
                )}
              </span>

            </div>

            <div class="${
              Number(
                item.divergencia_valor
              ) < 0
                ? 'text-danger'
                : 'text-success'
            }">

              ${StockVisionApp.formatMoney(
                item.divergencia_valor
              )}

            </div>

          </button>
        `;

      }
    ).join('');


  container
    .querySelectorAll(
      '[data-troca-id]'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          const item =
            resultados.find(
              row =>
                row.id ===
                button.dataset.trocaId
            );


          this.divergenciaDestinoTroca =
            item;


          container
            .querySelectorAll(
              '[data-troca-id]'
            )
            .forEach(
              element => {

                element.classList.remove(
                  'selected'
                );

              }
            );


          button.classList.add(
            'selected'
          );


          document.getElementById(
            'btnConfirmarTroca'
          ).disabled =
            false;

        }
      );

    });


} catch (error) {

  console.error(error);

  StockVisionApp.toast(
    'Erro ao pesquisar trocas.',
    'error'
  );

}


},

/*

* =========================================================
* ABRIR TROCAS
* =========================================================
  */

abrirTrocas(divergencia) {


/*
 * Fecha obrigatoriamente o cadastro rápido.
 */
this.fecharProdutoRapido();


this.divergenciaOrigemTroca =
  divergencia;

this.divergenciaDestinoTroca =
  null;


document.getElementById(
  'trocaOrigemDescricao'
).textContent =
  divergencia.produtos?.descricao ||
  'Produto';


document.getElementById(
  'trocaOrigemDetalhes'
).textContent =
  `${divergencia.produtos?.codigo || ''} · ${
    StockVisionApp.formatCompetencia(
      divergencia.competencia
    )
  }`;


document.getElementById(
  'trocaBusca'
).value = '';


document.getElementById(
  'btnConfirmarTroca'
).disabled = true;


/*
 * Abre EXCLUSIVAMENTE o modal de trocas.
 */
this.abrirModal(
  'modalTrocas'
);


requestAnimationFrame(() => {

  document
    .getElementById(
      'trocaBusca'
    )
    ?.focus();

});


},

/*

* =========================================================
* FECHAR TROCAS
* =========================================================
  */

fecharTrocas() {


this.fecharModal(
  'modalTrocas'
);


},

/*

* =========================================================
* CONFIRMAR TROCA
* =========================================================
  */

async confirmarTroca() {


if (
  !this.divergenciaOrigemTroca ||
  !this.divergenciaDestinoTroca
) {

  return;

}


if (
  this.divergenciaOrigemTroca.id ===
  this.divergenciaDestinoTroca.id
) {

  StockVisionApp.toast(
    'A divergência não pode ser vinculada a ela mesma.',
    'warning'
  );

  return;

}


try {

  const {
    error
  } = await window.supabaseClient
    .from('trocas')
    .insert({

      competencia_id:
        this.competenciaAtual?.id ||
        null,

      divergencia_origem_id:
        this.divergenciaOrigemTroca.id,

      divergencia_destino_id:
        this.divergenciaDestinoTroca.id,

      status:
        'pendente',

      observacao:
        null

    });


  if (error) {
    throw error;
  }


  this.fecharTrocas();


  StockVisionApp.toast(
    'Divergências vinculadas com sucesso.',
    'success'
  );


} catch (error) {

  console.error(error);


  StockVisionApp.toast(
    'Não foi possível vincular as divergências.',
    'error'
  );

}


}

};

window.StockVisionDivergencias =
StockVisionDivergencias;
