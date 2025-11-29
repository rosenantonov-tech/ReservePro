import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';

// Your Firebase Config
const firebaseConfig = {
  apiKey: 'AIzaSyDkLRAx-wGI2jSXcfNKYSp9ND1tqxy0e7M',
  authDomain: 'restaurantmanager-e1319.firebaseapp.com',
  projectId: 'restaurantmanager-e1319',
  storageBucket: 'restaurantmanager-e1319.appspot.com',
  messagingSenderId: '678905269428',
  appId: '1:678905269428:web:d6e3bc7d923ba4c65cdbe1',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable persistent login
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Persistence error:', error);
});

// ===== AUTH FUNCTIONS =====

export const signUpManager = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const signInManager = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const signOutManager = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

// ===== FIRESTORE FUNCTIONS =====

export const addReservation = async (data) => {
  try {
    // Use provided restaurant_name or default placeholder
    const restaurantName = data.restaurant_name?.trim() || 'Default Restaurant';

    const docRef = await addDoc(collection(db, 'reservations'), {
      ...data,
      restaurant_name: restaurantName,
      created_at: new Date(),
      status: 'pending',
    });
    console.log('Reservation added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding reservation:', error);
    throw error;
  }
};

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

export const getClientByPhone = async (phone) => {
  const q = query(collection(db, 'clients'), where('phone', '==', phone));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
  }
  return null;
};

export const addClient = async (data) => {
  try {
    const docRef = await addDoc(collection(db, 'clients'), {
      ...data,
      total_visits: 1,
      created_at: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding client:', error);
    throw error;
  }
};

export const updateClientVisits = async (clientId, newVisitCount) => {
  try {
    await updateDoc(doc(db, 'clients', clientId), {
      total_visits: newVisitCount,
      last_visit_date: new Date(),
    });
  } catch (error) {
    console.error('Error updating client visits:', error);
    throw error;
  }
};

export const updateReservationStatus = async (reservationId, newStatus) => {
  try {
    await updateDoc(doc(db, 'reservations', reservationId), {
      status: newStatus,
    });
  } catch (error) {
    console.error('Error updating reservation status:', error);
    throw error;
  }
};

export const deleteReservation = async (reservationId) => {
  try {
    await deleteDoc(doc(db, 'reservations', reservationId));
  } catch (error) {
    console.error('Error deleting reservation:', error);
    throw error;
  }
};

// Get ALL reservations for a restaurant (no date filter - gets all)
export const subscribeToReservations = (restaurantName, callback) => {
  // Use default restaurant if empty
  const effectiveRestaurantName = restaurantName?.trim() || 'Default Restaurant';

  const q = query(
    collection(db, 'reservations'),
    where('restaurant_name', '==', effectiveRestaurantName)
  );

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const reservations = [];
      querySnapshot.forEach((doc) => {
        reservations.push({ id: doc.id, ...doc.data() });
      });

      // Sort by date DESC, then by time
      reservations.sort((a, b) => {
        const dateCompare = (b.date || '').localeCompare(a.date || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.time || '').localeCompare(b.time || '');
      });

      console.log(`Loaded ${reservations.length} reservations for ${effectiveRestaurantName}`);
      callback(reservations);
    },
    (error) => {
      console.error('Error in subscribeToReservations:', error);
      callback([]);
    }
  );

  return unsubscribe;
};

export const getAllReservations = async (restaurantName) => {
  try {
    const effectiveRestaurantName = restaurantName?.trim() || 'Default Restaurant';
    
    const q = query(
      collection(db, 'reservations'),
      where('restaurant_name', '==', effectiveRestaurantName)
    );
    const querySnapshot = await getDocs(q);
    const reservations = [];
    querySnapshot.forEach((doc) => {
      reservations.push({ id: doc.id, ...doc.data() });
    });
    return reservations;
  } catch (error) {
    console.error('Error getting all reservations:', error);
    throw error;
  }
}
