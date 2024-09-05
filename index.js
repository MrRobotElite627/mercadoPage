import express from "express";
import cors from "cors";
import mercadopago from "mercadopago";

// Configura Mercado Pago
mercadopago({
  accessToken:
    "APP_USR-6765012349094062-090501-685a54177b5262c4e2429e520d2cc7c5-1978616648",
});

const app = express();
const port = process.env.PORT || 3000; // Puerto proporcionado por el entorno

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Servidor en línea");
});

app.post("/create_preferences", async (req, res) => {
  const { opc, user } = req.body;

  const plans = {
    1: { title: "Plan Básico", price: 25 },
    2: { title: "Plan Medium", price: 30 },
    3: { title: "Plan Premium", price: 50 },
    4: { title: "Plan Gold", price: 60 },
  };

  const selectedPlan = plans[opc];

  if (!selectedPlan) {
    return res.status(400).json({ error: "Opción de plan inválida" });
  }

  try {
    const subscriptionData = {
      reason: selectedPlan.title,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: selectedPlan.price,
        currency_id: "PEN",
        start_date: new Date().toISOString(),
        end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
      },
      back_urls: {
        success: "https://www.techS.com/success",
        failure: "https://www.techS.com/failure",
        pending: "https://www.techS.com/pending",
      },
      auto_return: "approved",
     // external_reference: user, // Puedes usar esto para identificar al usuario
    };

    const subscription = await mercadopago.preapproval.create(subscriptionData);

    res.json({
      url: subscription.response.init_point,
    });
  } catch (error) {
    console.error("Error al crear la suscripción:", error);
    res.status(500).json({ error: "Error al crear la suscripción" });
  }
});


app.listen(port, () => {
  console.log(`Escuchando en el puerto ${port}`);
});
