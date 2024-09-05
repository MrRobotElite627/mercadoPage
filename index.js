import express from "express";
import cors from "cors";

// SDK de Mercado Pago
import { MercadoPagoConfig, Preference } from "mercadopago";
// Agrega credenciales
const client = new MercadoPagoConfig({
  accessToken:
    "APP_USR-6765012349094062-090501-685a54177b5262c4e2429e520d2cc7c5-1978616648",
});

const app = express();
const port = process.env.PORT || 3000; // Usar el puerto proporcionado por Render

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Servidor on-line");
});

app.listen(port, () => {
  console.log(`Escuchando el puerto ${port}`);
});

app.post("create_preferences", async (req, res) => {
  const titulo = "";
  const presio = 0;
  const user = req.body.user;
  if (req.body.opc == 1) {
    titulo = "Plan Basico";
    presio = 25;
  } else if (req.body.opc == 2) {
    titulo = "Plan Medium";
    presio = 30;
  } else if (req.body.opc == 3) {
    titulo = "Plan Premium";
    presio = 50;
  } else if (req.body.opc == 4) {
    titulo = "Plan Gold";
    presio = 60;
  }
  try {
    const body = {
      items: [
        {
          id: user,
          title: titulo,
          quantity: 1,
          unit_price: presio,
          currency_id: "PE",
        },
      ],
      back_url: {
        success: "https://www.papayasconcrema.cl/success",
        failure: "https://www.papayasconcrema.cl/failure",
        pending: "https://www.papayasconcrema.cl/pending",
      },
      auto_return: "approved",
    };
    const preferences = new Preference(client);
    const result = await preferences.create({ body });
    console.log(result.sandbox_init_point);
    res.json({
      url: result.sandbox_init_point,
    });
  } catch (error) {
    console.log(error);
  }
});
