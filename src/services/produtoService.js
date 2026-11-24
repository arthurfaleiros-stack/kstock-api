const produtoRepository = require('../repositories/produtoRepository');
const categoriaRepository = require('../repositories/categoriaRepository');
const fornecedorRepository = require('../repositories/fornecedorRepository');
const historicoRepository = require('../repositories/historicoRepository');
const AppError = require('../utils/appError');

class ProdutoService {
  async listProdutos(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));

    const [produtos, total] = await Promise.all([
      produtoRepository.findAll({ ...query, page, limit }),
      produtoRepository.countAll(query)
    ]);

    return {
      data: produtos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getProdutoById(id) {
    const produto = await produtoRepository.findById(id);
    if (!produto) {
      throw new AppError('Produto não encontrado.', 404, 'PRODUCT_NOT_FOUND');
    }
    return produto;
  }

    _normalizarPeriodo(dias, limiteDias) {
    return {
      dias: Math.max(1, Math.min(365, parseInt(dias, 10) || 30)),
      limiar: Math.max(1, Math.min(365, parseInt(limiteDias, 10) || 7))
    };
  }

  _calcularPrevisao(row, dias, limiar) {
    const saldo = Number(row.quantidade_atual);
    const totalSaidas = Number(row.total_saidas);
    const mediaDiaria = totalSaidas / dias;

    const diasAteRuptura = mediaDiaria > 0
      ? Math.floor(Math.max(0, saldo) / mediaDiaria)
      : null;

    const dataPrevista = diasAteRuptura !== null
      ? new Date(Date.now() + diasAteRuptura * 86400000).toISOString().split('T')[0]
      : null;

    return {
      produto_id: row.id,
      nome: row.nome,
      codigo: row.codigo,
      quantidade_atual: saldo,
      quantidade_minima: Number(row.quantidade_minima),
      periodo_analisado_dias: dias,
      total_saidas_periodo: totalSaidas,
      media_diaria_saidas: Number(mediaDiaria.toFixed(2)),
      dias_ate_ruptura: diasAteRuptura,
      data_prevista_ruptura: dataPrevista,
      risco: diasAteRuptura !== null && diasAteRuptura <= limiar ? 'ALTO' : 'NORMAL'
    };
  }

  async getPrevisaoRuptura(id, query = {}) {
    await this.getProdutoById(id); // garante o 404 se o produto não existir
    const { dias, limiar } = this._normalizarPeriodo(query.dias, query.limite_dias);

    const rows = await produtoRepository.findComSaidasPeriodo({ dias, produto_id: id });
    return this._calcularPrevisao(rows[0], dias, limiar);
  }

  async getProdutosEmRisco(query = {}) {
    const { dias, limiar } = this._normalizarPeriodo(query.dias, query.limite_dias);

    const rows = await produtoRepository.findComSaidasPeriodo({ dias });
    const emRisco = rows
      .map((row) => this._calcularPrevisao(row, dias, limiar))
      .filter((p) => p.risco === 'ALTO')
      .sort((a, b) => a.dias_ate_ruptura - b.dias_ate_ruptura);

    return {
      total: emRisco.length,
      periodo_analisado_dias: dias,
      limite_dias_alerta: limiar,
      data: emRisco
    };
  }

  async getAlertasEstoque() {
    const produtos = await produtoRepository.findAll({
      alerta_estoque: true,
      limit: 100
    });
    return produtos;
  }

  async createProduto(data, usuarioId) {
    const {
      categoria_id,
      fornecedor_id,
      nome,
      codigo,
      descricao,
      quantidade_atual = 0,
      quantidade_minima = 0,
      codigo_barras
    } = data;

    if (!categoria_id || !fornecedor_id || !nome || !codigo) {
      throw new AppError('Categoria, fornecedor, nome e código SKU são obrigatórios.', 400, 'MISSING_FIELDS');
    }

    const categoria = await categoriaRepository.findById(categoria_id);
    if (!categoria) {
      throw new AppError('Categoria informada não existe.', 404, 'CATEGORY_NOT_FOUND');
    }

    const fornecedor = await fornecedorRepository.findById(fornecedor_id);
    if (!fornecedor) {
      throw new AppError('Fornecedor informado não existe.', 404, 'SUPPLIER_NOT_FOUND');
    }

    const existingCodigo = await produtoRepository.findByCodigo(codigo);
    if (existingCodigo) {
      throw new AppError('Já existe um produto com este código SKU.', 409, 'DUPLICATE_SKU');
    }

    const novoProduto = await produtoRepository.create({
      categoria_id,
      fornecedor_id,
      nome: nome.trim(),
      codigo: codigo.trim(),
      descricao,
      quantidade_atual: Math.max(0, parseInt(quantidade_atual, 10) || 0),
      quantidade_minima: Math.max(0, parseInt(quantidade_minima, 10) || 0),
      codigo_barras
    });

    // Gravar histórico de auditoria
    await historicoRepository.create({
      usuario_id: usuarioId,
      produto_id: novoProduto.id,
      tipo_operacao: 'CRIACAO_PRODUTO',
      descricao: `Produto "${novoProduto.nome}" (${novoProduto.codigo}) criado com saldo inicial de ${novoProduto.quantidade_atual}.`
    });

    return novoProduto;
  }

  async updateProduto(id, data, usuarioId) {
    const produto = await this.getProdutoById(id);

    if (data.categoria_id && data.categoria_id !== produto.categoria_id) {
      const cat = await categoriaRepository.findById(data.categoria_id);
      if (!cat) throw new AppError('Categoria informada não existe.', 404, 'CATEGORY_NOT_FOUND');
    }

    if (data.fornecedor_id && data.fornecedor_id !== produto.fornecedor_id) {
      const forn = await fornecedorRepository.findById(data.fornecedor_id);
      if (!forn) throw new AppError('Fornecedor informado não existe.', 404, 'SUPPLIER_NOT_FOUND');
    }

    if (data.codigo && data.codigo !== produto.codigo) {
      const existing = await produtoRepository.findByCodigo(data.codigo);
      if (existing && existing.id !== Number(id)) {
        throw new AppError('Já existe um produto com este código SKU.', 409, 'DUPLICATE_SKU');
      }
    }

    const atualizado = await produtoRepository.update(id, {
      categoria_id: data.categoria_id || produto.categoria_id,
      fornecedor_id: data.fornecedor_id || produto.fornecedor_id,
      nome: data.nome ? data.nome.trim() : produto.nome,
      codigo: data.codigo ? data.codigo.trim() : produto.codigo,
      descricao: data.descricao !== undefined ? data.descricao : produto.descricao,
      quantidade_minima: data.quantidade_minima !== undefined ? data.quantidade_minima : produto.quantidade_minima,
      codigo_barras: data.codigo_barras !== undefined ? data.codigo_barras : produto.codigo_barras
    });

    await historicoRepository.create({
      usuario_id: usuarioId,
      produto_id: id,
      tipo_operacao: 'ATUALIZACAO_PRODUTO',
      descricao: `Dados cadastrais do produto "${atualizado.nome}" foram atualizados.`
    });

    return atualizado;
  }

  async updateFoto(id, fotoUrl, usuarioId) {
    const produto = await this.getProdutoById(id);
    const atualizado = await produtoRepository.updateFoto(id, fotoUrl);

    await historicoRepository.create({
      usuario_id: usuarioId,
      produto_id: id,
      tipo_operacao: 'ATUALIZACAO_FOTO',
      descricao: `Foto do produto "${produto.nome}" atualizada.`
    });

    return atualizado;
  }

  async deleteProduto(id, usuarioId) {
    const produto = await this.getProdutoById(id);

    const totalMovs = await produtoRepository.countMovimentacoes(id);
    if (totalMovs > 0) {
      throw new AppError(
        `Não é possível excluir o produto "${produto.nome}" pois ele possui ${totalMovs} movimentação(ões) registrada(s).`,
        409,
        'RESTRICTED_RELATION'
      );
    }

    await historicoRepository.create({
      usuario_id: usuarioId,
      produto_id: null,
      tipo_operacao: 'EXCLUSAO_PRODUTO',
      descricao: `Produto "${produto.nome}" (ID ${id}, SKU: ${produto.codigo}) foi excluído definitivamente.`
    });

    return await produtoRepository.delete(id);
  }
}

module.exports = new ProdutoService();
