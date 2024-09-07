import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
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

app.post('/webhook', async (req, res) => {
  const paymentId = req.body.data.id;

  try {
    // Obtener detalles del pago
    const payment = await Payment.findById(paymentId);

    if (payment.status === 'approved') {
      // Actualizar el estado del usuario en la base de datos o sistema
      console.log(`Pago ${paymentId} aprobado para el usuario ${payment.payer.email}`);

      // Aquí puedes otorgar privilegios al usuario
      // Ejemplo: updateUserAccess(user.id, "Plan Premium");

    } else if (payment.status === 'pending') {
      console.log(`Pago ${paymentId} está pendiente`);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error en el webhook:', error);
    res.sendStatus(500);
  }
});

app.get('/check_payment_status/:user', async (req, res) => {
  const { user } = req.params;
  
  try {
    // Obtener el último pago del usuario (basado en tu lógica)
    const payment = await findLastPaymentForUser(user);

    if (payment.status === 'approved') {
      res.json({ status: 'approved' });
    } else if (payment.status === 'pending') {
      res.json({ status: 'pending' });
    } else {
      res.json({ status: 'failure' });
    }
  } catch (error) {
    console.error('Error al verificar el estado del pago:', error);
    res.status(500).json({ status: 'failure' });
  }
});


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
      payment_methods: {
        excluded_payment_types: [
          { id: 'ticket' } // Excluir pagos por ticket si es necesario
        ],
        excluded_payment_methods: [
          { id: 'yape' } // Excluir Yape
        ]
      },
      notification_url: 'https://mercadopage.onrender.com/webhook',  // URL de tu webhook
      auto_return: 'approved',
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
