import express from "express";
import cors from "cors";
import helmet from "helmet";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getFirestore, collection, doc, setDoc, getDocs, query, where, arrayUnion } from "firebase/firestore";


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
  "APP_USR-4800771767205670-100318-b5830cdbf2f841d503721e9f92fa2e38-1609795587";
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
    const paymentMethod = req.body.data?.payment_method; // Método de pago
    const title = req.query.plan; // Título del producto
    const date = req.body.date_created; // Fecha proporcionada en el cuerpo de la solicitud

    if (!email || !idCompra) {
      console.log("Correo electrónico o ID de compra no proporcionado.");
      return res.status(400).json({ error: "Faltan parámetros en la solicitud." });
    }

    if (!date) {
      console.log("Fecha no proporcionada en el cuerpo de la solicitud.");
      return res.status(400).json({ error: "Fecha no proporcionada en el cuerpo de la solicitud." });
    }

    console.log("Correo electrónico recibido:", email);
    console.log("ID de compra recibido:", idCompra);
    console.log("Fecha recibida:", date);

    const usersCollection = collection(db, "pagosApp");
    const q = query(usersCollection, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    // Datos de la compra
    const compraData = {
      fecha: date,
      id: idCompra,
      metodo_pago: paymentMethod || "PagoEfectivo",
      titulo: title || "sin título",
    };

    if (!querySnapshot.empty) {
      // Usuario existente, actualizar el array de compras
      const docId = querySnapshot.docs[0].id;
      const userDocRef = doc(db, "pagosApp", docId);

      await setDoc(userDocRef, {
        compras: arrayUnion(compraData)
      }, { merge: true });

      console.log("Usuario existente, actualizando array de compras.");
    } else {
      // Nuevo usuario, crear un nuevo documento con email y un array de compras
      const newDocRef = doc(usersCollection);
      await setDoc(newDocRef, {
        email,
        compras: [compraData],
      });

      console.log("Nuevo usuario creado con email y array de compras.");
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
      payment_methods: {
        excluded_payment_methods: [
          { id: "yape" }, // Esto es un ejemplo, verifica el ID correcto para Yape si está disponible
        ],
        excluded_payment_types: [
          { id: "credit_card" }, // Excluir tarjetas de crédito
          { id: "debit_card" }, // Excluir pagos en cajeros automáticos
          { id: "ticket" } // Excluir pagos por ticket
        ],
      },
      payer: {
        email: paymentId, // Aquí debes pasar el correo del cliente
      },
      metadata: {
        userId: paymentId, // Enviando el userId como parte de la metadata
      },
      notification_url: `https://mercadopage.onrender.com/webhook?email=${paymentId}&plan=${title}`, // Incluimos el correo en la URL // URL de tu webhook
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
