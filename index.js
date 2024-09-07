import express from "express";
import cors from "cors";
import helmet from "helmet";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, setDoc, doc } from "firebase/firestore";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAdcbf95GpxBm8Rk7xKimQC2s7AGYVe2zM",
  authDomain: "controlpagos-1262b.firebaseapp.com",
  projectId: "controlpagos-1262b",
  storageBucket: "controlpagos-1262b.appspot.com",
  messagingSenderId: "597726256006",
  appId: "1:597726256006:web:cb64cd556582570a0cea07",
  measurementId: "G-YX0WDW589J"
};

// Initialize Firebase
const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase);

// Configuración de Mercado Pago
const MERCADO_PAGO_ACCESS_TOKEN =
  "APP_USR-3542896227263654-090506-83b3e170d98a18c129d2045e6214045c-1978616648";
const SUCCESS_URL = "https://www.codex.pe/success";
const FAILURE_URL = "https://www.codex.pe/failure";
const PENDING_URL = "https://www.codex.pe/pending";

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

// Ruta de prueba
app.get("/", (req, res) => res.send("Servidor on-line"));


app.post("/webhook", async (req, res) => {
  console.log("Cuerpo del webhook recibido:", req.body);

  try {
    const email = req.query.email; 
    const idCompra = req.body.data?.id; 

    if (!email || !idCompra) {
      console.log("Correo electrónico o ID de compra no proporcionado.");
      return res.status(400).json({ error: "Faltan parámetros en la solicitud." });
    }

    console.log("Correo electrónico recibido:", email);
    console.log("ID de compra recibido:", idCompra);

    const usersCollection = collection(db, "pagosApp");
    const q = query(usersCollection, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docId = querySnapshot.docs[0].id;
      await setDoc(doc(db, "pagosApp", docId), { idcompra: idCompra }, { merge: true });
      console.log("Usuario existente, actualizando idcompra.");
    } else {
      const newDocRef = doc(usersCollection);
      await setDoc(newDocRef, { email, idcompra: [idCompra] });
      console.log("Nuevo usuario creado con email e idcompra.");
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error al procesar el webhook:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});



// Endpoint para consultar el estado del pago y obtener detalles desde Mercado Pago
app.get("/payment_status/:userId", async (req, res) => {
  const userId = req.params.userId;

  // Verificar si existe un paymentId asociado al userId
  if (userId) {
    try {
      // Realizar la solicitud a la API de Mercado Pago utilizando fetch
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,  // Asegúrate de incluir "Bearer "
          'Content-Type': 'application/json'
        }
      });

      const paymentDetails = await response.json();

      if (response.ok) {
        // Si la respuesta es exitosa, devolver los detalles del pago
        res.json({ 
          compraID: userId,
          paymentDetails
        });
      } else {
        // Si hubo un error en la solicitud, devolver el código de error y los detalles
        res.status(response.status).json({
          error: "Error al obtener detalles del pago desde Mercado Pago.",
          details: paymentDetails
        });
      }
    } catch (error) {
      // Manejo de errores de la solicitud
      console.error(`Error en la solicitud a Mercado Pago: ${error.message}`);
      res.status(500).json({ error: "Error al obtener detalles del pago." });
    }
  } else {
    // Si no hay registro de un pago todavía
    res.status(404).json({ error: "No se ha recibido ningún pago para este usuario." });
  }
});




// Ruta para crear preferencias de pago
app.post("/create_preferences", async (req, res) => {
  const { opc, paymentId } = req.body;

  // Validación básica de entrada
  if (!paymentId || ![1, 2, 3, 4].includes(opc)) {
    return res
      .status(400)
      .json({ error: "Opción inválida o ID de pago no proporcionado." });
  }

  // Determinar el título y precio basado en la opción
  const plans = {
    1: { title: "Plan Basico", price: 25 },
    2: { title: "Plan Medium", price: 30 },
    3: { title: "Plan Premium", price: 50 },
    4: { title: "Plan Gold", price: 60 },
  };

  const { title, price } = plans[opc];

  try {
    const body = {
      items: [
        {
          title,
          quantity: 1,
          unit_price: price,
          currency_id: "PEN",
        },
      ],
      back_urls: {
        success: SUCCESS_URL,
        failure: FAILURE_URL,
        pending: PENDING_URL,
      },
      payer: {
        email: paymentId, // Aquí debes pasar el correo del cliente
      },
      metadata: {
        userId: paymentId, // Enviando el userId como parte de la metadata
      },
      notification_url: `https://mercadopage.onrender.com/webhook?email=${paymentId}`, // Incluimos el correo en la URL // URL de tu webhook
      auto_return: "approved",
    };

    const preferences = new Preference(client);
    const result = await preferences.create({ body });
    res.json({ url: result.init_point});
  } catch (error) {
    console.error("Error al crear la preferencia:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

app.listen(port, () => console.log(`Escuchando en el puerto XDD${port}`));
