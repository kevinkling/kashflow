const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const ffmpeg = require('@ffmpeg-installer/ffmpeg');

const execAsync = promisify(exec);

/**
 * Servicio para transcribir audio usando Whisper local de OpenAI
 * 
 * REQUISITOS:
 * 1. Tener Python 3.8+ instalado
 * 2. Instalar Whisper: pip install openai-whisper
 * 3. Instalar ffmpeg (ya incluido con @ffmpeg-installer/ffmpeg)
 * 
 * Modelos disponibles: tiny, base, small, medium, large
 * - tiny: Más rápido, menos preciso (~1GB RAM)
 * - base: Balance velocidad/precisión (~1GB RAM)
 * - small: Buena precisión (~2GB RAM)
 * - medium: Alta precisión (~5GB RAM)
 * - large: Máxima precisión (~10GB RAM)
 */

class WhisperService {
  constructor() {
    // Modelo por defecto (puedes cambiarlo en .env)
    this.model = process.env.WHISPER_MODEL || 'base';
    this.useLocalWhisper = process.env.USE_LOCAL_WHISPER === 'true';
    this.tempDir = path.join(__dirname, '../../temp');
    
    // Buscar ejecutable de Python
    this.pythonCommand = this.findPythonCommand();
    
    // Crear directorio temporal si no existe
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    console.log(`🎤 Whisper Service inicializado (modo: ${this.useLocalWhisper ? 'LOCAL' : 'API'}, modelo: ${this.model})`);
    console.log(`🐍 Python command: ${this.pythonCommand}`);
  }

  /**
   * Encuentra el comando de Python disponible en el sistema
   */
  findPythonCommand() {
    // En Windows, 'py' es el Python Launcher
    if (process.platform === 'win32') {
      return 'py';
    }
    return 'python3';
  }

  /**
   * Verifica si Whisper está instalado localmente
   */
  async checkWhisperInstallation() {
    try {
      // Probar diferentes comandos de Python
      const pythonCommands = ['py', 'python', 'python3'];
      let pythonFound = false;
      let pythonCmd = null;

      for (const cmd of pythonCommands) {
        try {
          const { stdout } = await execAsync(`${cmd} --version`);
          console.log(`✅ Python encontrado con '${cmd}':`, stdout.trim());
          pythonCmd = cmd;
          pythonFound = true;
          this.pythonCommand = pythonCmd;
          break;
        } catch (error) {
          continue;
        }
      }

      if (!pythonFound) {
        throw new Error('Python no encontrado. Por favor instala Python 3.8+');
      }

      // Intentar importar whisper
      try {
        await execAsync(`${pythonCmd} -c "import whisper"`);
        console.log('✅ Whisper instalado correctamente');
        return true;
      } catch (error) {
        console.error('❌ Whisper no está instalado');
        throw new Error(
          'Whisper no está instalado. Por favor ejecuta: pip install openai-whisper'
        );
      }
    } catch (error) {
      console.error('❌ Error verificando instalación:', error.message);
      return false;
    }
  }

  /**
   * Convierte un archivo de audio a formato compatible con Whisper
   * @param {string} inputPath - Ruta del archivo de entrada
   * @returns {Promise<string>} - Ruta del archivo convertido
   */
  async convertAudio(inputPath) {
    const outputPath = path.join(this.tempDir, `converted_${Date.now()}.wav`);
    const ffmpegPath = ffmpeg.path;

    const command = `"${ffmpegPath}" -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}"`;

    try {
      await execAsync(command);
      console.log('✅ Audio convertido exitosamente');
      return outputPath;
    } catch (error) {
      console.error('❌ Error convirtiendo audio:', error);
      throw new Error('Error al convertir el audio');
    }
  }

