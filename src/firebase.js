import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';

// PASTE YOUR FIREBASE CONFIG HERE
const firebaseConfig = {
  apiKey: "AIzaSyDkLRAx-wGI2jSXcfNKYSp9ND1tqxy0e7M",
  authDomain: "restaurantmanager-e1319.firebaseapp.com",
  projectId: "restaurantmanager-e1319",
  storageBucket: "restaurantmanager-e1319.appspot.com",
  messagingSenderId: "678905269428",
  appId: "1:678905269428:web:d6e3bc7d923ba4c65cdbe1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable persistent login (remembers user even after closing browser)
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error('Persistence error:', error);
  });

// ===== AUTH FUNCTIONS =====

// Sign Up (Create New Account)
export const signUpManager = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign In (Login)
export const signInManager = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign Out
export const signOutManager = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

// Listen for Auth State Changes (auto-login if session exists)
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

// Get Current User
export const getCurrentUser = () => {
  return auth.currentUser;
};

// ===== FIRESTORE FUNCTIONS =====

// Add Reservation
export const addReservation = async (data) => {
  try {
    const docRef = await addDoc(collection(db, 'reservations'), {
      ...data,
      created_at: new Date(),
      status: 'pending'
    });
    return docRef.id;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Get All Reservations for Today
export const getReservationsForToday = async (restaurantName) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const q = query(
    collection(db, 'reservations'),
    where('restaurant_name', '==', restaurantName),
    where('date', '>=', today),
    where('date', '<', tomorrow)
  );

  const querySnapshot = await getDocs(q);
  const reservations = [];
  querySnapshot.forEach((doc) => {
    reservations.push({ id: doc.id, ...doc.data() });
  });
  return reservations;
};

// Get Client by Phone
export const getClientByPhone = async (phone) => {
  const q = query(collection(db, 'clients'), where('phone', '==', phone));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
  }
  return null;
};

// Add Client
export const addClient = async (data) => {
  try {
    const docRef = await addDoc(collection(db, 'clients'), {
      ...data,
      total_visits: 1,
      created_at: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Update Client Visits
export const updateClientVisits = async (clientId, newVisitCount) => {
  try {
    await updateDoc(doc(db, 'clients', clientId), {
      total_visits: newVisitCount,
      last_visit_date: new Date()
    });
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Update Reservation Status
export const updateReservationStatus = async (reservationId, newStatus) => {
  try {
    await updateDoc(doc(db, 'reservations', reservationId), {
      status: newStatus
    });
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Delete Reservation
export const deleteReservation = async (reservationId) => {
  try {
    await deleteDoc(doc(db, 'reservations', reservationId));
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Real-time Listener for Reservations
export const subscribeToReservations = (restaurantName, callback) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const q = query(
    collection(db, 'reservations'),
    where('restaurant_name', '==', restaurantName),
    where('date', '>=', today),
    where('date', '<', tomorrow)
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const reservations = [];
    querySnapshot.forEach((doc) => {
      reservations.push({ id: doc.id, ...doc.data() });
    });
    // Sort by time
    reservations.sort((a, b) => a.time.localeCompare(b.time));
    callback(reservations);
  });

  return unsubscribe;
};
