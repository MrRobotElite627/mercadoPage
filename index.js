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

// Almacenamiento en memoria para los estados de pago
const paymentStatusStore = {};

// Ruta de prueba
app.get('/', (req, res) => res.send('Servidor on-line'));

app.post('/webhook', async (req, res) => {
  console.log('Cuerpo de la solicitud recibido:', req.body);

  const paymentId = req.body.data?.id;
  console.log('PaymentId:', paymentId);

  if (!paymentId) {
    console.error('ID de pago no encontrado en el cuerpo de la solicitud');
    return res.sendStatus(400); // Solicitud incorrecta
  }

  try {
    // Obtener detalles del pago usando la API de Mercado Pago
    const paymentDetails = await fetch(`https://api.mercadolibre.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      },
    });
    const payment = await paymentDetails.json();

    if (payment.status === 'approved') {
      paymentStatusStore[paymentId] = 'approved';
      console.log(`Pago ${paymentId} aprobado`);
    } else if (payment.status === 'pending') {
      paymentStatusStore[paymentId] = 'pending';
      console.log(`Pago ${paymentId} está pendiente`);
    } else {
      paymentStatusStore[paymentId] = 'failure';
      console.log(`Pago ${paymentId} fallido`);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error en el webhook:', error);
    res.sendStatus(500);
  }
});

app.get('/check_payment_status/:paymentId', (req, res) => {
  const { paymentId } = req.params;
  const status = paymentStatusStore[paymentId] || 'unknown'; // 'unknown' si no se encuentra el estado

  res.json({ status });
});

// Ruta para crear preferencias de pago
app.post('/create_preferences', async (req, res) => {
  const { opc, paymentId } = req.body;

  // Validación básica de entrada
  if (!paymentId || ![1, 2, 3, 4].includes(opc)) {
    return res.status(400).json({ error: 'Opción inválida o ID de pago no proporcionado.' });
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
          id: paymentId,
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
      notification_url: 'https://mercadopage.onrender.com/webhook',  // URL de tu webhook
      auto_return: 'approved',
    };

    const preferences = new Preference(client);
    const result = await preferences.create({ body });
    console.log(result.id);
    res.json({ url: result.init_point, preferenceId: result.id });
  } catch (error) {
    console.error('Error al crear la preferencia:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

app.listen(port, () => console.log(`Escuchando en el puerto XDD${port}`));
