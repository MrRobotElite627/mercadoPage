import express from "express";
import cors from "cors";
import { MercadoPagoConfig } from "mercadopago";

// Configura Mercado Pago
const mp = new MercadoPagoConfig( {accessToken:"APP_USR-6765012349094062-090501-685a54177b5262c4e2429e520d2cc7c5-1978616648",});

const app = express();
const port = process.env.PORT || 3000; // Puerto proporcionado por el entorno

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Servidor en línea");
});

app.listen(port, () => {
  console.log(`Escuchando en el puerto ${port}`);
});

app.post("/create_subscription", async (req, res) => {
  const { opc, user } = req.body;

  let titulo = "";
  let precio = 0;

  switch (opc) {
    case 1:
      titulo = "Plan Básico";
      precio = 25;
      break;
    case 2:
      titulo = "Plan Medium";
      precio = 30;
      break;
    case 3:
      titulo = "Plan Premium";
      precio = 50;
      break;
    case 4:
      titulo = "Plan Gold";
      precio = 60;
      break;
    default:
      return res.status(400).json({ error: "Opción de plan inválida" });
  }

  try {
    const subscriptionData = {
      reason: titulo,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: precio,
        currency_id: "PEN", // Asegúrate de usar el código de moneda correcto
        start_date: new Date().toISOString(),
        end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
      },
      back_urls: {
        success: "https://www.techS.com/success",
        failure: "https://www.techS.com/failure",
        pending: "https://www.techS.com/pending",
      },
      auto_return: "approved",
    //  external_reference: user, // Puedes usar esto para identificar al usuario
    };

    const subscription = await mp.preapproval.create(subscriptionData);

    res.json({
      url: subscription.response.init_point,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al crear la suscripción", details: error.message });
  }
});
