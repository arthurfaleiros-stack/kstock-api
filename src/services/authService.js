const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioRepository = require('../repositories/usuarioRepository');
const assinaturaRepository = require('../repositories/assinaturaRepository');
const emailService = require('./emailService');
const AppError = require('../utils/appError');
const { isValidEmail } = require('../middlewares/validate');

class AuthService {
  async register({ nome, email, senha, perfil = 'OPERADOR' }) {
    if (!nome || !email || !senha) {
      throw new AppError('Nome, e-mail e senha são obrigatórios.', 400, 'MISSING_FIELDS');
    }

    if (!isValidEmail(email)) {
      throw new AppError('Formato de e-mail inválido.', 400, 'INVALID_EMAIL');
    }

    if (senha.length < 6) {
      throw new AppError('A senha deve conter no mínimo 6 caracteres.', 400, 'WEAK_PASSWORD');
    }

    const existingUser = await usuarioRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('Já existe um usuário cadastrado com este e-mail.', 409, 'DUPLICATE_EMAIL');
    }

    const salt = await bcrypt.genSalt(10);
    const senha_hash = await bcrypt.hash(senha, salt);

    const user = await usuarioRepository.create({
      nome,
      email,
      senha_hash,
      perfil: perfil.toUpperCase()
    });

    // Criar assinatura inicial gratuita padrão
    const hoje = new Date().toISOString().split('T')[0];
    await assinaturaRepository.create({
      usuario_id: user.id,
      plano: 'FREE',
      data_inicio: hoje,
      status: 'ATIVO'
    });

    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil
      },
      token
    };
  }

  async login({ email, senha }) {
    if (!email || !senha) {
      throw new AppError('E-mail e senha são obrigatórios.', 400, 'MISSING_FIELDS');
    }

    const user = await usuarioRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Credenciais inválidas.', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(senha, user.senha_hash);
    if (!isMatch) {
      throw new AppError('Credenciais inválidas.', 401, 'INVALID_CREDENTIALS');
    }

    const assinatura = await assinaturaRepository.findByUsuarioId(user.id);
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil
      },
      assinatura,
      token
    };
  }

  async getProfile(userId) {
    const user = await usuarioRepository.findById(userId);
    if (!user) {
      throw new AppError('Usuário não encontrado.', 404, 'USER_NOT_FOUND');
    }

    const assinatura = await assinaturaRepository.findByUsuarioId(userId);

    return {
      user,
      assinatura
    };
  }

  async solicitarReset({ email }) {
    const user = await usuarioRepository.findByEmail(email);
    let token = null;
    let previewUrl = null;
    if (user) {
      token = crypto.randomBytes(32).toString('hex');
      const expiraEm = new Date(Date.now() + 3600000).toISOString().slice(0, 19).replace('T', ' ');
      await usuarioRepository.updateResetToken(user.id, token, expiraEm);

      console.log('\n====================================================');
      console.log(`🔑 [REDEFINIÇÃO DE SENHA]`);
      console.log(`📧 E-mail: ${email}`);
      console.log(`🎟️  Token: ${token}`);
      console.log('====================================================\n');

      // Dispara o e-mail via serviço SMTP
      const emailResult = await emailService.sendPasswordResetEmail({
        email: user.email,
        nome: user.nome,
        token,
      });

      if (emailResult && emailResult.previewUrl) {
        previewUrl = emailResult.previewUrl;
      }
    }
    return {
      message: 'Se o e-mail estiver cadastrado, você receberá instruções por e-mail.',
      ...(process.env.NODE_ENV !== 'production' && token ? { devToken: token, ...(previewUrl ? { previewUrl } : {}) } : {})
    };
  }

  async confirmarReset({ token, novaSenha }) {
    const user = await usuarioRepository.findByResetToken(token);
    if (!user) throw new AppError('Token inválido ou expirado.', 400, 'INVALID_TOKEN');
    if (!novaSenha || novaSenha.length < 6) throw new AppError('Senha muito curta.', 400, 'WEAK_PASSWORD');
    const salt = await bcrypt.genSalt(10);
    await usuarioRepository.updateSenha(user.id, await bcrypt.hash(novaSenha, salt));
    await usuarioRepository.updateResetToken(user.id, null, null);
    return { message: 'Senha redefinida com sucesso.' };
  }

  generateToken(user) {
    const secret = process.env.JWT_SECRET || 'kstock_secret_key_default';
    const expiresIn = process.env.JWT_EXPIRES_IN || '8h';

    return jwt.sign(
      {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil
      },
      secret,
      { expiresIn }
    );
  }
}

module.exports = new AuthService();
