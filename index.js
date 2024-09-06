import express from "express";
import cors from "cors";

// SDK de Mercado Pago
import { MercadoPagoConfig, Preference } from "mercadopago";
// Agrega credenciales
const client = new MercadoPagoConfig({
  accessToken:
    "APP_USR-3542896227263654-090506-83b3e170d98a18c129d2045e6214045c-1978616648",
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

app.post("/create_preferences", async (req, res) => {
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
        success: "https://www.codexapps.pe/success",
        failure: "https://www.codexapps.pe/failure",
        pending: "https://www.codexapps.pe/pending",
      },
      auto_return: "approved",
    };
    const preferences = new Preference(client);
    const result = await preferences.create({ body });
    console.log(result.init_point);
    res.json({
      url: result.init_point,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
  
});