  /**
   * Transcribe audio usando Whisper local
   * @param {string} audioPath - Ruta del archivo de audio
   * @returns {Promise<string>} - Texto transcrito
   */
  async transcribeWithLocalWhisper(audioPath) {
    try {
      // Verificar que Whisper esté instalado
      const isInstalled = await this.checkWhisperInstallation();
      if (!isInstalled) {
        throw new Error(
          'Whisper no está instalado. Por favor ejecuta: pip install openai-whisper'
        );
      }

      console.log('🎤 Transcribiendo audio con Whisper local...');
      console.log('📁 Archivo de audio:', audioPath);

      // Normalizar la ruta para Python (usar forward slashes)
      const normalizedPath = audioPath.replace(/\\/g, '/');
      
      // Obtener ruta de FFmpeg de nuestra instalación
      const ffmpegPath = ffmpeg.path.replace(/\\/g, '/');
      const ffmpegDir = path.dirname(ffmpeg.path).replace(/\\/g, '/');

      // Crear el código Python inline con FFmpeg configurado
      const pythonCode = `
import whisper
import sys
import json
import warnings
import os
warnings.filterwarnings("ignore")

try:
    # Configurar FFmpeg para Whisper
    os.environ["PATH"] = "${ffmpegDir}" + os.pathsep + os.environ.get("PATH", "")
    
    print("Cargando modelo ${this.model}...", file=sys.stderr)
    model = whisper.load_model("${this.model}")
    
    print("Transcribiendo audio...", file=sys.stderr)
    result = model.transcribe("${normalizedPath}", language="es", fp16=False)
    
    output = {
        "text": result["text"],
        "language": result.get("language", "es")
    }
    print(json.dumps(output, ensure_ascii=False))
    
except Exception as e:
    import traceback
    error_output = {
        "error": str(e),
        "traceback": traceback.format_exc()
    }
    print(json.dumps(error_output, ensure_ascii=False), file=sys.stderr)
    sys.exit(1)
`;

      // Usar spawn para mejor manejo del proceso Python
      const { spawn } = require('child_process');
      
      const result = await new Promise((resolve, reject) => {
        const python = spawn(this.pythonCommand, ['-u', '-c', pythonCode], {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
          const text = data.toString();
          stdout += text;
          console.log('📝 Whisper:', text.trim());
        });

        python.stderr.on('data', (data) => {
          const text = data.toString();
          stderr += text;
          // Mostrar progreso de Whisper
          if (!text.includes('FutureWarning') && text.trim()) {
            console.log('⏳', text.trim());
          }
        });

        python.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Python salió con código ${code}\n${stderr}`));
          } else {
            try {
              // Buscar la línea JSON en stdout
              const lines = stdout.split('\n').filter(line => line.trim());
              const jsonLine = lines.find(line => line.trim().startsWith('{'));
              
              if (!jsonLine) {
                reject(new Error(`No se encontró salida JSON.\nStdout: ${stdout}\nStderr: ${stderr}`));
                return;
              }

              const result = JSON.parse(jsonLine);
              
              if (result.error) {
                reject(new Error(`Error en Whisper: ${result.error}\n${result.traceback || ''}`));
              } else {
                resolve(result);
              }
            } catch (error) {
              reject(new Error(`Error parseando respuesta: ${error.message}\nOutput: ${stdout}`));
            }
          }
        });

        python.on('error', (error) => {
          reject(new Error(`Error ejecutando ${this.pythonCommand}: ${error.message}. Asegúrate de que Python está instalado y en el PATH.`));
        });
      });

      console.log('✅ Transcripción completada:', result.text);
      return result.text.trim();

    } catch (error) {
      console.error('❌ Error en transcripción local:', error.message);
      
      // Sugerencia útil si falla
      if (this.useLocalWhisper) {
        console.log('💡 Sugerencia: Si el error persiste, puedes:');
        console.log('   1. Verificar que Whisper está instalado: pip install openai-whisper');
        console.log('   2. Usar la API de OpenAI: configura USE_LOCAL_WHISPER=false en .env');
      }
      
      throw error;
    }
  }

  /**
   * Transcribe audio usando la API de OpenAI (alternativa si no tienes Whisper local)
   * @param {string} audioPath - Ruta del archivo de audio
   * @returns {Promise<string>} - Texto transcrito
   */
  async transcribeWithAPI(audioPath) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY no está configurada en el archivo .env');
      }

      const OpenAI = require('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      console.log('🎤 Transcribiendo audio con API de OpenAI...');
      
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-1',
        language: 'es',
      });

      console.log('✅ Transcripción completada:', transcription.text);
      return transcription.text.trim();
    } catch (error) {
      console.error('❌ Error en transcripción con API:', error.message);
      throw error;
    }
  }

  /**
   * Descarga un archivo de audio desde una URL
   * @param {string} fileUrl - URL del archivo
   * @param {string} token - Token del bot de Telegram
   * @returns {Promise<string>} - Ruta del archivo descargado
   */
  async downloadAudioFile(fileUrl, token) {
    const axios = require('axios');
    const filePath = path.join(this.tempDir, `audio_${Date.now()}.ogg`);

    const url = `https://api.telegram.org/file/bot${token}/${fileUrl}`;

    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('❌ Error descargando archivo de audio:', error);
      throw error;
    }
  }

  /**
   * Transcribe un mensaje de voz de Telegram
   * @param {Object} bot - Instancia del bot de Telegram
   * @param {Object} msg - Mensaje de Telegram con audio/voice
   * @returns {Promise<string>} - Texto transcrito
   */
  async transcribeVoiceMessage(bot, msg) {
    let audioFilePath = null;
    let convertedFilePath = null;

    try {
      // Obtener información del archivo de voz
      const voice = msg.voice;
      if (!voice) {
        throw new Error('No se encontró mensaje de voz');
      }

      console.log('🎤 Procesando mensaje de voz...');

      // Obtener el archivo
      const fileId = voice.file_id;
      const file = await bot.getFile(fileId);

      // Descargar el archivo
      audioFilePath = await this.downloadAudioFile(file.file_path, bot.token);
      console.log('✅ Archivo de audio descargado');

      // Convertir el audio a formato compatible
      convertedFilePath = await this.convertAudio(audioFilePath);

      // Transcribir según la configuración
      let transcription;
      if (this.useLocalWhisper) {
        transcription = await this.transcribeWithLocalWhisper(convertedFilePath);
      } else {
        transcription = await this.transcribeWithAPI(convertedFilePath);
      }

      // Limpiar archivos temporales
      this.cleanupFiles([audioFilePath, convertedFilePath]);

      return transcription;
    } catch (error) {
      // Limpiar archivos en caso de error
      if (audioFilePath || convertedFilePath) {
        this.cleanupFiles([audioFilePath, convertedFilePath]);
      }
      throw error;
    }
  }

  /**
   * Limpia archivos temporales
   * @param {string[]} files - Array de rutas de archivos a eliminar
   */
  cleanupFiles(files) {
    files.forEach(file => {
      if (file && fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
          console.log('🗑️ Archivo temporal eliminado:', path.basename(file));
        } catch (error) {
          console.error('⚠️ No se pudo eliminar archivo temporal:', error);
        }
      }
    });
  }

  /**
   * Limpia todos los archivos temporales antiguos (más de 1 hora)
   */
  cleanupOldFiles() {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      files.forEach(file => {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > oneHour) {
          fs.unlinkSync(filePath);
          console.log('🗑️ Archivo antiguo eliminado:', file);
        }
      });
    } catch (error) {
      console.error('⚠️ Error limpiando archivos antiguos:', error);
    }
  }
}

// Crear instancia única del servicio
const whisperService = new WhisperService();

// Limpiar archivos antiguos cada hora
setInterval(() => {
  whisperService.cleanupOldFiles();
}, 60 * 60 * 1000);

module.exports = whisperService;
