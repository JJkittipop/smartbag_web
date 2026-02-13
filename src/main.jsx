// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; 

// ==========================================
// 1. Config Firebase
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyB0-_1YZihd8lpjsNMEaP8Jg-FAkcfMF8I",
    authDomain: "smartbagproject-10842.firebaseapp.com",
    databaseURL: "https://smartbagproject-10842-default-rtdb.firebaseio.com",
    projectId: "smartbagproject-10842",
    storageBucket: "smartbagproject-10842.firebasestorage.app",
    messagingSenderId: "474095438323",
    appId: "1:474095438323:web:9660e4728e759ebb0aaa86",
    measurementId: "G-CTBGP61Q68"
};

// --- 2. Initialize และ Export ตัวแปร db ออกไป ---
let firebaseApp, database;

try {
    firebaseApp = initializeApp(firebaseConfig);
    database = getDatabase(firebaseApp);
    console.log("Firebase initialized successfully.");
} catch (error) {
    console.error("Firebase Initialization Failed:", error);
}

export const app = firebaseApp;
export const db = database; 
// ----------------------------------------------------

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);