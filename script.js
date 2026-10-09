
"use strict";

// =====================================
// MODE DASHBOARD
// =====================================

const modeSelect = document.getElementById("modeSelect");
const petunjukMode = document.getElementById("petunjukMode");
const statusElement = document.getElementById("status");

const suhuElement = document.getElementById("suhu");
const kelembapanElement = document.getElementById("kelembapan");
const tanggalElement = document.getElementById("tanggal");
const waktuElement = document.getElementById("waktu");
const dataTerakhirElement = document.getElementById("dataTerakhir");

let mode = "simulasi";

// =====================================
// RTC / WAKTU KOMPUTER
// =====================================

function updateRTC() {
    const sekarang = new Date();

    tanggalElement.textContent =
        sekarang.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });

    waktuElement.textContent =
        sekarang.toLocaleTimeString("id-ID");
}

updateRTC();
setInterval(updateRTC, 1000);

// =====================================
// DATA SIMULASI
// =====================================

let suhu = 30.10;
let kelembapan = 74.30;

// =====================================
// GRAFIK
// =====================================

const labels = [];
const dataSuhu = [];
const dataKelembapan = [];

const chartSuhu = new Chart(
    document.getElementById("grafikSuhu"),
    {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Suhu (°C)",
                data: dataSuhu,
                borderColor: "#0284c7",
                backgroundColor: "rgba(2, 132, 199, 0.12)",
                borderWidth: 2,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            animation: false
        }
    }
);

const chartKelembapan = new Chart(
    document.getElementById("grafikKelembapan"),
    {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Kelembapan (%)",
                data: dataKelembapan,
                borderColor: "#16a34a",
                backgroundColor: "rgba(22, 163, 74, 0.12)",
                borderWidth: 2,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                y: {
                    min: 0,
                    max: 100
                }
            }
        }
    }
);

// =====================================
// TAMBAH DATA KE GRAFIK
// =====================================

function tambahDataGrafik(nilaiSuhu, nilaiKelembapan, waktuData) {
    labels.push(waktuData);
    dataSuhu.push(nilaiSuhu);
    dataKelembapan.push(nilaiKelembapan);

    // Maksimal 20 titik data
    if (labels.length > 20) {
        labels.shift();
        dataSuhu.shift();
        dataKelembapan.shift();
    }

    chartSuhu.update();
    chartKelembapan.update();
}

// =====================================
// MODE SIMULASI
// =====================================

function updateSensorSimulasi() {
    if (mode !== "simulasi") return;

    suhu += (Math.random() - 0.5) * 0.3;
    kelembapan += (Math.random() - 0.5) * 0.8;

    suhu = Math.max(15, Math.min(45, suhu));
    kelembapan = Math.max(20, Math.min(95, kelembapan));

    suhu = Number(suhu.toFixed(2));
    kelembapan = Number(kelembapan.toFixed(2));

    const sekarang = new Date();
    const waktuData = sekarang.toLocaleTimeString("id-ID");

    suhuElement.textContent = suhu.toFixed(2);
    kelembapanElement.textContent = kelembapan.toFixed(2);

    tambahDataGrafik(suhu, kelembapan, waktuData);

    dataTerakhirElement.textContent = waktuData;
    statusElement.textContent = "SIMULASI";
    petunjukMode.textContent =
        "Data simulasi aktif, bukan data sensor asli.";
}

// Simulasi diperbarui setiap 3 detik
setInterval(updateSensorSimulasi, 3000);
updateSensorSimulasi();

// =====================================
// KONFIGURASI FIREBASE
// =====================================

const firebaseConfig = {
    apiKey: "AIzaSyAMzpQ4b1SvsT2WiTm3GBP1cvrhzhpeMos",
    authDomain: "dashboard-suhu-esp32.firebaseapp.com",
    databaseURL: "https://dashboard-suhu-esp32-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dashboard-suhu-esp32",
    appId: "1:139582516349:web:6be07423779ed10bc59514"
};

let sensorRef = null;
let sensorListener = null;

// =====================================
// KOSONGKAN DATA MODE NYATA
// =====================================

function kosongkanDataNyata() {
    suhuElement.textContent = "--";
    kelembapanElement.textContent = "--";
    dataTerakhirElement.textContent = "--";

    labels.length = 0;
    dataSuhu.length = 0;
    dataKelembapan.length = 0;

    chartSuhu.update();
    chartKelembapan.update();
}

// =====================================
// HENTIKAN LISTENER FIREBASE
// =====================================

function hentikanFirebase() {
    if (sensorRef && sensorListener) {
        sensorRef.off("value", sensorListener);
    }

    sensorRef = null;
    sensorListener = null;
}

// =====================================
// MODE PERANGKAT NYATA
// =====================================

function mulaiModeNyata() {
    hentikanFirebase();
    kosongkanDataNyata();

    statusElement.textContent = "MENGHUBUNGKAN";
    petunjukMode.textContent =
        "Sedang menghubungkan ke Firebase...";

    // Periksa apakah Firebase SDK tersedia
    if (typeof firebase === "undefined") {
        statusElement.textContent = "LIBRARY ERROR";
        petunjukMode.textContent =
            "Firebase SDK belum dimuat. Periksa script Firebase di index.html.";
        return;
    }

    try {
        // Inisialisasi Firebase satu kali
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        // Hubungkan ke Realtime Database
        const database = firebase.database();

        // ESP32 nantinya mengirim data ke lokasi /sensor
        sensorRef = database.ref("sensor");

        sensorListener = function(snapshot) {
            if (mode !== "nyata") return;

            const data = snapshot.val();

            if (
                !data ||
                typeof data.suhu !== "number" ||
                typeof data.kelembapan !== "number"
            ) {
                statusElement.textContent = "DATA BELUM ADA";
                petunjukMode.textContent =
                    "Belum ada data valid di /sensor. Menunggu data ESP32.";
                return;
            }

            const nilaiSuhu = data.suhu;
            const nilaiKelembapan = data.kelembapan;

            suhuElement.textContent = nilaiSuhu.toFixed(2);
            kelembapanElement.textContent =
                nilaiKelembapan.toFixed(2);

            const waktuData = data.waktu
                ? String(data.waktu)
                : new Date().toLocaleTimeString("id-ID");

            tambahDataGrafik(
                nilaiSuhu,
                nilaiKelembapan,
                waktuData
            );

            dataTerakhirElement.textContent = waktuData;
            statusElement.textContent = "DATA DITERIMA";
            petunjukMode.textContent =
                "Data diterima dari Firebase Realtime Database.";
        };

        sensorRef.on(
            "value",
            sensorListener,
            function(error) {
                statusElement.textContent = "KONEKSI GAGAL";
                petunjukMode.textContent =
                    "Firebase gagal diakses: " + error.message;
            }
        );

    } catch (error) {
        statusElement.textContent = "KONEKSI GAGAL";
        petunjukMode.textContent =
            "Gagal memulai Firebase: " + error.message;
    }
}

// =====================================
// PILIH MODE DASHBOARD
// =====================================

modeSelect.addEventListener("change", function() {
    mode = modeSelect.value;

    if (mode === "simulasi") {
        hentikanFirebase();

        statusElement.textContent = "SIMULASI";
        petunjukMode.textContent =
            "Data simulasi aktif, bukan data sensor asli.";

        updateSensorSimulasi();
    } else {
        mulaiModeNyata();
    }
});
