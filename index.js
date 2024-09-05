import express from "express";
import cors from "cors";
import mercadopago from "mercadopago";

// Agrega credenciales de Mercado Pago
mercadopago.configure({
  access_token: "APP_USR-3542896227263654-090506-83b3e170d98a18c129d2045e6214045c-1978616648",
});

const app = express();
const port = process.env.PORT || 3000; // Usar el puerto proporcionado por el entorno

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Servidor on-line");
});

app.listen(port, () => {
  console.log(`Escuchando en el puerto ${port}`);
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
    // Crear un plan de suscripción
    const subscription = await mercadopago.subscriptions.create({
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
    });

    res.json({
      url: subscription.init_point,
    });
  } catch (error) {
    console.error("Error creando la suscripción:", error);
    res.status(500).json({ error: "Error al crear la suscripción" });
  }
});
