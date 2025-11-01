const OpenAI = require('openai');
const { config } = require('../config/env');

/**
 * Servicio para comunicarse con OpenAI API
 * Maneja la conexión y las solicitudes de text completion
 */
class OpenAIService {
  constructor() {
    if (!config.openai.apiKey) {
      throw new Error('OPENAI_API_KEY no está configurada');
    }

    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    this.model = config.openai.model;
    this.maxTokens = config.openai.maxTokens;
  }

  /**
   * Realiza una solicitud de text completion a ChatGPT
   * @param {string} prompt - El prompt a enviar
   * @returns {Promise<string>} La respuesta de ChatGPT
   */
  async getCompletion(prompt) {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.maxTokens,
        temperature: 0.7,
      });

      // Extraer el contenido de la respuesta
      const response = completion.choices[0]?.message?.content;

      if (!response) {
        throw new Error('No se recibió respuesta de OpenAI');
      }

      return response;
    } catch (error) {
      console.error('Error al comunicarse con OpenAI:', error);
      throw new Error(`Error al procesar solicitud con OpenAI: ${error.message}`);
    }
  }
}

module.exports = { OpenAIService };

