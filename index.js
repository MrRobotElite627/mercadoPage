import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Configuración de Mercado Pago
const MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-3542896227263654-090506-83b3e170d98a18c129d2045e6214045c-1978616648';
const SUCCESS_URL = 'https://www.codex.pe/success';
const FAILURE_URL = 'https://www.codex.pe/failure';
const PENDING_URL = 'https://www.codex.pe/pending';

// Inicializar Mercado Pago con las credenciales
const client = new MercadoPagoConfig({
  accessToken: MERCADO_PAGO_ACCESS_TOKEN,
});

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(helmet()); // Seguridad adicional para cabeceras HTTP
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => res.send('Servidor on-line'));

// Ruta para crear preferencias de pago
app.post('/create_preferences', async (req, res) => {
  const { opc, user } = req.body;

  // Validación básica de entrada
  if (!user || ![1, 2, 3, 4].includes(opc)) {
    return res.status(400).json({ error: 'Opción inválida o usuario no proporcionado.' });
  }

  // Determinar el título y precio basado en la opción
  const plans = {
    1: { title: 'Plan Basico', price: 25 },
    2: { title: 'Plan Medium', price: 30 },
    3: { title: 'Plan Premium', price: 50 },
    4: { title: 'Plan Gold', price: 60 }
  };

  const { title, price } = plans[opc];

  try {
    const body = {
      items: [
        {
          id: user,
          title,
          quantity: 1,
          unit_price: price,
          currency_id: 'PE',
        },
      ],
      back_urls: {
        success: SUCCESS_URL,
        failure: FAILURE_URL,
        pending: PENDING_URL,
      },
      auto_return: 'approved',
      payment_methods: {
        excluded_payment_types: [
          { id: 'ticket' } // Excluir pagos por ticket si es necesario
        ],
        excluded_payment_methods: [
          { id: 'yape' } // Excluir Yape
        ]
      }
    };

    const preferences = new Preference(client);
    const result = await preferences.create({ body });
    
    res.json({ url: result.init_point });
  } catch (error) {
    console.error('Error al crear la preferencia:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

app.listen(port, () => console.log(`Escuchando en el puerto ${port}`));
