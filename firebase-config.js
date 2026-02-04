const firebaseConfig = {
  apiKey: "AQUI_TU_API_KEY",
  authDomain: "AQUI_TU_AUTH_DOMAIN",
  projectId: "los-santos-turnos",
  storageBucket: "AQUI_TU_STORAGE_BUCKET",
  messagingSenderId: "AQUI_TU_SENDER_ID",
  appId: "AQUI_TU_APP_ID"
};

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();